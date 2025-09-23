package com.anpetna.item.repository;

import com.anpetna.item.domain.ItemEntity;
import com.anpetna.item.dto.ItemSalesDTO;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface ItemRepository extends JpaRepository<ItemEntity, Long>, ItemRepositoryCustom {

    //엔티티 자체 vs. 엔티티의 특정 칼럼
    @Query("""
        SELECT o.item AS item, SUM(o.quantity) AS quantity, SUM(o.price) AS price, o.item.itemCategory AS itemCategory
            FROM OrdersEntity oo
              JOIN OrderEntity o ON o.orders = oo
            WHERE oo.status = 'CONFIRMATION'
        GROUP BY o.item
            ORDER BY SUM(o.quantity) DESC
        """)
    public List<ItemSalesDTO> rankSalesQuantity();

}
