import React from 'react';
import { BrowserRouter as Router, Routes, Route, Link, useLocation } from 'react-router-dom';
import RestaurantList from './pages/RestaurantList';
import RestaurantMenu from './pages/RestaurantMenu';
import OrderTracking from './pages/OrderTracking';
import OwnerDashboard from './pages/OwnerDashboard';

function Navbar() {
    const location = useLocation();
    const isActive = (path) => location.pathname === path ? 'active' : '';

    return (
        <nav className="navbar">
            <Link to="/" className="navbar-brand">🍔 FoodDelivery</Link>
            <ul className="navbar-links">
                <li><Link to="/" className={isActive('/')}>Restaurants</Link></li>
                <li><Link to="/track" className={isActive('/track')}>Track Order</Link></li>
                <li><Link to="/owner" className={isActive('/owner')}>Owner Dashboard</Link></li>
            </ul>
        </nav>
    );
}

function App() {
    return (
        <Router>
            <div className="app">
                <Navbar />
                <Routes>
                    <Route path="/" element={<RestaurantList />} />
                    <Route path="/restaurant/:id" element={<RestaurantMenu />} />
                    <Route path="/track" element={<OrderTracking />} />
                    <Route path="/owner" element={<OwnerDashboard />} />
                </Routes>
            </div>
        </Router>
    );
}

export default App;
