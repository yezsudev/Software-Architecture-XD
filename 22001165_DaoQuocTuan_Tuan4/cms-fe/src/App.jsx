import React, { useState, useEffect } from 'react';
import Header from './components/Header';
import ArticleList from './components/ArticleList';
import CreateArticleForm from './components/CreateArticleForm';
import apiService from './services/apiService';
import './App.css';

const App = () => {
  const [articles, setArticles] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    fetchArticles();
  }, []);

  const fetchArticles = async () => {
    setLoading(true);
    setError('');
    try {
      const data = await apiService.getAllArticles();
      setArticles(data);
    } catch (err) {
      setError('Failed to load articles. Make sure the backend server is running on http://localhost:8080');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleArticleCreated = async (articleData) => {
    try {
      await apiService.createArticle(articleData);
      await fetchArticles(); // Refresh the list
    } catch (err) {
      console.error('Error creating article:', err);
      throw err;
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    try {
      await fetchArticles();
    } finally {
      setRefreshing(false);
    }
  };

  return (
    <div className="app">
      <Header 
        articleCount={articles.length} 
        onRefresh={handleRefresh}
        refreshing={refreshing}
      />
      
      <main className="app-main">
        <div className="container-fluid">
          <div className="row">
            <div className="col-lg-8">
              <ArticleList 
                articles={articles} 
                loading={loading} 
                error={error}
              />
            </div>
            <div className="col-lg-4">
              <CreateArticleForm 
                onArticleCreated={handleArticleCreated}
                loading={loading}
              />
            </div>
          </div>
        </div>
      </main>

      <footer className="app-footer">
        <p>© 2025 CMS Application | Powered by Spring Boot + React</p>
      </footer>
    </div>
  );
};

export default App;
