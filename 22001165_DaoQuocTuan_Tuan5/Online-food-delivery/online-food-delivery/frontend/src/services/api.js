import axios from 'axios';

const API_BASE = process.env.REACT_APP_API_URL || 'http://localhost:8080/api';

const api = axios.create({
    baseURL: API_BASE,
});

// Restaurant APIs
export const getRestaurants = () => api.get('/restaurants');
export const getRestaurant = (id) => api.get(`/restaurants/${id}`);

// Menu Item APIs
export const getMenuItems = (restaurantId) => api.get(`/menu-items/restaurant/${restaurantId}`);
export const createMenuItem = (data) => api.post('/menu-items', data);
export const updateMenuItem = (id, data) => api.put(`/menu-items/${id}`, data);
export const deleteMenuItem = (id) => api.delete(`/menu-items/${id}`);

// Order APIs
export const placeOrder = (data) => api.post('/orders', data);
export const getOrder = (id) => api.get(`/orders/${id}`);
export const getOrdersByRestaurant = (restaurantId) => api.get(`/orders/restaurant/${restaurantId}`);
export const updateOrderStatus = (id, status) => api.put(`/orders/${id}/status?status=${status}`);

export default api;
