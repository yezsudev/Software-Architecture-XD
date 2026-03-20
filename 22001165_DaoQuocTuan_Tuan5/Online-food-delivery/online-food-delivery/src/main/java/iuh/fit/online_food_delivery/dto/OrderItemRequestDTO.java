package iuh.fit.online_food_delivery.dto;

import lombok.*;

@Getter @Setter
@NoArgsConstructor @AllArgsConstructor
@Builder
public class OrderItemRequestDTO {
    private Long menuItemId;
    private Integer quantity;
}
