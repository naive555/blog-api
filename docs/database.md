# Database

## Overview

The system uses **PostgreSQL** as the primary relational database, managed through **TypeORM**. All entities use UUID v4 primary keys. Timestamps are stored as `timestamp` columns and set automatically by TypeORM's `@CreateDateColumn` / `@UpdateDateColumn` decorators.

Schema creation is controlled by the `DATABASE_SYNCHRONIZE` environment variable. In development it can be set to `true` (TypeORM auto-syncs the schema). For production, this should be `false` and migrations should be used instead.

---

## Tables

### `user`

Stores admin accounts used for authentication and blog authorship.

| Column       | Type        | Constraints                     | Notes                                         |
| ------------ | ----------- | ------------------------------- | --------------------------------------------- |
| `id`         | `uuid`      | PK, default `gen_random_uuid()` | UUID v4 primary key                           |
| `username`   | `varchar`   | NOT NULL, UNIQUE                | Used for login; must be globally unique       |
| `password`   | `varchar`   | NOT NULL                        | bcrypt hash; excluded from SELECT by default  |
| `status`     | `smallint`  | NOT NULL, default `1`           | `1` = ENABLED, `0` = DISABLED, `-1` = DELETED |
| `created_at` | `timestamp` | NOT NULL, auto-set              | Record creation time                          |
| `updated_at` | `timestamp` | NOT NULL, auto-updated          | Last modification time                        |

**Notes:**

- Soft-deleted users have `status = -1`. They are excluded from all queries but their `id` remains a valid foreign key in `blog`.
- The `password` column uses `{ select: false }` in TypeORM, so it is never returned in standard queries. It must be explicitly selected when needed (e.g., during login validation).

---

### `blog`

Stores blog posts. Each post belongs to one author (user).

| Column       | Type        | Constraints                                 | Notes                                                       |
| ------------ | ----------- | ------------------------------------------- | ----------------------------------------------------------- |
| `id`         | `uuid`      | PK                                          | UUID v4 primary key                                         |
| `title`      | `varchar`   | NOT NULL                                    | Display title of the post                                   |
| `slug`       | `varchar`   | NOT NULL, UNIQUE                            | URL-safe identifier; auto-generated from `title`            |
| `content`    | `text`      | NOT NULL                                    | Full post body; minimum 10 characters enforced at DTO level |
| `view_count` | `integer`   | NOT NULL, default `0`                       | Incremented on each read-by-slug request                    |
| `status`     | `smallint`  | NOT NULL, default `1`                       | `1` = ENABLED, `0` = DISABLED, `-1` = DELETED               |
| `author_id`  | `uuid`      | NOT NULL, FK -> `user.id` ON DELETE CASCADE | Author of the post                                          |
| `created_at` | `timestamp` | NOT NULL, auto-set                          |                                                             |
| `updated_at` | `timestamp` | NOT NULL, auto-updated                      |                                                             |

**Notes:**

- Slug uniqueness is checked at the service layer before insert/update, scoped to non-deleted posts.
- If `author_id` references a user that is hard-deleted (which is never done in this system), the cascade would remove the blog. In practice, users are only soft-deleted, so blogs remain intact.
- The public listing endpoint filters to `status != -1`. Admins can set `status = 0` (DISABLED) to hide a post without deleting it.

---

### `blog_image`

Stores image references for blog posts. Images are referenced by URL — no binary data is stored in the database.

| Column       | Type        | Constraints                                 | Notes                                       |
| ------------ | ----------- | ------------------------------------------- | ------------------------------------------- |
| `id`         | `uuid`      | PK                                          | UUID v4 primary key                         |
| `blog_id`    | `uuid`      | NOT NULL, FK -> `blog.id` ON DELETE CASCADE | Owning blog post                            |
| `url`        | `varchar`   | NOT NULL                                    | Fully qualified URL; validated at DTO level |
| `is_cover`   | `boolean`   | NOT NULL, default `false`                   | Exactly one cover image allowed per blog    |
| `created_at` | `timestamp` | NOT NULL, auto-set                          |                                             |

**Constraints enforced at the service layer:**

- At most **1** image with `is_cover = true` per blog. Promoting a new cover automatically sets all others to `false`.
- At most **6** images with `is_cover = false` per blog.

**Notes:**

- Hard-deleted (physical row removal) when an image is removed. No soft-delete on this entity.
- When the parent `blog` is deleted (cascaded), all `blog_image` rows for that blog are removed automatically by the database.

---

### `comment`

Stores public comments on blog posts, with an approval workflow.

| Column        | Type        | Constraints                                 | Notes                                                                |
| ------------- | ----------- | ------------------------------------------- | -------------------------------------------------------------------- |
| `id`          | `uuid`      | PK                                          | UUID v4 primary key                                                  |
| `blog_id`     | `uuid`      | NOT NULL, FK -> `blog.id` ON DELETE CASCADE | Blog the comment belongs to                                          |
| `content`     | `text`      | NOT NULL                                    | Comment body; minimum 2 characters enforced at DTO level             |
| `author_name` | `varchar`   | NOT NULL                                    | Display name supplied by the commenter; not linked to a user account |
| `status`      | `varchar`   | NOT NULL, default `'pending'`               | `'pending'` \| `'approved'` \| `'rejected'`                          |
| `created_at`  | `timestamp` | NOT NULL, auto-set                          |                                                                      |
| `updated_at`  | `timestamp` | NOT NULL, auto-updated                      |                                                                      |

**Notes:**

- Comments are not linked to user accounts. `author_name` is a free-text field supplied by the commenter.
- Only admins can transition status from `pending` -> `approved` or `pending` -> `rejected`.
- Hard-deleted if removed. Cascade ensures comments are removed when the parent blog is deleted.

---

## Entity Relationships

```
user
 │
 │ 1
 │
 └─────────────────────────────────── blog (author_id FK)
                                         │
                              ┌──────────┴──────────┐
                              │ 1                   │ 1
                              │                     │
                           blog_image            comment
                           (blog_id FK)          (blog_id FK)
```

| Relationship       | Type        | Delete behaviour   |
| ------------------ | ----------- | ------------------ |
| user -> blog       | One-to-Many | CASCADE (DB-level) |
| blog -> blog_image | One-to-Many | CASCADE (DB-level) |
| blog -> comment    | One-to-Many | CASCADE (DB-level) |

---

## Key Indexes

TypeORM creates a primary key index on every `id` column automatically. The following additional indexes are present or implied by constraints:

| Table        | Column     | Index type | Reason                                       |
| ------------ | ---------- | ---------- | -------------------------------------------- |
| `user`       | `username` | UNIQUE     | Login lookup and uniqueness enforcement      |
| `blog`       | `slug`     | UNIQUE     | Public URL lookup and uniqueness enforcement |
| `blog_image` | `blog_id`  | (FK index) | Efficient image listing per blog             |
| `comment`    | `blog_id`  | (FK index) | Efficient comment listing per blog           |

**Scalability note:** For a production system, adding a composite index on `blog(status, created_at)` would improve the paginated listing query, and a GIN index on `blog(title)` using `tsvector` would enable full-text search instead of the current `ILIKE` pattern.

---

## Status Enumerations

### `EStatus` (used by `user` and `blog`)

| Value | Meaning  | Behaviour                                              |
| ----- | -------- | ------------------------------------------------------ |
| `1`   | ENABLED  | Active record; returned by all standard queries        |
| `0`   | DISABLED | Hidden from public listing; accessible by id for admin |
| `-1`  | DELETED  | Soft-deleted; excluded from all standard queries       |

### `ECommentStatus` (used by `comment`)

| Value      | Meaning  | Behaviour                                        |
| ---------- | -------- | ------------------------------------------------ |
| `pending`  | Pending  | Newly submitted; visible to admins only          |
| `approved` | Approved | Visible on the public blog post                  |
| `rejected` | Rejected | Moderated out; visible to admins for audit trail |
