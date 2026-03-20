import React, { useState, useEffect, useCallback } from 'react';
import {
    getRestaurants, getMenuItems, createMenuItem, updateMenuItem, deleteMenuItem,
    getOrdersByRestaurant, updateOrderStatus
} from '../services/api';

const STATUS_LABELS = {
    PENDING: 'Pending',
    CONFIRMED: 'Confirmed',
    DELIVERING: 'Delivering',
    DELIVERED: 'Delivered'
};

const NEXT_STATUS = {
    PENDING: 'CONFIRMED',
    CONFIRMED: 'DELIVERING',
    DELIVERING: 'DELIVERED'
};

function OwnerDashboard() {
    const [restaurants, setRestaurants] = useState([]);
    const [selectedRestaurant, setSelectedRestaurant] = useState(null);
    const [menuItems, setMenuItems] = useState([]);
    const [orders, setOrders] = useState([]);
    const [activeTab, setActiveTab] = useState('menu');
    const [showMenuForm, setShowMenuForm] = useState(false);
    const [editingItem, setEditingItem] = useState(null);
    const [menuForm, setMenuForm] = useState({
        name: '', description: '', price: '', imageUrl: '', available: true
    });

    useEffect(() => {
        getRestaurants().then(res => {
            setRestaurants(res.data);
            if (res.data.length > 0) setSelectedRestaurant(res.data[0]);
        });
    }, []);

    const loadData = useCallback(() => {
        if (!selectedRestaurant) return;
        getMenuItems(selectedRestaurant.id).then(res => setMenuItems(res.data));
        getOrdersByRestaurant(selectedRestaurant.id).then(res => setOrders(res.data));
    }, [selectedRestaurant]);

    useEffect(() => {
        loadData();
    }, [loadData]);

    const handleSelectRestaurant = (r) => {
        setSelectedRestaurant(r);
    };

    // Menu CRUD
    const openAddForm = () => {
        setEditingItem(null);
        setMenuForm({ name: '', description: '', price: '', imageUrl: '', available: true });
        setShowMenuForm(true);
    };

    const openEditForm = (item) => {
        setEditingItem(item);
        setMenuForm({
            name: item.name,
            description: item.description || '',
            price: item.price,
            imageUrl: item.imageUrl || '',
            available: item.available
        });
        setShowMenuForm(true);
    };

    const handleSaveMenu = async () => {
        const data = {
            ...menuForm,
            price: parseFloat(menuForm.price),
            restaurantId: selectedRestaurant.id
        };

        try {
            if (editingItem) {
                await updateMenuItem(editingItem.id, data);
            } else {
                await createMenuItem(data);
            }
            setShowMenuForm(false);
            loadData();
        } catch (err) {
            alert('Failed to save menu item');
        }
    };

    const handleDeleteMenu = async (id) => {
        if (!window.confirm('Delete this menu item?')) return;
        try {
            await deleteMenuItem(id);
            loadData();
        } catch (err) {
            alert('Failed to delete menu item');
        }
    };

    // Order status
    const handleUpdateStatus = async (orderId, newStatus) => {
        try {
            await updateOrderStatus(orderId, newStatus);
            loadData();
        } catch (err) {
            alert('Failed to update order status');
        }
    };

    const formatPrice = (price) => {
        return new Intl.NumberFormat('vi-VN').format(price) + 'đ';
    };

    return (
        <div className="container">
            <div className="page-header">
                <h1>Restaurant Owner Dashboard</h1>
                <p>Manage your menu and orders</p>
            </div>

            {/* Restaurant Selector */}
            <div style={{ marginBottom: '1.5rem', display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                {restaurants.map(r => (
                    <button
                        key={r.id}
                        className={`btn ${selectedRestaurant?.id === r.id ? 'btn-primary' : 'btn-secondary'}`}
                        onClick={() => handleSelectRestaurant(r)}
                    >
                        {r.name}
                    </button>
                ))}
            </div>

            {selectedRestaurant && (
                <>
                    {/* Tabs */}
                    <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1.5rem' }}>
                        <button
                            className={`btn ${activeTab === 'menu' ? 'btn-primary' : 'btn-secondary'}`}
                            onClick={() => setActiveTab('menu')}
                        >
                            Menu Items ({menuItems.length})
                        </button>
                        <button
                            className={`btn ${activeTab === 'orders' ? 'btn-primary' : 'btn-secondary'}`}
                            onClick={() => setActiveTab('orders')}
                        >
                            Orders ({orders.length})
                        </button>
                        <button className="btn btn-secondary btn-sm" onClick={loadData} style={{ marginLeft: 'auto' }}>
                            🔄 Refresh
                        </button>
                    </div>

                    {/* Menu Tab */}
                    {activeTab === 'menu' && (
                        <div>
                            <button className="btn btn-success" style={{ marginBottom: '1rem' }} onClick={openAddForm}>
                                + Add Menu Item
                            </button>
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
                                        <div style={{ fontSize: '0.8rem', color: item.available ? '#28a745' : '#dc3545' }}>
                                            {item.available ? '✅ Available' : '❌ Unavailable'}
                                        </div>
                                    </div>
                                    <div className="menu-item-actions" style={{ flexDirection: 'column' }}>
                                        <button className="btn btn-secondary btn-sm" onClick={() => openEditForm(item)}>
                                            Edit
                                        </button>
                                        <button className="btn btn-danger btn-sm" onClick={() => handleDeleteMenu(item.id)}>
                                            Delete
                                        </button>
                                    </div>
                                </div>
                            ))}
                            {menuItems.length === 0 && <p>No menu items yet. Add your first item!</p>}
                        </div>
                    )}

                    {/* Orders Tab */}
                    {activeTab === 'orders' && (
                        <div>
                            {orders.length === 0 ? (
                                <p>No orders yet.</p>
                            ) : (
                                <table className="table">
                                    <thead>
                                        <tr>
                                            <th>Order ID</th>
                                            <th>Customer</th>
                                            <th>Items</th>
                                            <th>Total</th>
                                            <th>Status</th>
                                            <th>Action</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {orders.map(order => (
                                            <tr key={order.id}>
                                                <td>#{order.id}</td>
                                                <td>
                                                    <div>{order.customerName}</div>
                                                    <div style={{ fontSize: '0.8rem', color: '#888' }}>
                                                        {order.deliveryAddress}
                                                    </div>
                                                </td>
                                                <td>
                                                    {order.orderItems?.map((oi, idx) => (
                                                        <div key={idx} style={{ fontSize: '0.85rem' }}>
                                                            {oi.menuItem?.name} x{oi.quantity}
                                                        </div>
                                                    ))}
                                                </td>
                                                <td><strong>{formatPrice(order.totalPrice)}</strong></td>
                                                <td>
                                                    <span className={`badge badge-${order.status.toLowerCase()}`}>
                                                        {STATUS_LABELS[order.status]}
                                                    </span>
                                                </td>
                                                <td>
                                                    {NEXT_STATUS[order.status] && (
                                                        <button
                                                            className="btn btn-success btn-sm"
                                                            onClick={() => handleUpdateStatus(order.id, NEXT_STATUS[order.status])}
                                                        >
                                                            → {STATUS_LABELS[NEXT_STATUS[order.status]]}
                                                        </button>
                                                    )}
                                                    {order.status === 'DELIVERED' && (
                                                        <span style={{ color: '#28a745', fontWeight: 600 }}>✅ Done</span>
                                                    )}
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            )}
                        </div>
                    )}
                </>
            )}

            {/* Menu Form Modal */}
            {showMenuForm && (
                <div className="modal-overlay" onClick={() => setShowMenuForm(false)}>
                    <div className="modal" onClick={e => e.stopPropagation()}>
                        <h2>{editingItem ? 'Edit Menu Item' : 'Add Menu Item'}</h2>
                        <div className="form-group">
                            <label>Name *</label>
                            <input
                                type="text" className="form-control"
                                value={menuForm.name}
                                onChange={e => setMenuForm({ ...menuForm, name: e.target.value })}
                            />
                        </div>
                        <div className="form-group">
                            <label>Description</label>
                            <textarea
                                className="form-control" rows="3"
                                value={menuForm.description}
                                onChange={e => setMenuForm({ ...menuForm, description: e.target.value })}
                            />
                        </div>
                        <div className="form-group">
                            <label>Price *</label>
                            <input
                                type="number" className="form-control"
                                value={menuForm.price}
                                onChange={e => setMenuForm({ ...menuForm, price: e.target.value })}
                            />
                        </div>
                        <div className="form-group">
                            <label>Image URL</label>
                            <input
                                type="text" className="form-control"
                                value={menuForm.imageUrl}
                                onChange={e => setMenuForm({ ...menuForm, imageUrl: e.target.value })}
                            />
                        </div>
                        <div className="form-group">
                            <label>
                                <input
                                    type="checkbox"
                                    checked={menuForm.available}
                                    onChange={e => setMenuForm({ ...menuForm, available: e.target.checked })}
                                    style={{ marginRight: '0.5rem' }}
                                />
                                Available
                            </label>
                        </div>
                        <div style={{ display: 'flex', gap: '1rem' }}>
                            <button className="btn btn-primary" style={{ flex: 1 }} onClick={handleSaveMenu}>
                                {editingItem ? 'Update' : 'Add'}
                            </button>
                            <button className="btn btn-secondary" onClick={() => setShowMenuForm(false)}>
                                Cancel
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

export default OwnerDashboard;
