# CMS Full-Stack Setup Guide

This guide provides instructions for running both the backend and frontend of the CMS application together.

## 📦 Architecture Overview

```
┌─────────────────────────────────────────────────────────┐
│           Frontend (React + Vite)                       │
│           Running on http://localhost:3000              │
└────────────────────┬────────────────────────────────────┘
                     │ HTTP/REST API
                     │ (Axios)
┌────────────────────▼────────────────────────────────────┐
│           Backend (Spring Boot)                         │
│           Running on http://localhost:8080              │
│                                                         │
│  - ArticleService                                       │
│  - PluginManager (Microkernel Architecture)             │
│  - ArticleRepository (Spring Data JPA)                  │
│  - MySQL Database (cms_db)                              │
└─────────────────────────────────────────────────────────┘
```

## 🚀 Complete Setup Instructions

### Step 1: Prepare the Backend

Navigate to the backend directory:
```bash
cd cms-be
```

Ensure MySQL is running and the database is configured correctly:
- Database: `cms_db`
- Username: `root`
- Password: `123456`
- Host: `localhost`
- Port: `3306`

Update `src/main/resources/application.properties` if needed.

Start the backend:
```bash
# Using Maven wrapper (Windows)
mvnw spring-boot:run

# Or using Maven (if installed globally)
mvn spring-boot:run
```

The backend will start on `http://localhost:8080`

Verify it's running by checking:
```bash
curl http://localhost:8080/api/articles
```

You should see a JSON response with articles.

### Step 2: Prepare the Frontend

Open a **new terminal window** and navigate to the frontend directory:
```bash
cd cms-fe
```

Install dependencies:
```bash
npm install
```

Start the development server:
```bash
npm run dev
```

The frontend will start on `http://localhost:3000`

### Step 3: Access the Application

Open your browser and navigate to:
```
http://localhost:3000
```

You should see:
- Header with "CMS Dashboard" title
- Article count and refresh button
- List of existing articles (3 pre-loaded from data.sql)
- Create New Article form on the right side

## 🧪 Testing the Application

### Test 1: View Articles
1. The page should load with 3 articles:
   - "Layer & Microkernel Architecture" - Admin
   - "VCT Pacific Esports Analysis" - Gamer2026
   - "Vietnam Party Formation 1930" - Historian

### Test 2: Create a New Article
1. Fill in the "Create New Article" form:
   - Title: "Test Article"
   - Author: "Test Author"
   - Content: "This is a test article content..."
2. Click "📝 Publish Article"
3. You should see a success message
4. The article list should refresh and show the new article

### Test 3: Validate Form
1. Try creating an article without a title
2. You should see an error message: "Title is required"
3. Try submitting without content
4. You should see an error message: "Content is required"

### Test 4: Refresh Articles
1. Click the "🔄 Refresh" button in the header
2. The article list should reload
3. All articles should be displayed correctly

## 📝 File Structure Summary

### Backend (cms-be)
```
cms-be/
├── src/main/java/iuh/fit/cmsbe/
│   ├── CmsBeApplication.java              # Entry point
│   ├── core/
│   │   ├── controller/ContentController.java
│   │   ├── model/Article.java
│   │   ├── repository/ArticleRepository.java
│   │   ├── service/ArticleService.java
│   │   ├── service/PluginManager.java
│   │   └── spi/CmsPlugin.java
│   └── plugins/
│       ├── ecommerce/                     # (empty, ready for implementation)
│       └── seo/                           # (empty, ready for implementation)
├── src/main/resources/
│   ├── application.properties              # Configuration
│   └── data.sql                            # Initial data
└── pom.xml                                 # Maven dependencies
```

### Frontend (cms-fe)
```
cms-fe/
├── src/
│   ├── components/
│   │   ├── Header.jsx
│   │   ├── ArticleList.jsx
│   │   └── CreateArticleForm.jsx
│   ├── services/apiService.js
│   ├── styles/
│   │   ├── Header.css
│   │   ├── ArticleList.css
│   │   └── CreateArticleForm.css
│   ├── App.jsx
│   ├── App.css
│   ├── index.css
│   └── main.jsx
├── index.html
├── vite.config.js
├── package.json
└── README.md
```

## 🔧 Configuration

### Backend Configuration
File: `cms-be/src/main/resources/application.properties`

```properties
spring.application.name=cms-be
spring.datasource.url=jdbc:mysql://localhost:3306/cms_db
spring.datasource.username=root
spring.datasource.password=123456
spring.datasource.driver-class-name=com.mysql.cj.jdbc.Driver
spring.jpa.hibernate.ddl-auto=update
spring.jpa.show-sql=true
spring.jpa.properties.hibernate.dialect=org.hibernate.dialect.MySQL8Dialect
spring.sql.init.continue-on-error=true
server.port=8080
```

### Frontend Configuration
File: `cms-fe/vite.config.js`

```javascript
export default defineConfig({
  plugins: [react()],
  server: {
    port: 3000,
    proxy: {
      '/api': {
        target: 'http://localhost:8080',
        changeOrigin: true,
        rewrite: (path) => path
      }
    }
  }
})
```

## 🌐 API Endpoints

### Get All Articles
```
GET /api/articles
Response: [
  {
    "id": 1,
    "title": "Article Title",
    "content": "Article Content...",
    "author": "Author Name"
  },
  ...
]
```

### Create Article
```
POST /api/articles
Request Body: {
  "title": "New Article",
  "content": "Content here...",
  "author": "Author Name"
}
Response: {
  "id": 4,
  "title": "New Article",
  "content": "Content here...",
  "author": "Author Name"
}
```

## 🐛 Troubleshooting

### Frontend can't connect to backend
- Ensure backend is running on port 8080
- Check browser console for CORS errors
- Verify MySQL connection in backend logs

### Port already in use
- Backend port 8080: `netstat -ano | findstr :8080` (Windows)
- Frontend port 3000: `netstat -ano | findstr :3000` (Windows)
- Kill the process or use a different port

### Database connection issues
- Verify MySQL is running
- Check credentials in application.properties
- Ensure cms_db database exists
- Check MySQL logs for errors

### Module not found errors
In cms-fe, run:
```bash
rm -rf node_modules package-lock.json
npm install
npm run dev
```

## 📊 Monitoring

### Backend Logs
The Spring Boot backend will display logs showing:
- Database initialization
- Plugin loading
- API request handling
- SQL statements (if enabled)

### Frontend Logs
Open browser DevTools (F12) to see:
- API request responses
- Component rendering logs
- Error messages
- Network requests

## 🎯 Next Steps

### Enhancements for Future Development

1. **Authentication & Authorization**
   - Add user login/registration
   - Implement JWT tokens
   - Add role-based access control

2. **Additional Features**
   - Edit/delete articles
   - Search functionality
   - Pagination for large article lists
   - Article categories/tags
   - Comments system

3. **Plugin System Expansion**
   - Implement SEO plugin
   - Implement E-commerce plugin
   - Create custom plugins

4. **Frontend Improvements**
   - Add article detail page
   - Implement rich text editor
   - Add image upload support
   - Dark mode toggle
   - Advanced filtering

5. **Deployment**
   - Docker containerization
   - CI/CD pipeline
   - Production deployment guide

## 📄 Additional Resources

- [Spring Boot Documentation](https://spring.io/projects/spring-boot)
- [React Documentation](https://react.dev)
- [Vite Documentation](https://vitejs.dev)
- [Bootstrap Documentation](https://getbootstrap.com)
- [MySQL Documentation](https://dev.mysql.com/doc/)

## ✅ Checklist for First-Time Setup

- [ ] MySQL database running with cms_db created
- [ ] Backend dependencies installed (Maven)
- [ ] Backend application.properties configured
- [ ] Backend running on http://localhost:8080
- [ ] Backend API responding to GET /api/articles
- [ ] Frontend dependencies installed (npm install)
- [ ] Frontend running on http://localhost:3000
- [ ] Frontend can access articles list
- [ ] Can create new article successfully
- [ ] Create article appears in list immediately
- [ ] Form validation working correctly
- [ ] Refresh button works properly

## 🎉 Success!

If all tests pass and you can create/view articles, your CMS application is fully functional!

Enjoy using your Content Management System! 🚀
