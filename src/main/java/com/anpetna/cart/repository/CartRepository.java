package com.anpetna.cart.repository;

import com.anpetna.cart.domain.CartEntity;
import com.anpetna.member.domain.MemberEntity;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.Optional;

public interface CartRepository extends JpaRepository<CartEntity, Long> {

    // 페이징 + fetch join (ManyToOne만 조인하므로 페이징 안전)
    @Query(
            value = """
            select c
            from CartEntity c
            join fetch c.item i
            join fetch c.member m
            where m.memberId = :memberId
            """,
            countQuery = """
            select count(c)
            from CartEntity c
            where c.member.memberId = :memberId
            """
    )
    Page<CartEntity> findPageWithFetchJoinByMemberId(
            @Param("memberId") String memberId,
            Pageable pageable
    );

    // 합계 계산용: item 가격 접근 시 N+1 방지를 위해 fetch join
    @Query("""
        select c
        from CartEntity c
        join fetch c.item i
        where c.member.memberId = :memberId
        """)

    List<CartEntity> findAllWithItemByMemberId(@Param("memberId") String memberId);

    // 개별 항목 조회
    Optional<CartEntity> findByMember_MemberIdAndItem_ItemId(String memberId, Long itemId);

}
