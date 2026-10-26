# Layered Backend Architecture (Node.js + Express + TypeScript)

A production-grade, modular, layered backend architecture designed for scalability, testability, and clear separation of concerns.

---

## 🏗️ Directory Structure Overview

```text
server/
├── .env.example
├── .gitignore
├── package.json
├── tsconfig.json
├── README.md
└── src/
    ├── app.ts                  # Express application setup & middleware assembly
    ├── index.ts                # Server entry point & graceful shutdown
    │
    ├── 📁 config/              # App & database configuration
    │   ├── env.ts              # Zod-validated environment variables
    │   ├── database.ts         # Database connection client stub
    │   └── index.ts
    │
    ├── 🛣️ routes/              # API endpoints & route mounting
    │   ├── health.routes.ts    # Health check routes
    │   ├── user.routes.ts      # User resource routes
    │   └── index.ts            # Root API router (/api/v1)
    │
    ├── 🎮 controllers/         # Handle HTTP requests & responses
    │   ├── health.controller.ts
    │   ├── user.controller.ts
    │   └── index.ts
    │
    ├── ⚙️ services/            # Pure domain & business logic
    │   ├── user.service.ts
    │   └── index.ts
    │
    ├── 🗄️ models/              # Database schemas & data access layer
    │   ├── user.model.ts       # Entities & database repository
    │   └── index.ts
    │
    ├── 🛡️ middleware/          # Authentication & request processing
    │   ├── auth.middleware.ts  # Token auth & RBAC permissions
    │   ├── error.middleware.ts # Centralized error handler
    │   ├── requestLogger.middleware.ts
    │   └── index.ts
    │
    ├── ✅ validators/          # Input validation schemas & runner
    │   ├── user.validator.ts   # Zod request schemas (body, query, params)
    │   ├── validate.ts         # Generic validation middleware
    │   └── index.ts
    │
    └── 🔧 utils/               # Reusable helper functions & abstractions
        ├── apiResponse.ts      # Standardized JSON response envelope
        ├── appError.ts         # Operational error class with status codes
        ├── logger.ts           # Structured logging utility
        └── index.ts
```

---

## 🔄 Request Lifecycle Flow

Every request travels through a predictable, unidirectional pipeline:

```text
HTTP Request
     │
     ▼
[🛡️ Middleware]   ───▶  Request Logger, Helmet, CORS, Rate Limiter
     │
     ▼
[🛣️ Routes]       ───▶  Matches route path & HTTP verb (e.g. POST /api/v1/users)
     │
     ▼
[🛡️ Middleware]   ───▶  Auth / RBAC verification (requireAuth)
     │
     ▼
[✅ Validators]   ───▶  Zod schema validation (body, query, params)
     │                   └─▶ 400 Bad Request on invalid payload
     ▼
[🎮 Controller]   ───▶  Extracts parameters, calls Service, sends formatted response
     │
     ▼
[⚙️ Service]      ───▶  Executes business rules, hashing, validations
     │
     ▼
[🗄️ Model / DB]   ───▶  Interacts with Prisma/Drizzle/PostgreSQL/Supabase
     │
     ▼
[🔧 Utils]        ───▶  sendSuccess() formats standard JSON response
     │
     ▼
HTTP Response 200/201 (or [🛡️ Error Middleware] on exception)
```

---

## 📂 Responsibilities of Each Layer

| Layer | Responsibility | Do | Don't |
| :--- | :--- | :--- | :--- |
| **📁 config/** | Environment variables, third-party clients, database setups | Validate all env vars with Zod on boot | Never use `process.env` directly outside this folder |
| **🛣️ routes/** | Map endpoints to middleware, validators, and controllers | Keep routes clean and declarative | Never put business logic or response formatting in routes |
| **🎮 controllers/** | HTTP protocol adapter (req, res, next) | Extract input, call service, return standard response | Never write SQL or database queries here |
| **⚙️ services/** | Domain rules, workflow coordination, business calculations | Throw `AppError` when rules fail | Never touch `req` or `res` objects (framework agnostic) |
| **🗄️ models/** | Database schemas, entities, and data access queries | Encapsulate ORM/SQL queries and table interfaces | Don't perform business-level validation here |
| **🛡️ middleware/** | Cross-cutting concerns (Auth, Logging, Error handling) | Intercept requests and forward with `next()` | Avoid domain-specific business rules |
| **✅ validators/** | Input shape and constraints | Use strict schemas for params, queries, and bodies | Don't query database during synchronous schema validation |
| **🔧 utils/** | Shared, stateless helper utilities | Pure functions, formatters, standard error classes | Avoid storing application state |

---

## 🚀 Quickstart Guide

### 1. Install Dependencies
```bash
cd server
npm install
```

### 2. Configure Environment
Copy the example environment file:
```bash
cp .env.example .env
```

### 3. Run Development Server
```bash
npm run dev
```

### 4. Build & Production Run
```bash
npm run build
npm start
```

---

## 📡 Included Starter Endpoints

### 🔐 Authentication (`/api/v1/auth`)

| Method | Endpoint | Description | Auth Required | Validation |
| :--- | :--- | :--- | :---: | :---: |
| `POST` | `/api/v1/auth/register` | Register user & issue tokens | No | `email`, `password` (8+ chars, upper, num), `name` |
| `POST` | `/api/v1/auth/login` | Login & return access/refresh tokens | No | `email`, `password` |
| `POST` | `/api/v1/auth/refresh` | Rotate & issue new access token | No | `refreshToken` in body |
| `GET` | `/api/v1/auth/me` | Fetch authenticated user profile | **Yes** (Bearer) | None |
| `POST` | `/api/v1/auth/logout` | Revoke user refresh token | **Yes** (Bearer) | None |

### 👥 Users (`/api/v1/users`)

| Method | Endpoint | Description | Auth Required | Validation |
| :--- | :--- | :--- | :---: | :---: |
| `GET` | `/api/v1/users` | List all users (sanitized) | No | None |
| `GET` | `/api/v1/users/:id` | Get user by ID | No | `id` in params |
| `POST` | `/api/v1/users` | Create new user | No | `email`, `name`, `role` in body |
| `PUT` | `/api/v1/users/:id` | Update user | **Yes** (Bearer) | `id` in params, body |
| `DELETE` | `/api/v1/users/:id` | Delete user | **Yes** (Bearer) | `id` in params |

### 🩺 Health (`/api/v1/health`)

| Method | Endpoint | Description | Auth Required | Validation |
| :--- | :--- | :--- | :---: | :---: |
| `GET` | `/api/v1/health` | System status, uptime & version | No | None |

