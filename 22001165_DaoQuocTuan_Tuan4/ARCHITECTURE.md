# CMS Application - Architecture Diagram

## System Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                    FRONTEND (React + Vite)                      │
│                     http://localhost:3000                       │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │                     App Component                        │  │
│  │  - State Management (articles, loading, error)          │  │
│  │  - API Communication                                    │  │
│  │  - Page Layout                                          │  │
│  └──────────────────────────────────────────────────────────┘  │
│        │                                │                      │
│        ├───────────────────┬────────────┴────────────┬─────┐   │
│        │                   │                         │     │   │
│  ┌─────▼──────┐    ┌──────▼────────┐    ┌──────────▼──┐   │   │
│  │   Header   │    │ ArticleList   │    │CreateArticle│   │   │
│  ├────────────┤    ├───────────────┤    ├─────────────┤   │   │
│  │ - Title    │    │ - Grid Layout │    │ - Form      │   │   │
│  │ - Stats    │    │ - Cards       │    │ - Validation│   │   │
│  │ - Refresh  │    │ - Loading     │    │ - Submit    │   │   │
│  │   Button   │    │ - Empty State │    │ - Messages  │   │   │
│  └────────────┘    └───────────────┘    └─────────────┘   │   │
│                                                             │   │
│  ┌────────────────────────────────────────────────────────┐   │
│  │         API Service (apiService.js)                    │   │
│  │  - getAllArticles() → GET /api/articles                │   │
│  │  - createArticle(data) → POST /api/articles            │   │
│  └────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────┘
                              │
                    HTTP/REST (Axios)
                              │
┌─────────────────────────────────────────────────────────────────┐
│                    BACKEND (Spring Boot)                        │
│                     http://localhost:8080                       │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ┌─────────────────────────────────────────────────────────┐  │
│  │     REST Controller (ContentController)                 │  │
│  │  - GET /api/articles → getAllArticles()                 │  │
│  │  - POST /api/articles → createArticle()                 │  │
│  │  - CORS: @CrossOrigin(origins = "*")                    │  │
│  └─────────────────────────────────────────────────────────┘  │
│                            │                                   │
│                            ▼                                   │
│  ┌─────────────────────────────────────────────────────────┐  │
│  │      Service Layer (ArticleService)                     │  │
│  │  - getAllArticles()                                     │  │
│  │  - createArticle(data)                                  │  │
│  │    - Validate title (required)                          │  │
│  │    - Call PluginManager.executePlugins()                │  │
│  │    - Save to database                                   │  │
│  └─────────────────────────────────────────────────────────┘  │
│                            │                                   │
│                            ├───────────────┬──────────────┐    │
│                            │               │              │    │
│                            ▼               ▼              ▼    │
│  ┌──────────────────────┐  ┌──────────────────────┐  (Plugins)│
│  │ PluginManager        │  │ Repository           │  ┌──────┐ │
│  ├──────────────────────┤  ├──────────────────────┤  │ SEO  │ │
│  │ - executePlugins()   │  │ ArticleRepository    │  │      │ │
│  │ - Call hooks         │  │ - findAll()          │  └──────┘ │
│  │ - beforeArticleSave()│  │ - save()             │  ┌──────┐ │
│  └──────────────────────┘  └──────────────────────┘  │E-Com │ │
│                                      │               │      │ │
│                                      ▼               └──────┘ │
│  ┌─────────────────────────────────────────────────────────┐  │
│  │           MySQL Database (cms_db)                       │  │
│  │  ┌────────────────────────────────────────────────────┐ │  │
│  │  │ articles table                                     │ │  │
│  │  ├─────────┬──────────┬──────────────┬────────────────┤ │  │
│  │  │ id(PK)  │ title    │ content(TEXT)│ author         │ │  │
│  │  ├─────────┼──────────┼──────────────┼────────────────┤ │  │
│  │  │ 1       │ Layer... │ The Layer... │ Admin          │ │  │
│  │  │ 2       │ VCT...   │ VCT Pacific..│ Gamer2026      │ │  │
│  │  │ 3       │ Vietnam..│ Vietnam..    │ Historian      │ │  │
│  │  └────────────────────────────────────────────────────┘ │  │
│  └─────────────────────────────────────────────────────────┘  │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

## Data Flow Diagram

### Getting Articles (Read Flow)
```
Frontend                        Backend              Database
   │                              │                    │
   │  GET /api/articles           │                    │
   ├─────────────────────────────►│                    │
   │                              │  SELECT * FROM     │
   │                              ├───────────────────►│
   │                              │                    │
   │                              │  Return articles   │
   │                              │◄───────────────────┤
   │  Return JSON array           │                    │
   │◄─────────────────────────────┤                    │
   │                              │                    │
   │ Display in ArticleList       │                    │
   │ Update state                 │                    │
   ▼                              ▼                    ▼
```

### Creating Article (Write Flow)
```
Frontend                                   Backend                Database
   │                                         │                      │
   │  User fills form & clicks submit        │                      │
   │  CreateArticleForm.jsx                  │                      │
   │                                         │                      │
   │  POST /api/articles                     │                      │
   │  {title, content, author}               │                      │
   ├────────────────────────────────────────►│                      │
   │                                         │                      │
   │                                    ArticleService.createArticle│
   │                                    - Validate title            │
   │                                    - PluginManager.execute()   │
   │                                         │                      │
   │                                         │  INSERT article data │
   │                                         ├─────────────────────►│
   │                                         │                      │
   │                                         │  Return saved article│
   │                                         │◄─────────────────────┤
   │  Return created article                 │                      │
   │◄────────────────────────────────────────┤                      │
   │                                         │                      │
   │  Call getAllArticles() to refresh list  │                      │
   ├────────────────────────────────────────►│                      │
   │                                         │  Query database      │
   │                                         ├─────────────────────►│
   │                                         │                      │
   │  Show success message                   │  Return all articles │
   │  Update state with new list             │◄─────────────────────┤
   │                                         │                      │
   ▼                                         ▼                      ▼
```

## Component Interaction

```
                        App.jsx
                          │
        ┌─────────────────┼─────────────────┐
        │                 │                 │
        ▼                 ▼                 ▼
     Header         ArticleList    CreateArticleForm
        │                │                 │
        │                │                 │
     Calls:           Displays:        Handles:
     - onRefresh()    - Loading       - formChange()
     - API call       - Articles      - onSubmit()
                      - Error msgs    - Validation
                                      - API call
```

## File Organization

```
cms-fe/
│
├── PUBLIC ASSETS
│   └── index.html (HTML template)
│
├── SOURCE CODE
│   └── src/
│       ├── components/
│       │   ├── Header.jsx          ┐
│       │   ├── ArticleList.jsx     ├─ React components
│       │   └── CreateArticleForm.jsx┘
│       │
│       ├── services/
│       │   └── apiService.js       ─ API communication
│       │
│       ├── styles/
│       │   ├── Header.css          ┐
│       │   ├── ArticleList.css     ├─ Component styles
│       │   └── CreateArticleForm.css┘
│       │
│       ├── App.jsx                 ─ Main component
│       ├── App.css                 ─ App styles
│       ├── index.css               ─ Global styles
│       └── main.jsx                ─ Entry point
│
├── CONFIG FILES
│   ├── vite.config.js              ─ Build config
│   ├── .eslintrc.json              ─ Code quality
│   ├── .gitignore                  ─ Git ignore
│   └── package.json                ─ Dependencies
│
└── DOCUMENTATION
    └── README.md                   ─ Frontend docs
```

## Deployment Architecture

```
Development:
┌─────────────────────────┐
│  npm run dev            │
│  Vite Dev Server:3000   │
│  HMR enabled            │
└─────────────────────────┘

Production:
┌─────────────────────────┐
│  npm run build          │
│  Creates dist/ folder   │
│  Optimized JS/CSS       │
│  Ready for CDN/server   │
└─────────────────────────┘
    │
    ▼
┌──────────────────────────┐
│ Static File Server       │
│ Nginx / Apache / AWS S3  │
│ Serves SPA               │
└──────────────────────────┘
```

## Technology Stack Visualization

```
┌─────────────────────────────────────────┐
│        Frontend Layer                   │
├─────────────────────────────────────────┤
│  React 18.2.0      - UI Framework      │
│  Vite 5.0.0        - Build Tool        │
│  Bootstrap 5.3.0   - CSS Framework     │
│  Axios 1.6.0       - HTTP Client       │
│  Custom CSS        - Styling           │
└─────────────────────────────────────────┘
              │
              │ REST API (HTTP)
              │
┌─────────────────────────────────────────┐
│        Backend Layer                    │
├─────────────────────────────────────────┤
│  Spring Boot 4.0.3       - Framework    │
│  Java 17                 - Language     │
│  Spring Data JPA         - ORM          │
│  Lombok                  - Code Gen     │
│  MySQL 8.0               - Database     │
└─────────────────────────────────────────┘
```

## State Management Flow

```
App Component State:
{
  articles: [        ┐
    {                │ From Backend
      id: 1,         │
      title: "...",  │
      content: "...",│
      author: "..."  │
    },               │
    ...              ┘
  ],
  loading: false,    ┐
  error: "",         ├ UI State
  refreshing: false  ┘
}
        │
        ├─ Passed to Header.jsx
        ├─ Passed to ArticleList.jsx
        └─ Passed to CreateArticleForm.jsx
```

## Response/Request Schema

### GET /api/articles Response
```json
[
  {
    "id": 1,
    "title": "Layer & Microkernel Architecture",
    "content": "Detailed architecture explanation...",
    "author": "Admin"
  },
  {
    "id": 2,
    "title": "VCT Pacific Esports Analysis",
    "content": "Analysis of esports tournament...",
    "author": "Gamer2026"
  }
]
```

### POST /api/articles Request
```json
{
  "title": "New Article Title",
  "content": "Article content goes here",
  "author": "Author Name"
}
```

### POST /api/articles Response
```json
{
  "id": 4,
  "title": "New Article Title",
  "content": "Article content goes here",
  "author": "Author Name"
}
```

## Error Flow

```
API Request
    │
    ├─ Success (200)
    │   └─ Update state with data
    │       └─ Render success UI
    │
    └─ Error
        ├─ Network error?
        │   └─ "Failed to load articles"
        │
        └─ Validation error?
            └─ Display server error message
                └─ Show error alert
                └─ Clear on user input
```
