import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { getRestaurant, getMenuItems, placeOrder } from '../services/api';

function RestaurantMenu() {
    const { id } = useParams();
    const navigate = useNavigate();
    const [restaurant, setRestaurant] = useState(null);
    const [menuItems, setMenuItems] = useState([]);
    const [cart, setCart] = useState([]);
    const [showCheckout, setShowCheckout] = useState(false);
    const [orderSuccess, setOrderSuccess] = useState(null);
    const [customerInfo, setCustomerInfo] = useState({
        customerName: '',
        customerPhone: '',
        deliveryAddress: ''
    });

    useEffect(() => {
        Promise.all([getRestaurant(id), getMenuItems(id)])
            .then(([resR, resM]) => {
                setRestaurant(resR.data);
                setMenuItems(resM.data);
            })
            .catch(err => console.error('Error:', err));
    }, [id]);

    const addToCart = useCallback((item) => {
        setCart(prev => {
            const existing = prev.find(c => c.menuItem.id === item.id);
            if (existing) {
                return prev.map(c =>
                    c.menuItem.id === item.id ? { ...c, quantity: c.quantity + 1 } : c
                );
            }
            return [...prev, { menuItem: item, quantity: 1 }];
        });
    }, []);

    const updateQty = useCallback((itemId, delta) => {
        setCart(prev => prev
            .map(c => c.menuItem.id === itemId ? { ...c, quantity: c.quantity + delta } : c)
            .filter(c => c.quantity > 0)
        );
    }, []);

    const totalPrice = cart.reduce((sum, c) => sum + c.menuItem.price * c.quantity, 0);

    const handlePlaceOrder = async () => {
        if (!customerInfo.customerName || !customerInfo.deliveryAddress) {
            alert('Please fill in name and delivery address');
            return;
        }

        const orderData = {
            restaurantId: parseInt(id),
            customerName: customerInfo.customerName,
            customerPhone: customerInfo.customerPhone,
            deliveryAddress: customerInfo.deliveryAddress,
            items: cart.map(c => ({
                menuItemId: c.menuItem.id,
                quantity: c.quantity
            }))
        };

        try {
            const res = await placeOrder(orderData);
            setOrderSuccess(res.data);
            setCart([]);
            setShowCheckout(false);
        } catch (err) {
            alert('Failed to place order. Please try again.');
        }
    };

    const formatPrice = (price) => {
        return new Intl.NumberFormat('vi-VN').format(price) + 'đ';
    };

    if (!restaurant) return <div className="container"><p>Loading...</p></div>;

    if (orderSuccess) {
        return (
            <div className="container">
                <div className="tracking-box">
                    <div className="alert alert-success">
                        Order placed successfully! Your Order ID is <strong>#{orderSuccess.id}</strong>
                    </div>
                    <h2>Order #{orderSuccess.id}</h2>
                    <p>Status: <span className="badge badge-pending">{orderSuccess.status}</span></p>
                    <p>Total: <strong>{formatPrice(orderSuccess.totalPrice)}</strong></p>
                    <div style={{ marginTop: '1.5rem', display: 'flex', gap: '1rem' }}>
                        <button className="btn btn-primary" onClick={() => navigate('/track')}>
                            Track Order
                        </button>
                        <button className="btn btn-secondary" onClick={() => {
                            setOrderSuccess(null);
                        }}>
                            Order More
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="container">
            <div className="page-header">
                <h1>{restaurant.name}</h1>
                <p>📍 {restaurant.address} &nbsp; 📞 {restaurant.phone}</p>
            </div>

            <div className="two-col">
                {/* Menu Items */}
                <div>
                    <h2 style={{ marginBottom: '1rem' }}>Menu</h2>
                    {menuItems.map(item => (
                        <div className="menu-item" key={item.id}>
                            <img
                                src={item.imageUrl || 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=200'}
                                alt={item.name}
                                className="menu-item-img"
                            />
                            <div className="menu-item-info">
                                <div className="menu-item-name">{item.name}</div>
                                <div className="menu-item-desc">{item.description}</div>
                                <div className="menu-item-price">{formatPrice(item.price)}</div>
                            </div>
                            <div className="menu-item-actions">
                                <button className="btn btn-primary btn-sm" onClick={() => addToCart(item)}>
                                    + Add
                                </button>
                            </div>
                        </div>
                    ))}
                    {menuItems.length === 0 && <p>No menu items available.</p>}
                </div>

                {/* Cart */}
                <div className="cart-section" style={{ position: 'sticky', top: '80px' }}>
                    <h2 style={{ marginBottom: '1rem' }}>🛒 Cart ({cart.length})</h2>
                    {cart.length === 0 ? (
                        <p style={{ color: '#999' }}>Your cart is empty</p>
                    ) : (
                        <>
                            {cart.map(c => (
                                <div className="cart-item" key={c.menuItem.id}>
                                    <div className="cart-item-info">
                                        <div className="cart-item-name">{c.menuItem.name}</div>
                                        <div className="cart-item-price">{formatPrice(c.menuItem.price)}</div>
                                    </div>
                                    <div className="cart-item-controls">
                                        <button className="qty-btn" onClick={() => updateQty(c.menuItem.id, -1)}>−</button>
                                        <span style={{ fontWeight: 600, minWidth: '20px', textAlign: 'center' }}>{c.quantity}</span>
                                        <button className="qty-btn" onClick={() => updateQty(c.menuItem.id, 1)}>+</button>
                                    </div>
                                </div>
                            ))}
                            <div className="cart-total">
                                <span>Total</span>
                                <span>{formatPrice(totalPrice)}</span>
                            </div>
                            <button
                                className="btn btn-primary btn-block"
                                style={{ marginTop: '1rem' }}
                                onClick={() => setShowCheckout(true)}
                            >
                                Checkout
                            </button>
                        </>
                    )}
                </div>
            </div>

            {/* Checkout Modal */}
            {showCheckout && (
                <div className="modal-overlay" onClick={() => setShowCheckout(false)}>
                    <div className="modal" onClick={e => e.stopPropagation()}>
                        <h2>Checkout</h2>
                        <div className="form-group">
                            <label>Your Name *</label>
                            <input
                                type="text"
                                className="form-control"
                                value={customerInfo.customerName}
                                onChange={e => setCustomerInfo({ ...customerInfo, customerName: e.target.value })}
                                placeholder="Enter your name"
                            />
                        </div>
                        <div className="form-group">
                            <label>Phone Number</label>
                            <input
                                type="text"
                                className="form-control"
                                value={customerInfo.customerPhone}
                                onChange={e => setCustomerInfo({ ...customerInfo, customerPhone: e.target.value })}
                                placeholder="Enter phone number"
                            />
                        </div>
                        <div className="form-group">
                            <label>Delivery Address *</label>
                            <input
                                type="text"
                                className="form-control"
                                value={customerInfo.deliveryAddress}
                                onChange={e => setCustomerInfo({ ...customerInfo, deliveryAddress: e.target.value })}
                                placeholder="Enter delivery address"
                            />
                        </div>
                        <div className="cart-total" style={{ marginBottom: '1rem' }}>
                            <span>Total</span>
                            <span>{formatPrice(totalPrice)}</span>
                        </div>
                        <div style={{ display: 'flex', gap: '1rem' }}>
                            <button className="btn btn-primary" style={{ flex: 1 }} onClick={handlePlaceOrder}>
                                Place Order
                            </button>
                            <button className="btn btn-secondary" onClick={() => setShowCheckout(false)}>
                                Cancel
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

export default RestaurantMenu;
