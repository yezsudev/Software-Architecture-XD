import React from 'react';
import '../styles/ArticleList.css';

const ArticleList = ({ articles, loading, error }) => {
  if (loading) {
    return (
      <div className="loading-container">
        <div className="spinner-border text-primary" role="status">
          <span className="visually-hidden">Loading...</span>
        </div>
        <p>Loading articles...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="alert alert-danger" role="alert">
        <h4 className="alert-heading">Error!</h4>
        <p>{error}</p>
      </div>
    );
  }

  if (articles.length === 0) {
    return (
      <div className="alert alert-info" role="alert">
        No articles found. Create one to get started!
      </div>
    );
  }

  return (
    <div className="articles-container">
      <h2 className="articles-title">📰 All Articles</h2>
      <div className="articles-grid">
        {articles.map((article) => (
          <article key={article.id} className="article-card">
            <div className="article-header">
              <h3 className="article-title">{article.title}</h3>
              <span className="article-id">ID: {article.id}</span>
            </div>
            <div className="article-content">
              <p>{article.content.substring(0, 150)}...</p>
            </div>
            <div className="article-footer">
              <span className="article-author">✍️ {article.author || 'Unknown'}</span>
            </div>
          </article>
        ))}
      </div>
    </div>
  );
};

export default ArticleList;
