package iuh.fit.online_food_delivery.service;

import iuh.fit.online_food_delivery.dto.OrderItemRequestDTO;
import iuh.fit.online_food_delivery.dto.OrderRequestDTO;
import iuh.fit.online_food_delivery.entity.*;
import iuh.fit.online_food_delivery.enums.OrderStatus;
import iuh.fit.online_food_delivery.repository.*;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.util.List;

@Service
@RequiredArgsConstructor
public class OrderService {

    private final OrderRepository orderRepository;
    private final MenuItemRepository menuItemRepository;
    private final RestaurantRepository restaurantRepository;

    @Transactional
    public CustomerOrder placeOrder(OrderRequestDTO dto) {
        Restaurant restaurant = restaurantRepository.findById(dto.getRestaurantId())
                .orElseThrow(() -> new RuntimeException("Restaurant not found with id: " + dto.getRestaurantId()));

        CustomerOrder order = CustomerOrder.builder()
                .restaurant(restaurant)
                .customerName(dto.getCustomerName())
                .customerPhone(dto.getCustomerPhone())
                .deliveryAddress(dto.getDeliveryAddress())
                .status(OrderStatus.PENDING)
                .totalPrice(BigDecimal.ZERO)
                .build();

        BigDecimal total = BigDecimal.ZERO;

        for (OrderItemRequestDTO itemReq : dto.getItems()) {
            MenuItem menuItem = menuItemRepository.findById(itemReq.getMenuItemId())
                    .orElseThrow(() -> new RuntimeException("Menu item not found"));

            BigDecimal itemTotal = menuItem.getPrice().multiply(BigDecimal.valueOf(itemReq.getQuantity()));
            total = total.add(itemTotal);

            OrderItem orderItem = OrderItem.builder()
                    .order(order)
                    .menuItem(menuItem)
                    .quantity(itemReq.getQuantity())
                    .price(itemTotal)
                    .build();

            order.getOrderItems().add(orderItem);
        }

        order.setTotalPrice(total);
        return orderRepository.save(order);
    }

    public CustomerOrder getOrderById(Long id) {
        return orderRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Order not found with id: " + id));
    }

    public List<CustomerOrder> getOrdersByRestaurant(Long restaurantId) {
        return orderRepository.findByRestaurantIdOrderByCreatedAtDesc(restaurantId);
    }

    @Transactional
    public CustomerOrder updateOrderStatus(Long id, OrderStatus status) {
        CustomerOrder order = getOrderById(id);
        order.setStatus(status);
        return orderRepository.save(order);
    }
}
