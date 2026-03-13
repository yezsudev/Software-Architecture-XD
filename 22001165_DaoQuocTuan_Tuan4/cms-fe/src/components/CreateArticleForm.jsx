import React, { useState } from 'react';
import '../styles/CreateArticleForm.css';

const CreateArticleForm = ({ onArticleCreated, loading }) => {
  const [formData, setFormData] = useState({
    title: '',
    content: '',
    author: ''
  });
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prevState => ({
      ...prevState,
      [name]: value
    }));
    // Clear error when user starts typing
    if (error) setError('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // Validation
    if (!formData.title.trim()) {
      setError('Title is required');
      return;
    }
    
    if (!formData.content.trim()) {
      setError('Content is required');
      return;
    }

    try {
      await onArticleCreated(formData);
      setFormData({ title: '', content: '', author: '' });
      setSuccess('Article created successfully! 🎉');
      setTimeout(() => setSuccess(''), 3000);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to create article');
    }
  };

  return (
    <div className="form-container">
      <div className="form-card">
        <h2 className="form-title">✨ Create New Article</h2>
        
        {success && (
          <div className="alert alert-success alert-dismissible fade show" role="alert">
            {success}
            <button type="button" className="btn-close" onClick={() => setSuccess('')}></button>
          </div>
        )}

        {error && (
          <div className="alert alert-danger alert-dismissible fade show" role="alert">
            {error}
            <button type="button" className="btn-close" onClick={() => setError('')}></button>
          </div>
        )}

        <form onSubmit={handleSubmit} noValidate>
          <div className="form-group">
            <label htmlFor="title" className="form-label">
              Title <span className="required">*</span>
            </label>
            <input
              type="text"
              className="form-control"
              id="title"
              name="title"
              value={formData.title}
              onChange={handleChange}
              placeholder="Enter article title"
              disabled={loading}
            />
          </div>

          <div className="form-group">
            <label htmlFor="author" className="form-label">
              Author
            </label>
            <input
              type="text"
              className="form-control"
              id="author"
              name="author"
              value={formData.author}
              onChange={handleChange}
              placeholder="Enter author name"
              disabled={loading}
            />
          </div>

          <div className="form-group">
            <label htmlFor="content" className="form-label">
              Content <span className="required">*</span>
            </label>
            <textarea
              className="form-control"
              id="content"
              name="content"
              value={formData.content}
              onChange={handleChange}
              placeholder="Enter article content"
              rows="6"
              disabled={loading}
            ></textarea>
          </div>

          <button
            type="submit"
            className="btn btn-primary btn-submit"
            disabled={loading}
          >
            {loading ? (
              <>
                <span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>
                Creating...
              </>
            ) : (
              '📝 Publish Article'
            )}
          </button>
        </form>
      </div>
    </div>
  );
};

export default CreateArticleForm;
