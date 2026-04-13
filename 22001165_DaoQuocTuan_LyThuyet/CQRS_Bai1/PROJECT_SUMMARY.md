# CQRS Bài 1 - Project Files Summary

## 📦 Project Structure

```
CQRS_Bai1/
│
├── 📋 Configuration Files
│   ├── package.json              # npm dependencies & scripts
│   ├── tsconfig.json             # TypeScript configuration
│   └── .gitignore                # Git ignore rules
│
├── 📚 Documentation Files
│   ├── README.md                 # Project overview & requirements
│   ├── ARCHITECTURE.md           # CQRS pattern detailed explanation
│   ├── API_TESTING_GUIDE.md      # How to test API with examples
│   ├── QUICK_START.md            # Getting started guide
│   └── PROJECT_SUMMARY.md        # This file
│
└── 💻 Source Code (src/)
    ├── index.ts                  # Server entry point
    ├── app.ts                    # Express app setup
    │
    ├── models/
    │   └── index.ts              # Models & interfaces
    │                            # - TodoEntity (Write Model)
    │                            # - TodoView (Read Model)
    │                            # - Command DTOs
    │
    ├── services/
    │   ├── CommandService.ts    # Write operations
    │   │                        # • createTodo()
    │   │                        # • updateTodo()
    │   │                        # • deleteTodo()
    │   │
    │   └── QueryService.ts      # Read operations
    │                            # • getAllTodos()
    │                            # • getTodoById()
    │                            # • getStatistics()
    │
    ├── controllers/
    │   └── TodoController.ts    # HTTP request handlers
    │                            # Orchestrates services
    │
    └── routes/
        └── todoRoutes.ts        # API routes definition
```

## 📄 File Descriptions

### Configuration Files

#### package.json
- Project metadata (name, version, description)
- Dependencies: express, uuid
- Dev dependencies: TypeScript, ts-node, type definitions
- Scripts: build, start, dev

#### tsconfig.json
- Target: ES2020
- Module: commonjs
- Output: dist/
- Strict mode enabled

#### .gitignore
- Ignores: node_modules/, dist/, logs, .env, etc.

### Documentation Files

#### README.md
- **Purpose**: Comprehensive project overview
- **Contents**:
  - CQRS architecture explanation
  - Project structure
  - Requirements fulfillment checklist
  - API endpoints documentation
  - Installation & running instructions
  - CQRS advantages
  - Future improvements

#### ARCHITECTURE.md
- **Purpose**: Deep dive into CQRS pattern
- **Contents**:
  - CQRS concepts & principles
  - Traditional CRUD vs CQRS comparison
  - Components explanation
  - Request flow diagrams
  - Benefits & challenges
  - Event Sourcing introduction
  - When to use CQRS
  - Real-world examples
  - Best practices

#### API_TESTING_GUIDE.md
- **Purpose**: API usage and testing examples
- **Contents**:
  - cURL examples
  - PowerShell examples
  - Postman setup guide
  - Response examples for each endpoint
  - Complete test flow (happy path)
  - CQRS pattern verification through logs

#### QUICK_START.md
- **Purpose**: Getting started quickly
- **Contents**:
  - Prerequisites
  - Installation steps
  - How to run (dev, production, test)
  - Project structure overview
  - Key files explanation
  - Testing flow
  - CQRS benefits
  - Troubleshooting

### Source Code Files

#### src/index.ts
Entry point for the application
```typescript
- Creates Express app
- Starts server on port 3000
- Shows startup message with API info
```

#### src/app.ts
Express app configuration
```typescript
- Middleware setup (JSON parsing)
- Logging middleware
- Routes mounting
- Health check endpoint
- 404 handler
```

#### src/models/index.ts
**Write Model & Read Model definitions**
```typescript
Interfaces:
  ✓ TodoEntity (Write Model)
    - id, title, description, completed
    - createdAt, updatedAt (Date objects)
    - Optimized for storage

  ✓ TodoView (Read Model)
    - id, title, description, completed
    - createdAt, updatedAt (ISO strings)
    - status (derived field)
    - Optimized for queries

  ✓ CreateTodoCommand
    - title, description

  ✓ UpdateTodoCommand
    - id, title?, description?, completed?

  ✓ DeleteTodoCommand
    - id
```

#### src/services/CommandService.ts
**Handles all WRITE operations**
```typescript
Methods:
  ✓ createTodo(command)
    - Generates UUID
    - Creates TodoEntity
    - Stores in Map
    - Returns created entity

  ✓ updateTodo(command)
    - Validates todo exists
    - Updates partial fields
    - Updates timestamp
    - Returns updated entity

  ✓ deleteTodo(command)
    - Validates todo exists
    - Removes from storage
    - Returns true

  ✓ getAllTodos()
    - Returns all TodoEntity array
    - Used for syncing

  ✓ getTodoById(id)
    - Returns TodoEntity or null
```

#### src/services/QueryService.ts
**Handles all READ operations**
```typescript
Methods:
  ✓ syncFromWriteModel(todos)
    - Clears read model cache
    - Converts TodoEntity[] to TodoView[]
    - Logs sync count

  ✓ entityToView(entity)
    - Converts TodoEntity to TodoView
    - Adds derived fields (status)
    - Formats dates to ISO strings

  ✓ getAllTodos()
    - Returns TodoView[] from cache
    - Fast read operation

  ✓ getTodoById(id)
    - Returns TodoView or null
    - Fast lookup by id

  ✓ getStatistics()
    - Returns {total, completed, pending}
    - Example of query-side optimization
```

#### src/controllers/TodoController.ts
**HTTP Request Handlers & Service Orchestration**
```typescript
Methods:
  ✓ createTodo(req, res)
    - Validates input
    - Calls CommandService
    - Syncs to QueryService
    - Returns 201 on success

  ✓ getAllTodos(req, res)
    - Queries from QueryService
    - Returns statistics
    - Returns 200

  ✓ getTodoById(req, res)
    - Queries from QueryService
    - Returns 404 if not found
    - Returns 200 on success

  ✓ updateTodo(req, res)
    - Validates todo exists
    - Calls CommandService
    - Syncs to QueryService
    - Returns 200 or 404

  ✓ deleteTodo(req, res)
    - Calls CommandService
    - Syncs to QueryService
    - Returns 200 or 404

  ✓ syncReadModel() (private)
    - Called after command operations
    - Updates read model from write model
```

#### src/routes/todoRoutes.ts
**API Routes Definition**
```typescript
Routes:
  POST   /todos          → createTodo
  GET    /todos          → getAllTodos
  GET    /todos/:id      → getTodoById
  PUT    /todos/:id      → updateTodo
  DELETE /todos/:id      → deleteTodo

Features:
  - Initializes CommandService & QueryService
  - Creates TodoController with both services
  - Returns configured router
```

## 🎯 Requirements Fulfillment

### ✅ Requirement 1: API Endpoints

Commands (Write):
- ✓ POST /todos → Create todo
- ✓ PUT /todos/:id → Update todo
- ✓ DELETE /todos/:id → Delete todo

Queries (Read):
- ✓ GET /todos → Get all todos
- ✓ GET /todos/:id → Get todo detail

### ✅ Requirement 2: CQRS Architecture

- ✓ Separated CommandService
  - Handles create, update, delete
  - No read operations
  - Pure write operations

- ✓ Separated QueryService
  - Handles get all, get by id
  - No write operations
  - Pure read operations

### ✅ Requirement 3: Two Different Models

- ✓ Write Model (TodoEntity)
  - Optimized for storage
  - Full data with timestamps
  - Date objects for manipulation

- ✓ Read Model (TodoView)
  - Optimized for queries
  - ISO string dates for API
  - Derived fields (status)
  - Query-friendly format

## 🔄 Data Flow

### CREATE Request Flow
```
POST /todos
  ↓
TodoController.createTodo()
  ↓
CommandService.createTodo()
  ↓
Write TodoEntity to Map
  ↓
TodoController.syncReadModel()
  ↓
QueryService.syncFromWriteModel()
  ↓
Convert & cache in TodoView Map
  ↓
Return 201 Created
```

### READ Request Flow
```
GET /todos/:id
  ↓
TodoController.getTodoById()
  ↓
QueryService.getTodoById()
  ↓
Read from TodoView cache
  ↓
Return 200 OK
(Never touches CommandService!)
```

## 🧪 Testing

All endpoints tested via:
- cURL commands
- PowerShell examples
- Postman configuration
- Real-world scenarios

Examples available in: [API_TESTING_GUIDE.md](API_TESTING_GUIDE.md)

## 📦 Dependencies

### Runtime
- **express**: Web framework
- **uuid**: ID generation

### Development
- **typescript**: Type safety
- **ts-node**: Run TypeScript directly
- **@types/express, @types/node, @types/uuid**: Type definitions

## 🚀 Running the Project

```bash
# Install dependencies
npm install

# Development mode
npm run dev

# Build
npm run build

# Production
npm start
```

## 📚 Documentation Order

Recommended reading order:
1. [QUICK_START.md](QUICK_START.md) - Get it running
2. [README.md](README.md) - Understand the project
3. [ARCHITECTURE.md](ARCHITECTURE.md) - Learn CQRS deeply
4. [API_TESTING_GUIDE.md](API_TESTING_GUIDE.md) - Test the API
5. Source code - Study implementation

## 🎓 Learning Outcomes

After completing this project, you will understand:
- ✓ CQRS pattern architecture
- ✓ Separation of concerns
- ✓ Write Model vs Read Model
- ✓ Commands vs Queries
- ✓ Model synchronization
- ✓ Express.js API development
- ✓ TypeScript best practices
- ✓ Event-driven architecture concepts

---

**Created for**: Software Architecture Course
**Project**: CQRS TodoApp - Bài 1
**Student ID**: 22001165
**Language**: Vietnamese (Documentation) / TypeScript (Code)
