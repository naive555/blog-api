# Assumptions and Limitations

## Assumptions

### Authentication

- **Any registered account is a trusted admin.** There is no invitation flow or approval step for new accounts. Anyone who can reach the `POST /auth/register` endpoint can create an admin account. In a production deployment, this endpoint would be disabled or protected by a separate secret after initial setup.
- **Token expiry of 1 hour is sufficient.** The default JWT expiry (`APP_JWT_EXPIRES_IN=3600`) is treated as a reasonable default. If a longer or shorter session is required, only the environment variable needs to change.
- **A single token per user.** When a user logs in, the system returns an existing cached token from Redis if one is still valid, rather than issuing a new one. This means a user cannot maintain independent sessions across multiple devices simultaneously.

### Comment Authorship

- **Comments are not linked to user accounts.** The `author_name` field is free text submitted by the commenter. There is no identity verification. This is consistent with the assignment scope (public commenting without registration).
- **Any name may be submitted.** There is no uniqueness constraint or profanity filter on `author_name`.

### Image Management

- **Images are hosted externally.** The API does not verify that a submitted URL points to an accessible image, that the host is trusted, or that the content is an image file. Validation is limited to checking that the value is a syntactically valid URL.
- **The 6-image limit is a fixed business rule.** `MAX_BLOG_ADDITIONAL_IMAGES = 6` is a constant in the codebase. Changing it requires a code deployment.

### Slug Generation

- **Slugs derived from the title are unique enough.** If two admins create posts with identical titles simultaneously, one will receive a conflict error and need to retry. The system does not auto-append a numeric suffix (e.g., `my-post-2`).
- **Changing the title changes the slug.** The old URL is not preserved or redirected. This is acceptable for an internal assignment but would be a breaking change in a public-facing deployment.

### Database

- **Schema synchronisation is safe in this context.** `DATABASE_SYNCHRONIZE=true` is used in development. This is explicitly not recommended for production use as it can result in data loss during schema changes. Migrations would be used instead.
- **No multi-tenancy.** There is a single shared database with no concept of organisations, workspaces, or isolated data sets.

### Security

- **CORS is disabled by default.** The `CORS` environment variable defaults to `false`. In a browser-based deployment, this must be enabled and `CORS_DOMAINS` must be configured correctly.
- **No rate limiting.** There is no throttling on the login, register, or public comment endpoints. Brute-force attacks against login and comment spam are not mitigated at the application layer.
- **Passwords have no strength requirements.** The DTO validates only that the password is a non-empty string. Minimum length, character complexity, and common-password checks are not enforced.

---

## Current Limitations

### Comment Visibility

The `GET /blog/:slug` endpoint returns all comments associated with a blog post, including those with `status = 'pending'` and `status = 'rejected'`. Filtering to approved-only comments is not applied at the query level — this should be addressed before exposing the endpoint to the public.

### No Pagination on Non-Blog Endpoints

Only the blog listing endpoint (`GET /blog`) supports pagination. Comments (`GET /comment`) and users (`GET /user`) return all matching records without limit. For a blog with a large number of comments or a system with many admin users, this will cause unbounded result sets.

### View Count Is Not Atomic Under High Concurrency

The `view_count` increment is implemented as a TypeORM `update` query that adds 1 to the current value. Under very high concurrent traffic, this is safe at the database level (the SQL `SET view_count = view_count + 1` is atomic). However, if the logic were ever moved to a read-then-write pattern, it would introduce a race condition. The current implementation is acceptable.

### No Search on Content

The `search` parameter in `GET /blog` matches only against the `title` column using a case-insensitive `ILIKE` query. Full content search is not available.

### No Image Ordering Control

Additional blog images are returned in creation order. There is no `display_order` field, so the admin cannot reorder images after upload without deleting and re-uploading them.

### No Refresh Token Flow

There is only an access token. When it expires, the user must log in again. A refresh token mechanism was out of scope for this assignment.

### No Audit Log

There is no record of who approved or rejected a comment, who deleted a blog post, or when status changes occurred. The `updated_at` timestamp is the only audit trail.

---

## Future Improvements

### Near-term

| Improvement                          | Benefit                                                    |
|--------------------------------------|------------------------------------------------------------|
| Filter approved comments on slug endpoint | Prevent pending/rejected comments from leaking to the public |
| Pagination for comments and users    | Prevent unbounded queries                                  |
| Rate limiting on public endpoints    | Protect against comment spam and brute-force login         |
| Password strength validation         | Improve account security                                   |
| Slug conflict auto-resolution        | Append a numeric suffix instead of returning a 409         |

### Medium-term

| Improvement                          | Benefit                                                    |
|--------------------------------------|------------------------------------------------------------|
| Role-based access control            | Support editor vs super-admin differentiation              |
| Refresh token flow                   | Improve user experience for long sessions                  |
| Full-text search on blog content     | Richer search experience (PostgreSQL `tsvector` or Elasticsearch) |
| Image `display_order` field          | Allow admins to reorder images without re-uploading        |
| Image URL verification               | Confirm URLs resolve to accessible image resources         |
| Structured logging (JSON)            | Ingest logs into a log aggregation system (ELK, Datadog)   |

### Production-readiness

| Improvement                          | Benefit                                                    |
|--------------------------------------|------------------------------------------------------------|
| CDN for images                       | Serve images with low latency globally; off-load origin    |
| Database read replicas               | Scale read traffic for `GET /blog` without affecting writes |
| Connection pooling (PgBouncer)       | Handle burst traffic without exhausting PostgreSQL connections |
| Blog list query caching in Redis     | Reduce database load for the most frequent public query    |
| Composite index on `blog(status, created_at)` | Speed up the paginated listing query             |
| TypeORM migrations workflow          | Safe schema evolution without risking data loss            |
| Health check endpoint                | Enable Kubernetes/ECS liveness and readiness probes        |
| Secrets manager integration          | Replace `.env` files with Vault or cloud-native secrets    |
| OpenTelemetry tracing                | Distributed tracing across service calls                   |
