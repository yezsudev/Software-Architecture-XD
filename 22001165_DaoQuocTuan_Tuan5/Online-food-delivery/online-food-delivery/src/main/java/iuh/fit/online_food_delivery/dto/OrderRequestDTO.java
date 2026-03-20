package iuh.fit.online_food_delivery.dto;

import lombok.*;
import java.util.List;

@Getter @Setter
@NoArgsConstructor @AllArgsConstructor
@Builder
public class OrderRequestDTO {
    private Long restaurantId;
    private String customerName;
    private String customerPhone;
    private String deliveryAddress;
    private List<OrderItemRequestDTO> items;
}
