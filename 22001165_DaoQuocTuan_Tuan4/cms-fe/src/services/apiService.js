import axios from 'axios';

const API_BASE_URL = 'http://localhost:8080/api';

const apiService = {
  // Get all articles
  getAllArticles: async () => {
    try {
      const response = await axios.get(`${API_BASE_URL}/articles`);
      return response.data;
    } catch (error) {
      console.error('Error fetching articles:', error);
      throw error;
    }
  },

  // Create a new article
  createArticle: async (article) => {
    try {
      const response = await axios.post(`${API_BASE_URL}/articles`, article);
      return response.data;
    } catch (error) {
      console.error('Error creating article:', error);
      throw error;
    }
  }
};

export default apiService;
