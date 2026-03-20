CREATE DATABASE IF NOT EXISTS food_delivery;
USE food_delivery;

-- Restaurant table
CREATE TABLE restaurant (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    address VARCHAR(500),
    phone VARCHAR(20),
    image_url VARCHAR(500),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Menu item table
CREATE TABLE menu_item (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    restaurant_id BIGINT NOT NULL,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    price DECIMAL(10,2) NOT NULL,
    image_url VARCHAR(500),
    available BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (restaurant_id) REFERENCES restaurant(id) ON DELETE CASCADE
);

-- Order table
CREATE TABLE customer_order (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    restaurant_id BIGINT NOT NULL,
    customer_name VARCHAR(255) NOT NULL,
    customer_phone VARCHAR(20),
    delivery_address VARCHAR(500) NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'PENDING',
    total_price DECIMAL(10,2) NOT NULL DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (restaurant_id) REFERENCES restaurant(id)
);

-- Order item table
CREATE TABLE order_item (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    order_id BIGINT NOT NULL,
    menu_item_id BIGINT NOT NULL,
    quantity INT NOT NULL DEFAULT 1,
    price DECIMAL(10,2) NOT NULL,
    FOREIGN KEY (order_id) REFERENCES customer_order(id) ON DELETE CASCADE,
    FOREIGN KEY (menu_item_id) REFERENCES menu_item(id)
);

-- Sample data
INSERT INTO restaurant (name, address, phone, image_url) VALUES
('Pho Ha Noi', '123 Le Loi, Q1, HCM', '0901234567', 'https://images.unsplash.com/photo-1555126634-323283e090fa?w=400'),
('Bun Bo Hue', '456 Nguyen Hue, Q1, HCM', '0907654321', 'https://images.unsplash.com/photo-1569058242253-92a9c755a0ec?w=400'),
('Pizza Italia', '789 Tran Hung Dao, Q5, HCM', '0912345678', 'https://images.unsplash.com/photo-1565299624946-b28f40a0ae38?w=400');

INSERT INTO menu_item (restaurant_id, name, description, price, image_url) VALUES
(1, 'Pho Bo', 'Traditional beef pho with herbs', 55000, 'https://images.unsplash.com/photo-1555126634-323283e090fa?w=300'),
(1, 'Pho Ga', 'Chicken pho with fresh noodles', 50000, 'https://images.unsplash.com/photo-1576577445504-6af96477db52?w=300'),
(1, 'Goi Cuon', 'Fresh spring rolls', 35000, 'https://images.unsplash.com/photo-1559314809-0d155014e29e?w=300'),
(2, 'Bun Bo Hue', 'Spicy beef noodle soup', 60000, 'https://images.unsplash.com/photo-1569058242253-92a9c755a0ec?w=300'),
(2, 'Banh Beo', 'Steamed rice cakes', 30000, 'https://images.unsplash.com/photo-1455619452474-d2be8b1e70cd?w=300'),
(3, 'Margherita Pizza', 'Classic tomato and mozzarella', 120000, 'https://images.unsplash.com/photo-1565299624946-b28f40a0ae38?w=300'),
(3, 'Pepperoni Pizza', 'Pepperoni with cheese', 140000, 'https://images.unsplash.com/photo-1628840042765-356cda07504e?w=300'),
(3, 'Pasta Carbonara', 'Creamy carbonara pasta', 95000, 'https://images.unsplash.com/photo-1612874742237-6526221588e3?w=300');
