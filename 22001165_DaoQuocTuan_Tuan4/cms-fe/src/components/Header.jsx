import React from 'react';
import '../styles/Header.css';

const Header = ({ articleCount, onRefresh, refreshing }) => {
  return (
    <header className="header">
      <div className="header-container">
        <div className="header-content">
          <h1 className="header-title">📚 CMS Dashboard</h1>
          <p className="header-subtitle">Content Management System</p>
        </div>
        <div className="header-stats">
          <span className="stat-item">
            <span className="stat-label">Total Articles:</span>
            <span className="stat-value">{articleCount}</span>
          </span>
          <button 
            className="btn-refresh" 
            onClick={onRefresh}
            disabled={refreshing}
            title="Refresh articles list"
          >
            {refreshing ? '⟳ Refreshing...' : '🔄 Refresh'}
          </button>
        </div>
      </div>
    </header>
  );
};

export default Header;
