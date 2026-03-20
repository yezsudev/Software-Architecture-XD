package iuh.fit.online_food_delivery.controller;

import iuh.fit.online_food_delivery.dto.OrderRequestDTO;
import iuh.fit.online_food_delivery.entity.CustomerOrder;
import iuh.fit.online_food_delivery.enums.OrderStatus;
import iuh.fit.online_food_delivery.service.OrderService;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;
import java.util.List;

@RestController
@RequestMapping("/api/orders")
@RequiredArgsConstructor
public class OrderController {

    private final OrderService orderService;

    @PostMapping
    public CustomerOrder placeOrder(@RequestBody OrderRequestDTO dto) {
        return orderService.placeOrder(dto);
    }

    @GetMapping("/{id}")
    public CustomerOrder getOrder(@PathVariable Long id) {
        return orderService.getOrderById(id);
    }

    @GetMapping("/restaurant/{restaurantId}")
    public List<CustomerOrder> getOrdersByRestaurant(@PathVariable Long restaurantId) {
        return orderService.getOrdersByRestaurant(restaurantId);
    }

    @PutMapping("/{id}/status")
    public CustomerOrder updateStatus(@PathVariable Long id, @RequestParam OrderStatus status) {
        return orderService.updateOrderStatus(id, status);
    }
}
