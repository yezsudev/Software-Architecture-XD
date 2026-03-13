# CMS Frontend - React Application

A modern, responsive frontend for the CMS (Content Management System) application built with React, Vite, and Bootstrap.

## 🎯 Features

- ✅ **Article Management** - View, create, and manage articles
- ✅ **Responsive Design** - Works seamlessly on desktop, tablet, and mobile
- ✅ **Real-time Sync** - Automatic synchronization with backend API
- ✅ **Error Handling** - Comprehensive error handling and user feedback
- ✅ **Modern UI** - Beautiful gradient design with smooth animations
- ✅ **Form Validation** - Client-side validation for article creation
- ✅ **Loading States** - Visual feedback during API calls

## 📋 Project Structure

```
cms-fe/
├── src/
│   ├── components/
│   │   ├── Header.jsx           # Header with stats and refresh button
│   │   ├── ArticleList.jsx      # Grid display of articles
│   │   └── CreateArticleForm.jsx # Form to create new articles
│   ├── services/
│   │   └── apiService.js        # API communication service
│   ├── styles/
│   │   ├── Header.css
│   │   ├── ArticleList.css
│   │   └── CreateArticleForm.css
│   ├── App.jsx                  # Main application component
│   ├── App.css                  # App-wide styles
│   ├── index.css                # Global styles
│   └── main.jsx                 # Entry point
├── index.html                   # HTML template
├── vite.config.js              # Vite configuration
├── package.json                # Dependencies and scripts
└── README.md                   # This file
```

## 🚀 Getting Started

### Prerequisites

- Node.js (v14 or higher)
- npm or yarn
- Backend CMS server running on `http://localhost:8080`

### Installation

1. **Navigate to the cms-fe directory:**
   ```bash
   cd cms-fe
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```

### Running the Development Server

Start the development server:
```bash
npm run dev
```

The application will be available at `http://localhost:3000`

### Building for Production

Create an optimized production build:
```bash
npm run build
```

The compiled files will be in the `dist/` directory.

### Preview Production Build

Preview the production build locally:
```bash
npm run preview
```

## 🔌 API Integration

The frontend communicates with the backend API using Axios. All API calls are handled in `src/services/apiService.js`.

### Available Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/articles` | Get all articles |
| POST | `/api/articles` | Create a new article |

### API Configuration

The API base URL is configured in `src/services/apiService.js`:
```javascript
const API_BASE_URL = 'http://localhost:8080/api';
```

For development, the Vite config includes a proxy that forwards API requests to the backend:
```javascript
'/api': {
  target: 'http://localhost:8080',
  changeOrigin: true
}
```

## 📦 Dependencies

### Main Dependencies
- **react** (^18.2.0) - UI library
- **react-dom** (^18.2.0) - React DOM rendering
- **axios** (^1.6.0) - HTTP client for API requests
- **bootstrap** (via CDN) - CSS framework

### Dev Dependencies
- **vite** (^5.0.0) - Build tool and dev server
- **@vitejs/plugin-react** (^4.2.0) - React plugin for Vite
- **eslint** & **eslint-plugin-react** - Code linting

## 🎨 UI Components

### Header
Displays the application title, subtitle, article count, and refresh button.

### ArticleList
Displays all articles in a responsive grid layout with:
- Article title
- Article ID badge
- Article preview (first 150 characters)
- Author information
- Loading and error states

### CreateArticleForm
Form for creating new articles with:
- Title field (required)
- Author field (optional)
- Content field (required)
- Form validation
- Success/error messages
- Submit button with loading state

## 🔄 State Management

The app uses React hooks (useState, useEffect) for state management:
- `articles` - List of all articles
- `loading` - Loading state for API calls
- `error` - Error messages
- `refreshing` - Refresh button state

## 🎯 Key Features Explained

### Real-time Synchronization
When a new article is created, the article list automatically refreshes to show the latest data.

### Validation
- Title and content are required fields
- Error messages are displayed inline in the form
- Validation errors are cleared when the user starts typing

### Error Handling
- Network errors are displayed to the user
- User-friendly error messages with guidance
- Detailed console logs for debugging

### Responsive Design
- Mobile-first approach
- Breakpoints at 768px and 1024px
- Sticky form on desktop for better UX
- Grid layout adjusts from 3 columns to 1 column on mobile

## 🌐 CORS Configuration

The backend has CORS enabled for all origins (appropriate for development).
For production, adjust CORS settings in the backend configuration.

## 📱 Browser Support

- Chrome (latest)
- Firefox (latest)
- Safari (latest)
- Edge (latest)

## 🐛 Troubleshooting

### Backend Connection Error
If you see "Failed to load articles" error:
1. Ensure the backend server is running on `http://localhost:8080`
2. Check that the backend CORS is properly configured
3. Check browser console for detailed error messages

### Port Already in Use
If port 3000 is already in use, you can change it in `vite.config.js`:
```javascript
server: {
  port: 3001, // Change to any available port
}
```

### Module Not Found
If you get module errors after cloning:
```bash
rm -rf node_modules package-lock.json
npm install
```

## 📝 Development Notes

- The API service uses Axios interceptors pattern for consistent API calls
- Components are functional and use React Hooks
- CSS is organized by component for easy maintenance
- Bootstrap grid system is used for responsive layout

## 🤝 Contributing

1. Create a feature branch
2. Make your changes
3. Test thoroughly
4. Submit a pull request

## 📄 License

This project is licensed under the MIT License.

## 👨‍💻 Author

CMS Frontend Development Team

## 🙏 Acknowledgments

- React Documentation
- Vite Documentation
- Bootstrap CSS Framework
- Spring Boot Backend Team
