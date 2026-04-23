# API Reference

## Base URL

```
http://localhost:3001/api
```

Interactive documentation is available at `/api/docs` (Swagger UI).

---

## Authentication

Protected endpoints require a Bearer token in the `Authorization` header:

```
Authorization: Bearer <accessToken>
```

Tokens are JWTs signed with `APP_JWT_SECRET`. The default expiry is **1 hour**. Logging out immediately invalidates the token by removing it from the Redis session store.

---

## Auth Endpoints

### POST `/auth/register`

Create a new admin account and receive an access token.

**Request body**

```json
{
  "username": "admin",
  "password": "secret123"
}
```

**Response `200 OK`**

```json
{
  "accessToken": "eyJhbGciOiJIUzI1NiJ9..."
}
```

**Errors:** `400 Bad Request` - username already exists.

---

### POST `/auth/login`

Log in with an existing admin account.

**Request body**

```json
{
  "username": "admin",
  "password": "secret123"
}
```

**Response `200 OK`**

```json
{
  "accessToken": "eyJhbGciOiJIUzI1NiJ9..."
}
```

**Errors:** `401 Unauthorized` - invalid credentials.

---

### POST `/auth/logout`

**Auth required.**

Invalidate the current session. The token is removed from Redis and cannot be used again even if it has not expired.

**Response `200 OK`** - no body.

---

## User Endpoints

All user endpoints require a valid Bearer token.

### GET `/user`

List admin users. Optionally filter by username (partial, case-insensitive match).

**Query parameters**

| Parameter  | Type   | Required | Description             |
| ---------- | ------ | -------- | ----------------------- |
| `username` | string | No       | Partial username filter |

**Response `200 OK`**

```json
[
  {
    "id": "3fa85f64-5717-4562-b3fc-2c963f66afa6",
    "username": "admin",
    "status": 1,
    "createdAt": "2025-01-01T00:00:00.000Z",
    "updatedAt": "2025-01-01T00:00:00.000Z"
  }
]
```

---

### GET `/user/:id`

Get a single user by ID.

**Response `200 OK`** - same shape as the list item above.

**Errors:** `404 Not Found` - user does not exist or is soft-deleted.

---

### POST `/user`

Create a new admin user.

**Request body**

```json
{
  "username": "editor",
  "password": "secret123"
}
```

**Response `201 Created`** - returns the created user object (without `password`).

**Errors:** `400 Bad Request` - username already taken.

---

### PUT `/user/:id`

Update a user's username or password. All fields are optional.

**Request body**

```json
{
  "username": "new-name",
  "password": "newpassword"
}
```

**Response `204 No Content`**

**Errors:** `400 Bad Request` - new username already taken. `404 Not Found` - user not found.

---

### DELETE `/user/:id`

Soft-delete a user (sets `status = -1`). The user's blog posts are preserved.

**Response `204 No Content`**

**Errors:** `404 Not Found` - user not found.

---

## Blog Endpoints

### GET `/blog` - Public

List published blog posts with pagination and optional title search.

**Query parameters**

| Parameter | Type    | Required | Default | Constraints        | Description                         |
| --------- | ------- | -------- | ------- | ------------------ | ----------------------------------- |
| `search`  | string  | No       | -       | -                  | Searches `title` (case-insensitive) |
| `page`    | integer | No       | `1`     | min `1`            | Page number                         |
| `limit`   | integer | No       | `10`    | min `1`, max `100` | Items per page                      |

**Response `200 OK`**

```json
{
  "data": [
    {
      "id": "3fa85f64-5717-4562-b3fc-2c963f66afa6",
      "title": "Getting Started with NestJS",
      "slug": "getting-started-with-nestjs",
      "viewCount": 42,
      "status": 1,
      "authorId": "a1b2c3d4-...",
      "createdAt": "2025-01-01T00:00:00.000Z",
      "updatedAt": "2025-01-01T00:00:00.000Z"
    }
  ],
  "total": 1
}
```

**Note:** The `content` field is **not** included in the list response to keep payloads small. Retrieve it via the slug endpoint.

---

### GET `/blog/:slug` - Public

Get a single blog post by its URL slug. Increments `view_count` on each call. Includes associated comments (approved only visible in practice).

**Response `200 OK`**

```json
{
  "id": "3fa85f64-5717-4562-b3fc-2c963f66afa6",
  "title": "Getting Started with NestJS",
  "slug": "getting-started-with-nestjs",
  "content": "Full content of the blog post...",
  "viewCount": 43,
  "status": 1,
  "authorId": "a1b2c3d4-...",
  "comments": [
    {
      "id": "c1c2c3c4-...",
      "content": "Great post!",
      "authorName": "Jane",
      "status": "approved",
      "createdAt": "2025-01-02T00:00:00.000Z"
    }
  ],
  "createdAt": "2025-01-01T00:00:00.000Z",
  "updatedAt": "2025-01-01T00:00:00.000Z"
}
```

**Errors:** `404 Not Found` - slug does not exist.

---

### POST `/blog` - Auth required

Create a new blog post. The `slug` is auto-generated from the title and `authorId` is taken from the JWT payload.

**Request body**

```json
{
  "title": "Getting Started with NestJS",
  "content": "This is the full content of the blog post, at least 10 characters long."
}
```

**Response `201 Created`** - returns the created blog object.

**Errors:** `409 Conflict` - a non-deleted blog with the same slug already exists.

---

### PUT `/blog/:id` - Auth required

Update a blog post. All fields are optional. `slug` can be set directly; if omitted and `title` changes, the slug is regenerated from the new title.

**Request body**

```json
{
  "title": "Updated Title",
  "slug": "updated-title",
  "content": "Updated content, still at least 10 characters.",
  "status": 0
}
```

**`status` values:** `1` = ENABLED, `0` = DISABLED, `-1` = DELETED.

**Response `204 No Content`**

**Errors:** `404 Not Found` - blog not found. `409 Conflict` - new slug already taken.

---

### DELETE `/blog/:id` - Auth required

Soft-delete a blog post (sets `status = -1`).

**Response `204 No Content`**

**Errors:** `404 Not Found` - blog not found.

---

## Blog Image Endpoints

All blog image endpoints require a valid Bearer token.

### GET `/blog/:blogId/image`

List all images for a blog post. Results are ordered: cover image first, then additional images by creation date ascending.

**Response `200 OK`**

```json
[
  {
    "id": "img-uuid-1",
    "blogId": "blog-uuid",
    "url": "https://example.com/images/cover.jpg",
    "isCover": true,
    "createdAt": "2025-01-01T00:00:00.000Z"
  },
  {
    "id": "img-uuid-2",
    "blogId": "blog-uuid",
    "url": "https://example.com/images/photo1.jpg",
    "isCover": false,
    "createdAt": "2025-01-01T00:01:00.000Z"
  }
]
```

---

### POST `/blog/:blogId/image`

Add an image to a blog post.

**Request body**

```json
{
  "url": "https://example.com/images/photo.jpg",
  "isCover": false
}
```

**Response `201 Created`** - returns the created image object.

**Errors:**

- `404 Not Found` - blog not found.
- `409 Conflict` - `isCover: true` submitted but a cover already exists (use PATCH to promote instead).
- `400 Bad Request` - the blog already has 6 non-cover images.

**Cover promotion:** To set a new cover, PATCH the existing image to `isCover: true` - this automatically demotes the current cover. Alternatively, submit a new image with `isCover: true` only if no cover exists yet.

---

### PATCH `/blog-image/:id`

Update an image's URL or cover status.

**Request body**

```json
{
  "url": "https://example.com/images/new-photo.jpg",
  "isCover": true
}
```

If `isCover` is set to `true`, the previous cover for that blog (if any) is automatically demoted to `false`.

**Response `204 No Content`**

**Errors:** `404 Not Found` - image not found.

---

### DELETE `/blog-image/:id`

Permanently delete an image (hard delete).

**Response `204 No Content`**

**Errors:** `404 Not Found` - image not found.

---

## Comment Endpoints

### POST `/blog/:blogId/comment` - Public

Submit a comment on a blog post. No authentication required. The comment is created in `pending` status and must be approved by an admin before it becomes visible to the public.

**Request body**

```json
{
  "content": "Great article, very helpful!",
  "authorName": "Jane Doe"
}
```

**Response `201 Created`**

```json
{
  "id": "c1c2c3c4-...",
  "blogId": "3fa85f64-...",
  "content": "Great article, very helpful!",
  "authorName": "Jane Doe",
  "status": "pending",
  "createdAt": "2025-01-02T00:00:00.000Z",
  "updatedAt": "2025-01-02T00:00:00.000Z"
}
```

**Errors:** `404 Not Found` - blog not found.

---

### GET `/comment` - Auth required

List all comments. Optionally filter by status and/or blog.

**Query parameters**

| Parameter | Type   | Required | Description                           |
| --------- | ------ | -------- | ------------------------------------- |
| `status`  | string | No       | `pending` \| `approved` \| `rejected` |
| `blogId`  | UUID   | No       | Filter to a specific blog post        |

**Response `200 OK`**

```json
[
  {
    "id": "c1c2c3c4-...",
    "blogId": "3fa85f64-...",
    "content": "Great article!",
    "authorName": "Jane",
    "status": "pending",
    "createdAt": "2025-01-02T00:00:00.000Z",
    "updatedAt": "2025-01-02T00:00:00.000Z"
  }
]
```

---

### PATCH `/comment/:id/approve` - Auth required

Approve a comment (sets `status = 'approved'`).

**Response `204 No Content`**

**Errors:** `404 Not Found` - comment not found.

---

### PATCH `/comment/:id/reject` - Auth required

Reject a comment (sets `status = 'rejected'`).

**Response `204 No Content`**

**Errors:** `404 Not Found` - comment not found.

---

## Common Error Responses

| Status | Meaning               | When it occurs                                               |
| ------ | --------------------- | ------------------------------------------------------------ |
| `400`  | Bad Request           | Validation failure, duplicate username, image limit exceeded |
| `401`  | Unauthorized          | Missing or invalid token                                     |
| `404`  | Not Found             | Requested resource does not exist                            |
| `409`  | Conflict              | Slug or username already taken; duplicate cover image        |
| `500`  | Internal Server Error | Unexpected server-side error                                 |

All error responses follow the NestJS default shape:

```json
{
  "statusCode": 404,
  "message": "Blog not found",
  "error": "Not Found"
}
```

---

## Admin vs Public Summary

| Endpoint                     | Public | Admin (JWT) |
| ---------------------------- | ------ | ----------- |
| `POST /auth/register`        | ✓      |             |
| `POST /auth/login`           | ✓      |             |
| `POST /auth/logout`          |        | ✓           |
| `GET/POST/PUT/DELETE /user`  |        | ✓           |
| `GET /blog`                  | ✓      |             |
| `GET /blog/:slug`            | ✓      |             |
| `POST /blog`                 |        | ✓           |
| `PUT /blog/:id`              |        | ✓           |
| `DELETE /blog/:id`           |        | ✓           |
| `GET /blog/:blogId/image`    |        | ✓           |
| `POST /blog/:blogId/image`   |        | ✓           |
| `PATCH /blog-image/:id`      |        | ✓           |
| `DELETE /blog-image/:id`     |        | ✓           |
| `POST /blog/:blogId/comment` | ✓      |             |
| `GET /comment`               |        | ✓           |
| `PATCH /comment/:id/approve` |        | ✓           |
| `PATCH /comment/:id/reject`  |        | ✓           |
