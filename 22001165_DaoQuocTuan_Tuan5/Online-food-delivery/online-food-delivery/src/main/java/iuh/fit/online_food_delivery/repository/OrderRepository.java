package iuh.fit.online_food_delivery.repository;

import iuh.fit.online_food_delivery.entity.CustomerOrder;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import java.util.List;

@Repository
public interface OrderRepository extends JpaRepository<CustomerOrder, Long> {
    List<CustomerOrder> findByRestaurantIdOrderByCreatedAtDesc(Long restaurantId);
}
