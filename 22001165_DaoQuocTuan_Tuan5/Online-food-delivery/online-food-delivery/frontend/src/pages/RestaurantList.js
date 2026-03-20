import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { getRestaurants } from '../services/api';

function RestaurantList() {
    const [restaurants, setRestaurants] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        getRestaurants()
            .then(res => setRestaurants(res.data))
            .catch(err => console.error('Error loading restaurants:', err))
            .finally(() => setLoading(false));
    }, []);

    if (loading) return <div className="container"><p>Loading restaurants...</p></div>;

    return (
        <div className="container">
            <div className="page-header">
                <h1>Restaurants</h1>
                <p>Choose a restaurant and order your favorite food</p>
            </div>
            <div className="card-grid">
                {restaurants.map(r => (
                    <Link to={`/restaurant/${r.id}`} key={r.id} style={{ textDecoration: 'none', color: 'inherit' }}>
                        <div className="card">
                            <img
                                src={r.imageUrl || 'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=400'}
                                alt={r.name}
                                className="card-img"
                            />
                            <div className="card-body">
                                <div className="card-title">{r.name}</div>
                                <div className="card-text">📍 {r.address}</div>
                                <div className="card-text">📞 {r.phone}</div>
                            </div>
                        </div>
                    </Link>
                ))}
            </div>
            {restaurants.length === 0 && <p>No restaurants available.</p>}
        </div>
    );
}

export default RestaurantList;
