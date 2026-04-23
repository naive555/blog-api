<p align="center">
  <img src="https://nestjs.com/img/logo-small.svg" width="120" alt="NestJS Logo" />
</p>

<p align="center">
  Blog system backend built with <strong>NestJS</strong>, <strong>Fastify</strong>, and <strong>PostgreSQL</strong>
</p>

---

## Overview

A RESTful blog backend with:

- Public blog listing (search + pagination) and detail pages with view count tracking
- Comment submission with admin approval flow
- Blog image management (1 cover + up to 6 additional images per post)
- Admin authentication with JWT session caching via Redis

---

## Tech Stack

| Layer            | Technology                          |
| ---------------- | ----------------------------------- |
| Framework        | NestJS 11                           |
| HTTP Adapter     | Fastify                             |
| Runtime          | Bun                                 |
| Database         | PostgreSQL 16 + TypeORM             |
| Cache / Sessions | Redis + cache-manager               |
| Auth             | Passport.js (JWT + Local)           |
| Validation       | class-validator + class-transformer |
| Docs             | Swagger UI (`/api/docs`)            |

---

## Project Structure

```
src/
├── auth/           JWT + local auth, login/register/logout
├── user/           Admin user CRUD
├── blog/           Blog posts - public read, admin write
├── blog-image/     Cover + additional images per blog
├── comment/        Public submission, admin approval
├── config/         Centralized environment configuration
├── middleware/      Global logging interceptor
└── utility/        Shared enums, constants, helpers
```

---

## API Endpoints

### Auth

| Method | Route                | Auth | Description              |
| ------ | -------------------- | ---- | ------------------------ |
| `POST` | `/api/auth/login`    | -    | Admin login, returns JWT |
| `POST` | `/api/auth/register` | -    | Register admin account   |
| `POST` | `/api/auth/logout`   | JWT  | Invalidate session       |

### Blog

| Method   | Route             | Auth | Description                          |
| -------- | ----------------- | ---- | ------------------------------------ |
| `GET`    | `/api/blog`       | -    | List blogs (`?search=&page=&limit=`) |
| `GET`    | `/api/blog/:slug` | -    | Blog detail, increments view count   |
| `POST`   | `/api/blog`       | JWT  | Create blog post                     |
| `PUT`    | `/api/blog/:id`   | JWT  | Update blog post                     |
| `DELETE` | `/api/blog/:id`   | JWT  | Soft-delete blog post                |

### Blog Images

| Method   | Route                     | Auth | Description                            |
| -------- | ------------------------- | ---- | -------------------------------------- |
| `GET`    | `/api/blog/:blogId/image` | JWT  | List images (cover first)              |
| `POST`   | `/api/blog/:blogId/image` | JWT  | Add image (max 1 cover + 6 additional) |
| `PATCH`  | `/api/blog-image/:id`     | JWT  | Update URL or promote to cover         |
| `DELETE` | `/api/blog-image/:id`     | JWT  | Remove image                           |

### Comments

| Method  | Route                       | Auth | Description                      |
| ------- | --------------------------- | ---- | -------------------------------- |
| `POST`  | `/api/blog/:blogId/comment` | -    | Submit comment (status: pending) |
| `GET`   | `/api/comment`              | JWT  | List comments with filters       |
| `PATCH` | `/api/comment/:id/approve`  | JWT  | Approve comment                  |
| `PATCH` | `/api/comment/:id/reject`   | JWT  | Reject comment                   |

### Users

| Method   | Route           | Auth | Description      |
| -------- | --------------- | ---- | ---------------- |
| `GET`    | `/api/user`     | JWT  | List users       |
| `GET`    | `/api/user/:id` | JWT  | Get user by ID   |
| `POST`   | `/api/user`     | JWT  | Create user      |
| `PUT`    | `/api/user/:id` | JWT  | Update user      |
| `DELETE` | `/api/user/:id` | JWT  | Soft-delete user |

---

## Getting Started

### Prerequisites

- [Bun](https://bun.sh) >= 1.x
- PostgreSQL 16
- Redis

### Install

```bash
bun install
```

### Environment

Create a `.env` file (or `.env.local` / `.env.docker` depending on environment):

```env
# App
PORT=3001
NODE_ENV=local

# Database
DATABASE_TYPE=postgres
DATABASE_HOST=localhost
DATABASE_PORT=5432
DATABASE_USER=postgres
DATABASE_PASSWORD=postgres
DATABASE_DB=blog
DATABASE_SYNCHRONIZE=true
DATABASE_LOGGING=false

# Redis
REDIS_HOST=localhost
REDIS_PORT=6379

# JWT
JWT_SECRET=your-secret-key
JWT_EXPIRES_IN=3600

# Bcrypt
BCRYPT_SALT_ROUNDS=10

# CORS
CORS_ENABLED=true
```

### Run

```bash
# Development (watch mode)
bun run start:dev

# Production
bun run build
bun run start:prod
```

Swagger UI is available at: **http://localhost:3001/api/docs**

---

## Docker

Start all services (app + PostgreSQL + Redis):

```bash
docker-compose up -d
```

Stop and remove containers:

```bash
docker-compose down
```

> The app service waits for PostgreSQL and Redis health checks before starting.

---

## Testing

```bash
# Unit tests
bun run test

# Watch mode
bun run test:watch

# Coverage report
bun run test:cov
```

---

## License

UNLICENSED
