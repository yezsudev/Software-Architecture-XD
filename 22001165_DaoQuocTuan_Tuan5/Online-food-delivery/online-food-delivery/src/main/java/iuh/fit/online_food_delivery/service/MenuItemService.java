package iuh.fit.online_food_delivery.service;

import iuh.fit.online_food_delivery.dto.MenuItemDTO;
import iuh.fit.online_food_delivery.entity.MenuItem;
import iuh.fit.online_food_delivery.entity.Restaurant;
import iuh.fit.online_food_delivery.repository.MenuItemRepository;
import iuh.fit.online_food_delivery.repository.RestaurantRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import java.util.List;

@Service
@RequiredArgsConstructor
public class MenuItemService {

    private final MenuItemRepository menuItemRepository;
    private final RestaurantRepository restaurantRepository;

    public List<MenuItem> getMenuItemsByRestaurant(Long restaurantId) {
        return menuItemRepository.findByRestaurant_Id(restaurantId);
    }

    public MenuItem getMenuItemById(Long id) {
        return menuItemRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Menu item not found with id: " + id));
    }

    public MenuItem createMenuItem(MenuItemDTO dto) {
        Restaurant restaurant = restaurantRepository.findById(dto.getRestaurantId())
                .orElseThrow(() -> new RuntimeException("Restaurant not found with id: " + dto.getRestaurantId()));

        MenuItem item = MenuItem.builder()
                .restaurant(restaurant)
                .name(dto.getName())
                .description(dto.getDescription())
                .price(dto.getPrice())
                .imageUrl(dto.getImageUrl())
                .available(dto.getAvailable() != null ? dto.getAvailable() : true)
                .build();
        return menuItemRepository.save(item);
    }

    public MenuItem updateMenuItem(Long id, MenuItemDTO dto) {
        MenuItem item = getMenuItemById(id);
        item.setName(dto.getName());
        item.setDescription(dto.getDescription());
        item.setPrice(dto.getPrice());
        item.setImageUrl(dto.getImageUrl());
        if (dto.getAvailable() != null) {
            item.setAvailable(dto.getAvailable());
        }
        return menuItemRepository.save(item);
    }

    public void deleteMenuItem(Long id) {
        menuItemRepository.deleteById(id);
    }
}
