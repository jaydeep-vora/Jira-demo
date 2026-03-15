# Jira Application

A scalable Express.js application with JWT authentication, Sequelize ORM, and PostgreSQL database.

## Features

- ✅ User registration and login
- ✅ JWT token-based authentication
- ✅ Password hashing with bcrypt
- ✅ Input validation with express-validator
- ✅ Sequelize ORM for database operations
- ✅ PostgreSQL database support
- ✅ Scalable project structure
- ✅ Error handling middleware
- ✅ CORS support
- ✅ Task CRUD with real-time socket events

## Project Structure

```
Jira/
├── config/           # Configuration files
│   └── database.js   # Sequelize database configuration
├── controllers/      # Request handlers
│   └── authController.js
├── middleware/       # Custom middleware
│   ├── auth.js       # JWT authentication middleware
│   ├── validation.js # Input validation rules
│   └── errorHandler.js
├── models/          # Sequelize models
│   ├── User.js
│   ├── Task.js
│   └── index.js
├── routes/          # API routes
│   ├── authRoutes.js
│   ├── taskRoutes.js
│   └── index.js
├── utils/           # Utility functions
│   └── jwt.js       # JWT token utilities
├── socket.js        # Socket.IO initialization and access
├── app.js           # Express app configuration
├── server.js        # Server entry point
├── .env.example     # Environment variables template
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
   Edit `.env` and update the following:
   - Database credentials (DB_HOST, DB_PORT, DB_NAME, DB_USER, DB_PASSWORD)
   - JWT_SECRET (use a strong secret key)
   - PORT (optional, defaults to 3000)

4. **Create PostgreSQL database**
   ```bash
   createdb jira_db
   ```
   Or using psql:
   ```sql
   CREATE DATABASE jira_db;
   ```

5. **Start the server**
   ```bash
   # Development mode (with nodemon)
   npm run dev

   # Production mode
   npm start
   ```

## API Endpoints

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

**Response:**
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

**Response:**
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

**Response:**
```json
{
  "success": true,
  "data": {
    "user": {
      "id": "uuid",
      "username": "johndoe",
      "email": "john@example.com",
      "firstName": "John",
      "lastName": "Doe",
      "isActive": true
    }
  }
}
```

### Health Check
```http
GET /api/health
```

### Tasks (Protected)

All task endpoints require a valid JWT in the `Authorization` header:

`Authorization: Bearer <token>`

#### Create Task
```http
POST /api/tasks
Content-Type: application/json
Authorization: Bearer <token>

{
  "title": "Implement login page",
  "description": "Create UI and hook up API",
  "status": "todo",          // optional: todo | in_progress | done
  "priority": "high",        // optional: low | medium | high
  "dueDate": "2026-03-31"    // optional ISO date
}
```

#### Get All Tasks for Current User
```http
GET /api/tasks
Authorization: Bearer <token>
```

#### Get Single Task
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
  "description": "Updated description",
  "status": "in_progress",
  "priority": "medium",
  "dueDate": "2026-04-01"
}
```

#### Delete Task
```http
DELETE /api/tasks/:id
Authorization: Bearer <token>
```

## Real-time Updates (Socket.IO)

The server exposes a Socket.IO endpoint on the same origin/port as the API.

### Client Example (JavaScript)

```js
import { io } from 'socket.io-client';

const socket = io('http://localhost:3000', {
  transports: ['websocket']
});

socket.on('connect', () => {
  console.log('Connected to socket server', socket.id);
});

socket.on('task:created', (payload) => {
  console.log('Task created', payload.task);
  // update UI list
});

socket.on('task:updated', (payload) => {
  console.log('Task updated', payload.task);
  // update UI list / detail
});

socket.on('task:deleted', (payload) => {
  console.log('Task deleted', payload.id);
  // remove from UI list
});
```

### Emitted Events

- `task:created` — when a task is created
  - Payload: `{ task: Task }`
- `task:updated` — when a task is updated
  - Payload: `{ task: Task }`
- `task:deleted` — when a task is deleted
  - Payload: `{ id: string }`

## Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| PORT | Server port | 3000 |
| NODE_ENV | Environment (development/production) | development |
| DB_HOST | PostgreSQL host | localhost |
| DB_PORT | PostgreSQL port | 5432 |
| DB_NAME | Database name | jira_db |
| DB_USER | Database user | postgres |
| DB_PASSWORD | Database password | - |
| JWT_SECRET | Secret key for JWT | - |
| JWT_EXPIRES_IN | JWT expiration time | 7d |

## Security Features

- Passwords are hashed using bcrypt with salt rounds
- JWT tokens for stateless authentication
- Input validation on all user inputs
- SQL injection protection via Sequelize ORM
- CORS enabled for cross-origin requests
- Environment variables for sensitive data

## Future Expansion

The project structure is designed to easily accommodate:

- Additional models (Projects, Tasks, Comments, etc.)
- More authentication features (password reset, email verification)
- Role-based access control (RBAC)
- File upload functionality
- API rate limiting
- Logging and monitoring
- Testing suite
- Database migrations using Sequelize CLI

## Development

### Adding New Models

1. Create model file in `models/` directory
2. Import and register in `models/index.js`
3. Define associations if needed

### Adding New Routes

1. Create route file in `routes/` directory
2. Create corresponding controller in `controllers/` directory
3. Register route in `routes/index.js`

### Adding Middleware

1. Create middleware file in `middleware/` directory
2. Import and use in `app.js` or specific routes

## License

ISC
