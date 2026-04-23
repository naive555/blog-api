# Design Decisions

## BlogImage as a Separate Entity

`BlogImage` is modelled as its own database table rather than embedding image URLs inside the `blog` row (e.g., as a JSON array or comma-separated string).

**Why:**

- A blog has two semantically distinct image concepts: a single cover image and up to six additional images. These have different display rules and different constraints. Encoding them inside the `blog` row would require the application layer to parse and validate structure that is more naturally expressed as rows with a boolean `is_cover` discriminator.
- Each image has its own lifecycle: it can be added, updated, and deleted independently without touching the blog record. Row-level operations are cheaper and safer than deserialising, mutating, and re-serialising an embedded collection.
- The maximum image count (one cover + six additional) is enforced with a simple `COUNT` query at insert time. The same constraint would require custom JSON validation logic if images were stored inline.
- This layout is straightforward to extend - for example, adding metadata columns like `alt_text`, `width`, or `display_order` requires only a column migration, not a schema redesign.

**Trade-off:**

Querying a blog with its images requires a join or an additional query. For simple read operations this adds minor overhead, but it is negligible relative to the clarity and flexibility gained.

---

## Image Storage by URL, Not File Upload

The API stores image URLs rather than accepting binary file uploads.

**Why:**

- Accepting binary uploads requires the server to handle multipart form data, validate MIME types, enforce file size limits, store the file somewhere (disk or object storage), and clean up orphaned files when images are deleted. This is significant additional complexity.
- For an assignment and early-stage product, externalising file storage entirely (images are hosted by any existing service or CDN the user controls) keeps the API focused on structured data management.
- The URL approach is compatible with the most common production pattern anyway: clients upload files directly to an object storage service (S3, R2, Cloudflare Images) and then POST the resulting URL to the API. The API stores the reference, not the bytes.
- `@IsUrl()` validation ensures that submitted values are syntactically valid URLs, rejecting obviously malformed input.

**Trade-off:**

The API does not verify that the URL actually resolves to an image, or that the image remains accessible after submission. A URL pointing to a deleted resource will silently return a broken image on the client side. In production, a background job or webhook from the CDN provider would handle broken-link detection.

---

## Soft Delete for Users and Blogs

Users and blog posts use a `status` column (`1` = ENABLED, `0` = DISABLED, `-1` = DELETED) rather than physical row deletion.

**Why:**

- Deleting a `user` row would require cascading the deletion to all their blog posts, or first re-assigning authorship. Soft-deleting the user preserves the FK relationship and keeps blog history intact.
- Soft-deleted blogs can be recovered if a deletion was accidental, without needing a backup restore.
- The `DISABLED` state (status `0`) allows an admin to temporarily hide content without deleting it - useful for moderation.
- Soft deletes simplify audit logging: the original record and its timestamps are preserved.

**Trade-off:**

Queries must include a `status != -1` filter. Forgetting this filter would expose deleted records. TypeORM does not apply this automatically (unlike libraries with built-in soft-delete support), so it must be enforced in every service method. For a larger system, a custom TypeORM subscriber or a shared query builder utility would centralise this filtering.

Comments and blog images use hard deletes because they have no authorship relationship and the data is less critical to preserve.

---

## REST over GraphQL

The API follows a REST (HTTP + JSON) design.

**Why:**

- REST is the standard expectation for backend assignments and is immediately familiar to any technical reviewer.
- The data model and access patterns are straightforward: a fixed set of resources with standard CRUD operations. GraphQL's flexibility - allowing clients to request exactly the fields they need - provides more value when the client surface is large and varied.
- NestJS has first-class support for REST with Fastify, reducing the amount of infrastructure code needed.
- Swagger/OpenAPI documentation is generated automatically from controller decorators, providing a ready-made interactive API explorer at no extra cost.

**Trade-off:**

If the frontend grows to have many different views with different data-shape requirements (e.g., a mobile app that needs minimal payloads, a dashboard that needs aggregated data), REST will require either multiple specialised endpoints or overfetching. GraphQL would be the natural evolution at that point.

---

## JWT with Redis Session Control

Authentication uses stateless JWTs combined with a Redis session store.

**Why:**

- Pure stateless JWT (no server-side session) makes it impossible to log a user out before the token expires, because the token is self-validating. Storing the token in Redis and checking for it on every protected request allows immediate invalidation on logout.
- On every valid request, the token's Redis entry is re-cached with the remaining TTL, effectively implementing a sliding expiration. Sessions stay alive as long as the user is active.
- Redis lookup adds one network round-trip per authenticated request, but it is fast and keeps the application server stateless (horizontally scalable).
- This approach avoids the complexity of token refresh flows while still supporting explicit logout.

**Trade-off:**

Every authenticated request depends on Redis being available. If Redis is down, all protected routes fail. In production this is mitigated by Redis replication and health-check-gated deployments. Alternatively, a token blacklist approach (only storing revoked tokens) would make Redis less critical for the happy path.

---

## Slug Auto-generation from Title

Blog post URLs use a human-readable slug (`/blog/getting-started-with-nestjs`) derived from the title rather than the raw UUID.

**Why:**

- Slugs are meaningful to readers and search engines, unlike opaque UUIDs.
- Auto-generation removes the burden from the admin of choosing a URL-safe identifier.
- If the title changes, the slug is regenerated, keeping URLs consistent with content.

**Trade-off:**

If a post is shared publicly and then its title is changed, the old URL breaks. A production system would either preserve the original slug permanently, or create a redirect from the old slug to the new one. Neither mechanism is implemented here.

---

## No Role-Based Access Control (RBAC)

There is a single role level: authenticated admin. Any valid JWT grants full write access to all admin endpoints.

**Why:**

- The assignment scope defines two personas - admin and public visitor - with no sub-roles.
- Adding RBAC (e.g., editor vs super-admin) before there is a clear requirement would be premature and add complexity to every guard check.

**Trade-off:**

All admin users can delete other users, delete any blog post, and approve/reject any comment. If different admins should have different permissions, a `role` column on the `user` entity and a role-checking guard would be the natural extension.

---

## Fastify over Express

The application uses `@nestjs/platform-fastify` instead of the default Express adapter.

**Why:**

- Fastify has lower per-request overhead and higher throughput under load, which matters at scale.
- Security headers, CORS, and response compression are all handled by first-party Fastify plugins (`@fastify/helmet`, `@fastify/cors`, `@fastify/compress`).
- NestJS supports Fastify natively with the same decorator-based API, so the developer experience is essentially identical.

**Trade-off:**

Some Express middleware (e.g., `multer` for file uploads) does not work with Fastify without a compatibility layer. This is acceptable given the decision to handle images by URL rather than file upload.
