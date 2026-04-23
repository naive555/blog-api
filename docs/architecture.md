# Architecture

## Overview

This is a RESTful Blog API backend built with **NestJS** using the **Fastify** HTTP adapter. It follows a modular, layered architecture where each domain is self-contained and communicates only through well-defined service interfaces.

The system is designed to be stateless at the application layer, with JWT tokens for authentication and Redis for token session management. PostgreSQL is the primary data store.

```
Client
  │
  ▼
[ Fastify HTTP Adapter ]
  │  Helmet / CORS / Compression
  │
  ▼
[ Global Validation Pipe ]   <- strips & validates all incoming DTOs
  │
  ▼
[ Guards ]                   <- JwtAuthGuard / LocalAuthGuard
  │
  ▼
[ Controllers ]              <- route handlers, input binding
  │
  ▼
[ Services ]                 <- business logic, constraint enforcement
  │
  ▼
[ TypeORM Repositories ]     <- database queries
  │
  ▼
[ PostgreSQL ]
```

Redis is accessed directly from `AuthService` for token caching — it is not part of the main request pipeline for other modules.

---

## Module Breakdown

### `AuthModule`

Handles login, registration, and logout. Uses Passport.js with two strategies:

- **LocalStrategy** — validates username and password on login/register routes.
- **JwtStrategy** — validates Bearer tokens on protected routes, checks Redis for an active session, and re-caches the token with the remaining TTL.

On logout, the token entry is deleted from Redis, immediately invalidating the session even if the JWT itself has not expired.

### `UserModule`

Manages admin user accounts. All endpoints require a valid JWT. Users are soft-deleted (status set to `DELETED = -1`) rather than hard-deleted, preserving referential integrity with authored blog posts.

### `BlogModule`

The core domain. Exposes both public (unauthenticated) and admin (JWT-protected) endpoints:

- Public endpoints allow listing and reading blog posts. Reading by slug increments the `view_count` counter.
- Admin endpoints create, update, and soft-delete blog posts.
- Slugs are auto-generated from the title (lowercased, special characters removed, spaces replaced with hyphens) and must remain unique across non-deleted posts.

### `BlogImageModule`

Manages images associated with a blog post. Each blog may have:

- Exactly **0 or 1** cover image (`isCover = true`)
- Up to **6** additional images (`isCover = false`)

If a new image is submitted as a cover, the existing cover is automatically demoted. Images are hard-deleted (no soft delete). All endpoints require JWT authentication.

### `CommentModule`

Handles the comment lifecycle:

- Any visitor can submit a comment (no auth required). Comments start in `PENDING` status.
- Authenticated admins can list comments (filtered by status and/or blog), approve, or reject them.

Comments are hard-deleted if removed.

---

## Request Flow

A typical authenticated request follows this path:

```
1. HTTP request arrives at Fastify
2. @fastify/helmet applies security response headers
3. Global ValidationPipe transforms and validates the request body/query against the DTO class
4. JwtAuthGuard (Passport JWT strategy) extracts the Bearer token
5. Token signature and expiration verified
6. Redis checked for active session — token re-cached with remaining TTL
7. User record fetched and attached to request.user
8. Controller method invoked with bound parameters/body
9. Service method executes business logic
10. TypeORM repository performs the database query
11. Response returned to client; LoggingInterceptor records method, URL, status, duration, and user ID
```

---

## Infrastructure Components

| Component     | Technology                          | Purpose                                       |
| ------------- | ----------------------------------- | --------------------------------------------- |
| HTTP server   | Fastify                             | High-performance HTTP adapter for NestJS      |
| Database      | PostgreSQL 16                       | Primary relational data store                 |
| Cache/Session | Redis 7                             | JWT token session store                       |
| Auth          | Passport.js + JWT                   | Stateless authentication with session control |
| ORM           | TypeORM                             | Entity management and query building          |
| Validation    | class-validator + class-transformer | DTO validation and transformation             |
| Docs          | Swagger (OpenAPI)                   | API documentation at `/api/docs`              |
| Security      | @fastify/helmet                     | HTTP security headers                         |
| Container     | Docker + docker-compose             | Local development and deployment              |

---

## Scalability Considerations

- **Stateless application layer** — no in-process session state. Horizontal scaling (multiple app instances) is possible without sticky sessions, as long as all instances share the same Redis and PostgreSQL.
- **Redis token store** — enables instant session revocation (logout) and is already the natural extension point for distributed rate limiting or token blacklisting.
- **Fastify adapter** — measurably lower per-request overhead than Express, which improves throughput under load without architectural changes.
- **Soft deletes** — preserving deleted records avoids cascading FK issues and simplifies future audit log requirements.

### Path to Production

| Concern            | Current state               | Production approach                                  |
| ------------------ | --------------------------- | ---------------------------------------------------- |
| Image storage      | External URL reference      | CDN (e.g., Cloudflare R2, AWS S3 + CloudFront)       |
| Database scaling   | Single PostgreSQL instance  | Read replica + connection pooling (PgBouncer)        |
| Caching            | Redis for tokens only       | Redis for blog list/detail query caching             |
| Search             | `ILIKE` on `title`          | Full-text search index (`tsvector`) or Elasticsearch |
| Monitoring         | Request logging interceptor | APM (Datadog, New Relic) + structured JSON logs      |
| Secrets management | `.env` files                | Vault, AWS Secrets Manager, or cloud-native secrets  |
