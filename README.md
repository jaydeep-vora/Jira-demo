# Jira Application

A scalable task management API built with Express.js, featuring JWT authentication, AES-256-GCM payload encryption, real-time Socket.IO events, GraphQL queries, and CSV bulk import. Supports both monolith and Docker Compose microservice deployments from a single codebase.

## Features

- ✅ User registration and login with JWT token-based authentication
- ✅ Password hashing with bcrypt
- ✅ AES-256-GCM request/response payload encryption
- ✅ Task CRUD with real-time Socket.IO events
- ✅ CSV bulk upload — import multiple tasks from a `.csv` file
- ✅ GraphQL read-only query endpoint with filtering
- ✅ Input validation with express-validator
- ✅ API rate limiting (100 req/hr per IP)
- ✅ Sequelize ORM with PostgreSQL
- ✅ Microservice-ready via Docker Compose (gateway → auth + task services)
- ✅ Graceful shutdown and error handling

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
│   └── taskController.js     # Task CRUD, CSV upload + Socket.IO events
│
├── routes/
│   ├── index.js              # Mounts auth + task routers, health check
│   ├── authRoutes.js         # /api/auth/*
│   └── taskRoutes.js         # /api/tasks/* (all protected)
│
├── middleware/
│   ├── auth.js               # JWT verification + user lookup
│   ├── encryption.js         # AES-256-GCM request decrypt / response encrypt
│   ├── errorHandler.js       # Sequelize + Multer aware error handler
│   ├── rateLimiter.js        # 100 req/hr per IP
│   ├── upload.js             # Multer config for CSV file uploads
│   └── validation.js         # express-validator rules for register/login
│
├── graphql/
│   └── schema.js             # GraphQL schema + task query resolver
│
├── utils/
│   ├── crypto.js             # AES-256-GCM encrypt/decrypt helpers
│   ├── csvParser.js          # CSV parsing and row validation for task import
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
├── docker-compose.yml
├── architecture.md
└── package.json
```

## Prerequisites

- Node.js (v14 or higher)
- PostgreSQL (v12 or higher)
- npm or yarn

## Installation

1. **Clone the repository and navigate to the project directory**

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up environment variables**
   ```bash
   cp .env.example .env
   ```
   Edit `.env` and configure the values (see [Environment Variables](#environment-variables) below).

4. **Create PostgreSQL database**
   ```bash
   createdb jira_app
   ```
   Or using psql:
   ```sql
   CREATE DATABASE jira_app;
   ```

5. **Start the server**
   ```bash
   # Development mode (with nodemon, auto-syncs DB schema)
   npm run dev

   # Production mode
   npm start
   ```

## Docker (Gateway + Microservices)

The single codebase runs as three services behind a gateway via Docker Compose:

| Service   | Port | Role |
|-----------|------|------|
| `gateway` | 3000 | Stateless HTTP reverse proxy (public entry point) |
| `auth`    | 3001 | Registration, login, profile. Owns DB schema sync |
| `task`    | 3002 | Task CRUD and CSV upload |
| `db`      | 5432 | PostgreSQL 16 Alpine with persistent volume |

### Run with Compose

1. Create a `.env` file with at minimum:
   - `DB_NAME`, `DB_USER`, `DB_PASSWORD`
   - `JWT_SECRET`
   - `AES_SECRET_KEY`

2. Start:
   ```bash
   docker compose up --build
   ```

3. Verify:
   ```bash
   # Gateway health
   curl http://localhost:3000/api/health

   # Login (proxied to auth service)
   curl -X POST http://localhost:3000/api/auth/login \
     -H "Content-Type: application/json" \
     -d '{"email":"john@example.com","password":"SecurePass123"}'

   # List tasks (proxied to task service)
   curl http://localhost:3000/api/tasks \
     -H "Authorization: Bearer <token>"
   ```

## API Endpoints

> **Note:** All responses are AES-256-GCM encrypted by default. To receive plaintext JSON, include the header `X-No-Encrypt-Response: 1`.

### Authentication

#### Register User
```http
POST /api/auth/register
Content-Type: application/json

{
  "username": "johndoe",
  "email": "john@example.com",
  "password": "SecurePass123",
  "firstName": "John",
  "lastName": "Doe"
}
```

**Response (201):**
```json
{
  "success": true,
  "message": "User registered successfully",
  "data": {
    "user": {
      "id": "uuid",
      "username": "johndoe",
      "email": "john@example.com",
      "firstName": "John",
      "lastName": "Doe",
      "isActive": true,
      "createdAt": "2024-01-01T00:00:00.000Z",
      "updatedAt": "2024-01-01T00:00:00.000Z"
    },
    "token": "jwt_token_here"
  }
}
```

#### Login
```http
POST /api/auth/login
Content-Type: application/json

{
  "email": "john@example.com",
  "password": "SecurePass123"
}
```

**Response (200):**
```json
{
  "success": true,
  "message": "Login successful",
  "data": {
    "user": {
      "id": "uuid",
      "username": "johndoe",
      "email": "john@example.com",
      "firstName": "John",
      "lastName": "Doe",
      "isActive": true
    },
    "token": "jwt_token_here"
  }
}
```

#### Get Profile (Protected)
```http
GET /api/auth/profile
Authorization: Bearer <token>
```

### Tasks (Protected)

All task endpoints require a valid JWT in the `Authorization` header.

#### Create Task
```http
POST /api/tasks
Content-Type: application/json
Authorization: Bearer <token>

{
  "title": "Implement login page",
  "description": "Create UI and hook up API",
  "status": "todo",
  "priority": "high",
  "dueDate": "2026-03-31",
  "assigneeId": "optional-user-uuid"
}
```

| Field | Type | Required | Default | Values |
|-------|------|----------|---------|--------|
| `title` | string | Yes | — | 1–255 characters |
| `description` | string | No | `null` | — |
| `status` | string | No | `todo` | `todo`, `in_progress`, `done` |
| `priority` | string | No | `medium` | `low`, `medium`, `high` |
| `dueDate` | string | No | `null` | ISO date |
| `assigneeId` | UUID | No | current user | — |

#### List All Tasks
```http
GET /api/tasks
Authorization: Bearer <token>
```

#### Get Task by ID
```http
GET /api/tasks/:id
Authorization: Bearer <token>
```

#### Update Task
```http
PUT /api/tasks/:id
Content-Type: application/json
Authorization: Bearer <token>

{
  "title": "Updated title",
  "status": "in_progress"
}
```

#### Delete Task
```http
DELETE /api/tasks/:id
Authorization: Bearer <token>
```

#### Bulk Upload Tasks via CSV
```http
POST /api/tasks/upload
Content-Type: multipart/form-data
Authorization: Bearer <token>

Form field: file=@tasks.csv
```

Upload a `.csv` file to create multiple tasks at once. The file is parsed, validated row-by-row, and all valid tasks are inserted in a single database transaction.

**Constraints:**
- File must be `.csv` with MIME type `text/csv` or `application/vnd.ms-excel`
- Maximum file size: 2 MB
- Maximum rows: 500

**CSV Format** (header row required):

```csv
title,description,status,priority,dueDate,assigneeId
Build login page,Implement OAuth flow,todo,high,2025-02-01,
Fix navbar bug,Dropdown not closing,in_progress,medium,,
Write unit tests,,todo,low,,
```

| Column | Required | Default | Values |
|--------|----------|---------|--------|
| `title` | Yes | — | 1–255 characters |
| `description` | No | `null` | — |
| `status` | No | `todo` | `todo`, `in_progress`, `done` |
| `priority` | No | `medium` | `low`, `medium`, `high` |
| `dueDate` | No | `null` | Any parseable date string |
| `assigneeId` | No | current user | UUID |

**Example with curl:**
```bash
curl -X POST http://localhost:3000/api/tasks/upload \
  -H "Authorization: Bearer <token>" \
  -F "file=@tasks.csv"
```

**Response (201):**
```json
{
  "success": true,
  "message": "3 task(s) created successfully",
  "data": {
    "created": 3,
    "tasks": [ ... ],
    "skippedErrors": [
      "Row 5: title is required",
      "Row 8: invalid status \"pending\". Must be one of: todo, in_progress, done"
    ]
  }
}
```

- Valid rows are inserted; invalid rows are skipped and reported in `skippedErrors`.
- If **no** valid rows exist, the endpoint returns `400` with the list of errors.
- The insert is atomic — if the database rejects any row, the entire batch is rolled back.

### GraphQL (Monolith Only)

Endpoint: `GET/POST /graphql` (GraphiQL UI enabled in non-production)

```graphql
query {
  tasks(filter: { status: "todo", priority: "high" }) {
    id
    title
    description
    status
    priority
    dueDate
    userId
    assigneeId
    createdAt
  }
}
```

**Filter fields:** `status`, `priority`, `userId`, `assigneeId` (all optional).

### Health Check
```http
GET /api/health
```

## Real-Time Updates (Socket.IO)

Available in **monolith mode only**. Socket.IO is attached to the HTTP server on the same port as the API.

### Emitted Events

| Event | Payload | Trigger |
|-------|---------|---------|
| `task:created` | `{ task: Task }` | Task created (single or each row in CSV upload) |
| `task:updated` | `{ task: Task }` | Task updated |
| `task:deleted` | `{ id: string }` | Task deleted |

### Client Example

```js
import { io } from 'socket.io-client';

const socket = io('http://localhost:3000', {
  transports: ['websocket']
});

socket.on('connect', () => console.log('Connected:', socket.id));

socket.on('task:created', ({ task }) => {
  console.log('New task:', task);
});

socket.on('task:updated', ({ task }) => {
  console.log('Updated task:', task);
});

socket.on('task:deleted', ({ id }) => {
  console.log('Deleted task:', id);
});
```

## Environment Variables

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `PORT` | No | `3000` | HTTP server port |
| `NODE_ENV` | No | `development` | `development` or `production` |
| `DB_HOST` | Yes | — | PostgreSQL host |
| `DB_PORT` | Yes | `5432` | PostgreSQL port |
| `DB_NAME` | Yes | `jira_app` | Database name |
| `DB_USER` | Yes | `jira_user` | Database user |
| `DB_PASSWORD` | Yes | — | Database password |
| `JWT_SECRET` | Yes | — | Secret for signing JWT tokens |
| `JWT_EXPIRES_IN` | No | `1h` | JWT token expiration |
| `AES_SECRET_KEY` | Yes | — | Secret for AES-256-GCM encryption |
| `DB_SYNC` | No | — | Set `true` to sync DB schema on startup (Docker) |
| `DB_SYNC_ALTER` | No | — | Set `true` for `ALTER`-mode schema sync |
| `AUTH_SERVICE_URL` | No | `http://auth:3001` | Gateway → auth service URL |
| `TASK_SERVICE_URL` | No | `http://task:3002` | Gateway → task service URL |

## Security Features

| Layer | Implementation |
|-------|---------------|
| **Password hashing** | bcrypt with 10 salt rounds via Sequelize hooks |
| **Authentication** | JWT tokens with configurable expiry; middleware verifies token and confirms user is active |
| **Payload encryption** | AES-256-GCM on all request/response bodies (opt-out via `X-No-Encrypt-Response: 1`) |
| **Rate limiting** | 100 requests/hour per IP on `/api` routes |
| **Input validation** | express-validator on auth routes; CSV row-level validation on upload |
| **File upload safety** | Extension + MIME type check, 2 MB size limit, 500-row cap, memory-only storage |
| **SQL injection protection** | Sequelize ORM parameterized queries |
| **CORS** | Enabled for cross-origin requests |

## Development

### Adding New Models

1. Create model file in `models/`
2. Import and register in `models/index.js`
3. Define associations if needed

### Adding New Routes

1. Create route file in `routes/`
2. Create corresponding controller in `controllers/`
3. Register route in `routes/index.js`

### Adding Middleware

1. Create middleware file in `middleware/`
2. Import and use in `app.js` or specific route files

## License

ISC
