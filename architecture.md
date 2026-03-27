# Architecture

## Overview

A Jira-like task management API built with Node.js and Express. It exposes both REST and GraphQL endpoints, supports real-time events via Socket.IO, and encrypts all HTTP payloads with AES-256-GCM. The project is a **single codebase** that supports two deployment modes: a traditional monolith and a Docker Compose–based microservices setup.

## Tech Stack

| Layer            | Technology                        |
| ---------------- | --------------------------------- |
| Runtime          | Node.js 20                        |
| Framework        | Express 4                         |
| Database         | PostgreSQL 16                     |
| ORM              | Sequelize 6                       |
| Authentication   | JWT (`jsonwebtoken`) + bcryptjs   |
| Encryption       | AES-256-GCM (`node:crypto`)       |
| Real-time        | Socket.IO 4                       |
| API              | REST + GraphQL (`express-graphql`)|
| Validation       | express-validator                 |
| Rate Limiting    | express-rate-limit                |
| Reverse Proxy    | http-proxy-middleware              |
| Containerization | Docker + Docker Compose           |

## Project Structure

```
Jira/
├── app.js                    # Express app (monolith)
├── server.js                 # Monolith entry point (HTTP + Socket.IO + DB sync)
├── socket.js                 # Socket.IO initialization and accessor
│
├── config/
│   └── database.js           # Sequelize instance + connection test
│
├── models/
│   ├── index.js              # Model registry, associations, syncModels()
│   ├── User.js               # User model (bcrypt hooks, toJSON)
│   └── Task.js               # Task model (status/priority enums)
│
├── controllers/
│   ├── authController.js     # Register, login, profile, list users
│   └── taskController.js     # Task CRUD + Socket.IO event emission
│
├── routes/
│   ├── index.js              # Mounts auth + task routers, health check
│   ├── authRoutes.js         # /api/auth/*
│   └── taskRoutes.js         # /api/tasks/* (all protected)
│
├── middleware/
│   ├── auth.js               # JWT verification + user lookup
│   ├── encryption.js         # AES-256-GCM request decrypt / response encrypt
│   ├── errorHandler.js       # Sequelize-aware error handler
│   ├── rateLimiter.js        # 100 req/hr per IP
│   └── validation.js         # express-validator rules for register/login
│
├── graphql/
│   └── schema.js             # GraphQL schema + task query resolver
│
├── utils/
│   ├── crypto.js             # AES-256-GCM encrypt/decrypt helpers
│   └── jwt.js                # Token generation and verification
│
├── services/                 # Microservice entry points (reuse shared code)
│   ├── gateway/
│   │   ├── app.js            # HTTP reverse proxy (no DB, no body parsing)
│   │   └── server.js         # Gateway server on port 3000
│   ├── auth/
│   │   ├── app.js            # Auth-only Express app
│   │   └── server.js         # Auth server on port 3001
│   └── task/
│       ├── app.js            # Task-only Express app
│       └── server.js         # Task server on port 3002
│
├── Dockerfile.gateway
├── Dockerfile.auth
├── Dockerfile.task
└── docker-compose.yml
```

> **Key insight:** The `services/` directory does not duplicate code. Each microservice entry point imports the shared models, controllers, routes, and middleware from the root via relative paths (`../../models`, `../../middleware/...`, etc.).

## Deployment Modes

### Monolith

Entry point: `server.js` → `app.js`

A single Node.js process on port 3000 that serves all routes, the GraphQL endpoint, and Socket.IO.

```
Client ──▶ :3000 ──▶ Express app (all routes, GraphQL, Socket.IO)
                         │
                         ▼
                     PostgreSQL
```

- Auto-syncs the DB schema in non-production (`alter: true`).
- Socket.IO attached to the HTTP server for real-time task events.
- GraphQL endpoint available at `/graphql` (GraphiQL enabled in non-production).

### Microservices (Docker Compose)

Four containers orchestrated by `docker-compose.yml`:

```
                        ┌──────────────┐
                        │   Client     │
                        └──────┬───────┘
                               │
                          :3000 (public)
                               │
                     ┌─────────▼──────────┐
                     │      Gateway       │
                     │  (reverse proxy)   │
                     │  No DB, no body    │
                     │  parsing           │
                     └────┬──────────┬────┘
                          │          │
            /api/auth/*   │          │  /api/tasks/*
                          │          │
                ┌─────────▼──┐  ┌───▼───────────┐
                │    Auth    │  │     Task       │
                │   :3001   │  │    :3002       │
                │ DB_SYNC=  │  │ DB_SYNC=       │
                │  true     │  │  false         │
                └─────┬──────┘  └───┬───────────┘
                      │             │
                      └──────┬──────┘
                             │
                    ┌────────▼────────┐
                    │   PostgreSQL    │
                    │    :5432       │
                    │  (shared DB)   │
                    └─────────────────┘
```

| Service   | Port | Role                                                                 |
| --------- | ---- | -------------------------------------------------------------------- |
| `gateway` | 3000 | Stateless HTTP reverse proxy. Proxies `/api/auth/*` and `/api/tasks/*` to downstream services. |
| `auth`    | 3001 | Handles registration, login, profile, and user listing. Owns DB schema sync. |
| `task`    | 3002 | Handles task CRUD. Relies on auth service having already synced the schema. |
| `db`      | 5432 | PostgreSQL 16 Alpine with a persistent volume and a health check.    |

**Notable differences from monolith mode:**
- **No GraphQL** — the GraphQL endpoint is only mounted in the monolith `app.js`.
- **No Socket.IO** — real-time events are monolith-only. The task controller gracefully catches Socket errors so the same code works in both modes.
- **Gateway is transparent** — it does not parse bodies or apply encryption; each downstream service applies its own full middleware stack.

## Request Lifecycle (Middleware Pipeline)

The middleware executes in this order for the monolith (microservices follow the same order within each service):

```
Request
  │
  ▼
cors()
  │
  ▼
express.json() + urlencoded
  │
  ▼
decryptRequestBody          ← If body is { payload: "<base64>" }, AES-decrypts
  │                           and replaces req.body with parsed JSON
  ▼
encryptResponseBody         ← Monkey-patches res.json() to AES-encrypt all
  │                           outgoing JSON (opt-out via X-No-Encrypt-Response: 1)
  ▼
Dev logging (NODE_ENV=development only)
  │
  ▼
apiLimiter on /api          ← 100 requests/hour per IP
  │
  ▼
Route handlers              ← Auth routes (some public, some protected)
  │                           Task routes (all JWT-protected)
  ▼
GraphQL /graphql            ← (monolith only)
  │
  ▼
404 catch-all
  │
  ▼
errorHandler                ← Sequelize-aware, returns structured JSON
```

## Data Model

### User

| Field      | Type        | Constraints                              |
| ---------- | ----------- | ---------------------------------------- |
| `id`       | UUID (v4)   | Primary key, auto-generated              |
| `username` | STRING      | Unique, 3–30 chars, alphanumeric + `_`   |
| `email`    | STRING      | Unique, valid email                      |
| `password` | STRING      | 6–100 chars, hashed via bcrypt hooks     |
| `firstName`| STRING      | Optional, max 50 chars                   |
| `lastName` | STRING      | Optional, max 50 chars                   |
| `isActive` | BOOLEAN     | Default `true`                           |

- Password is automatically hashed with bcrypt (salt rounds 10) on create and update via Sequelize hooks.
- `toJSON()` strips the password field from serialized output.

### Task

| Field        | Type                               | Constraints               |
| ------------ | ---------------------------------- | ------------------------- |
| `id`         | UUID (v4)                          | Primary key               |
| `title`      | STRING                             | Required, 1–255 chars     |
| `description`| TEXT                               | Optional                  |
| `status`     | ENUM(`todo`, `in_progress`, `done`)| Default `todo`            |
| `priority`   | ENUM(`low`, `medium`, `high`)      | Default `medium`          |
| `dueDate`    | DATE                               | Optional                  |
| `userId`     | UUID (FK → User)                   | Required (creator)        |
| `assigneeId` | UUID (FK → User)                   | Optional (assignee)       |

### Relationships

```
┌────────┐         userId (creator)        ┌────────┐
│        │ ◄──────────────────────────────  │        │
│  User  │  1 ──────────────────────── ∞   │  Task  │
│        │ ◄──────────────────────────────  │        │
└────────┘       assigneeId (assignee)      └────────┘
```

- `User.hasMany(Task, { foreignKey: 'userId', as: 'createdTasks' })`
- `User.hasMany(Task, { foreignKey: 'assigneeId', as: 'assignedTasks' })`
- `Task.belongsTo(User, { foreignKey: 'userId', as: 'creator' })`
- `Task.belongsTo(User, { foreignKey: 'assigneeId', as: 'assignee' })`

## API Layer

### REST Endpoints

#### Authentication (`/api/auth`)

| Method | Path                | Auth     | Description            |
| ------ | ------------------- | -------- | ---------------------- |
| POST   | `/api/auth/register`| Public   | Register a new user    |
| POST   | `/api/auth/login`   | Public   | Login, returns JWT     |
| GET    | `/api/auth/profile` | JWT      | Get current user       |
| GET    | `/api/auth/users`   | Public   | List all users         |

#### Tasks (`/api/tasks`)

| Method | Path              | Auth | Description          |
| ------ | ----------------- | ---- | -------------------- |
| POST   | `/api/tasks`      | JWT  | Create a task        |
| GET    | `/api/tasks`      | JWT  | List all tasks       |
| GET    | `/api/tasks/:id`  | JWT  | Get task by ID       |
| PUT    | `/api/tasks/:id`  | JWT  | Update a task        |
| DELETE | `/api/tasks/:id`  | JWT  | Delete a task        |

#### Utility

| Method | Path          | Description       |
| ------ | ------------- | ----------------- |
| GET    | `/api/health` | Health check      |
| GET    | `/`           | Welcome message   |

### GraphQL (Monolith Only)

Endpoint: `/graphql` (GraphiQL UI enabled in non-production)

```graphql
type Query {
  tasks(filter: TaskFilterInput): [Task!]!
}

input TaskFilterInput {
  status: String
  priority: String
  userId: ID
  assigneeId: ID
}
```

Read-only query for tasks with optional filtering by status, priority, creator, or assignee.

## Authentication & Security

The application employs five security layers:

### 1. Password Hashing
Bcrypt with 10 salt rounds, applied automatically via Sequelize `beforeCreate` and `beforeUpdate` hooks. Passwords are never stored or returned in plaintext.

### 2. JWT Authentication
- Tokens issued on login/register with configurable expiry (`JWT_EXPIRES_IN`, default 1h).
- Middleware extracts from `Authorization: Bearer <token>`, verifies signature, and confirms the user still exists and is active in the DB.
- Distinct error responses for missing token, invalid token, and expired token.

### 3. AES-256-GCM Payload Encryption
- Full request/response encryption using AES-256-GCM with random 12-byte IVs.
- Key derived by SHA-256 hashing `AES_SECRET_KEY` to 32 bytes.
- Encrypted payloads are base64-encoded as `{ payload: "<base64>" }`.
- Clients opt out of response encryption with the `X-No-Encrypt-Response: 1` header.

### 4. Rate Limiting
100 requests per hour per IP address on all `/api` routes via `express-rate-limit`.

### 5. Input Validation
`express-validator` rules for registration (username format, email, password strength) and login (email format, password presence).

## Real-Time Events (Socket.IO)

Available in **monolith mode only**. Socket.IO is attached to the HTTP server with open CORS (`origin: *`).

| Event            | Payload            | Trigger         |
| ---------------- | ------------------ | --------------- |
| `task:created`   | `{ task: {...} }`  | Task creation   |
| `task:updated`   | `{ task: {...} }`  | Task update     |
| `task:deleted`   | `{ id: "..." }`    | Task deletion   |

The task controller wraps all `io.emit()` calls in try/catch blocks, so the same controller code works in microservice mode (where Socket.IO is not initialized) without throwing errors.

## Environment Variables

| Variable           | Required | Default       | Description                                      |
| ------------------ | -------- | ------------- | ------------------------------------------------ |
| `PORT`             | No       | `3000`        | HTTP server port                                 |
| `NODE_ENV`         | No       | `development` | Environment (`development` / `production`)       |
| `DB_HOST`          | Yes      | —             | PostgreSQL host                                  |
| `DB_PORT`          | Yes      | —             | PostgreSQL port                                  |
| `DB_NAME`          | Yes      | `jira_app`    | Database name                                    |
| `DB_USER`          | Yes      | `jira_user`   | Database user                                    |
| `DB_PASSWORD`      | Yes      | —             | Database password                                |
| `JWT_SECRET`       | Yes      | —             | Secret for signing JWT tokens                    |
| `JWT_EXPIRES_IN`   | No       | `1h`          | JWT token expiration                             |
| `AES_SECRET_KEY`   | Yes      | —             | Secret for AES-256-GCM encryption                |
| `DB_SYNC`          | No       | —             | Set `true` to sync DB schema on startup (Docker) |
| `DB_SYNC_ALTER`    | No       | —             | Set `true` for `alter` mode schema sync          |
| `AUTH_SERVICE_URL`  | No      | `http://auth:3001`  | Gateway → auth service URL              |
| `TASK_SERVICE_URL`  | No      | `http://task:3002`  | Gateway → task service URL              |

## Key Design Decisions

1. **Single codebase, dual deployment** — Microservices reuse the same models, controllers, routes, and middleware via relative imports rather than being separate repositories.

2. **Shared database** — All services connect to the same PostgreSQL instance and database. There is no service-level data isolation.

3. **Auth owns schema migration** — Only the auth service runs `syncModels()` in Docker (`DB_SYNC=true`). The task service depends on the auth service having already created the tables.

4. **Transparent encryption** — The encryption middleware wraps `res.json()` so all JSON responses are encrypted by default. This is transparent to controllers.

5. **Graceful Socket.IO degradation** — The task controller wraps Socket.IO calls in try/catch, allowing the same controller to work in both monolith (Socket available) and microservice (Socket unavailable) modes without code changes.

6. **Stateless gateway** — The gateway container has no database connection, no body parsing, and no encryption middleware. It transparently proxies raw HTTP requests to downstream services.
