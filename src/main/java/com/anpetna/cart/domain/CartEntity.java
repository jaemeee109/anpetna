package com.anpetna.cart.domain;

import com.anpetna.item.domain.ItemEntity;
import com.anpetna.member.domain.MemberEntity;
import jakarta.persistence.*;
import lombok.*;

@Entity
@Table(
        name = "anpetna_cart",
        indexes = {
                @Index(name = "idx_cart_member", columnList = "member_id"),
                @Index(name = "idx_cart_item",   columnList = "item_id")
        },
        uniqueConstraints = {
                @UniqueConstraint(name = "ux_cart_member_item", columnNames = {"member_id", "item_id"})
        }
        // 조회 중복 방지
)
@Getter
@Setter
@Builder
@AllArgsConstructor
@NoArgsConstructor
@ToString(exclude = {"member", "item"})
public class CartEntity {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column (name = "cart_id")
    private Long cartId;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "member_id", nullable = false, referencedColumnName = "member_id")
    private MemberEntity member;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "item_id", nullable = false, referencedColumnName = "item_id")
    private ItemEntity item;

    @Column(name = "item_quantity", nullable = false) @Builder.Default
    private int quantity = 1;

}