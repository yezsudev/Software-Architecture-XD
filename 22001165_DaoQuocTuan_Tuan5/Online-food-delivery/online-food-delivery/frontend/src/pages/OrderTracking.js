import React, { useState } from 'react';
import { getOrder } from '../services/api';

const STATUSES = ['PENDING', 'CONFIRMED', 'DELIVERING', 'DELIVERED'];
const STATUS_LABELS = {
    PENDING: 'Pending',
    CONFIRMED: 'Confirmed',
    DELIVERING: 'Delivering',
    DELIVERED: 'Delivered'
};

function OrderTracking() {
    const [orderId, setOrderId] = useState('');
    const [order, setOrder] = useState(null);
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);

    const handleTrack = async () => {
        if (!orderId.trim()) return;
        setLoading(true);
        setError('');
        setOrder(null);

        try {
            const res = await getOrder(orderId.trim());
            setOrder(res.data);
        } catch (err) {
            setError('Order not found. Please check your Order ID.');
        } finally {
            setLoading(false);
        }
    };

    const handleRefresh = async () => {
        if (!order) return;
        try {
            const res = await getOrder(order.id);
            setOrder(res.data);
        } catch (err) {
            setError('Failed to refresh order status.');
        }
    };

    const formatPrice = (price) => {
        return new Intl.NumberFormat('vi-VN').format(price) + 'đ';
    };

    const getStatusIndex = (status) => STATUSES.indexOf(status);

    return (
        <div className="container">
            <div className="page-header" style={{ textAlign: 'center' }}>
                <h1>Track Your Order</h1>
                <p>Enter your Order ID to see real-time status</p>
            </div>

            <div className="tracking-box">
                <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1.5rem' }}>
                    <input
                        type="text"
                        className="form-control"
                        placeholder="Enter Order ID (e.g., 1)"
                        value={orderId}
                        onChange={e => setOrderId(e.target.value)}
                        onKeyDown={e => e.key === 'Enter' && handleTrack()}
                    />
                    <button className="btn btn-primary" onClick={handleTrack} disabled={loading}>
                        {loading ? '...' : 'Track'}
                    </button>
                </div>

                {error && <div className="alert alert-error">{error}</div>}

                {order && (
                    <div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                            <h2>Order #{order.id}</h2>
                            <button className="btn btn-secondary btn-sm" onClick={handleRefresh}>
                                🔄 Refresh
                            </button>
                        </div>

                        {/* Status Timeline */}
                        <div className="status-timeline">
                            {STATUSES.map((status, index) => {
                                const currentIdx = getStatusIndex(order.status);
                                let dotClass = 'status-dot';
                                if (index < currentIdx) dotClass += ' active';
                                else if (index === currentIdx) dotClass += ' current';

                                return (
                                    <div className="status-step" key={status}>
                                        <div className={dotClass}>{index + 1}</div>
                                        <div className="status-label">{STATUS_LABELS[status]}</div>
                                    </div>
                                );
                            })}
                        </div>

                        {/* Order Info */}
                        <div style={{ marginTop: '1.5rem' }}>
                            <h3 style={{ marginBottom: '0.75rem' }}>Order Details</h3>
                            <div className="order-detail-row">
                                <span>Restaurant</span>
                                <strong>{order.restaurant?.name}</strong>
                            </div>
                            <div className="order-detail-row">
                                <span>Customer</span>
                                <strong>{order.customerName}</strong>
                            </div>
                            <div className="order-detail-row">
                                <span>Phone</span>
                                <strong>{order.customerPhone || 'N/A'}</strong>
                            </div>
                            <div className="order-detail-row">
                                <span>Address</span>
                                <strong>{order.deliveryAddress}</strong>
                            </div>
                            <div className="order-detail-row">
                                <span>Status</span>
                                <span className={`badge badge-${order.status.toLowerCase()}`}>
                                    {STATUS_LABELS[order.status]}
                                </span>
                            </div>
                        </div>

                        {/* Order Items */}
                        <div style={{ marginTop: '1.5rem' }}>
                            <h3 style={{ marginBottom: '0.75rem' }}>Items</h3>
                            {order.orderItems?.map((item, idx) => (
                                <div className="order-detail-row" key={idx}>
                                    <span>{item.menuItem?.name} x{item.quantity}</span>
                                    <strong>{formatPrice(item.price)}</strong>
                                </div>
                            ))}
                            <div className="cart-total">
                                <span>Total</span>
                                <span>{formatPrice(order.totalPrice)}</span>
                            </div>
                        </div>

                        <div style={{ marginTop: '1rem', color: '#999', fontSize: '0.85rem' }}>
                            Ordered at: {new Date(order.createdAt).toLocaleString()}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}

export default OrderTracking;
