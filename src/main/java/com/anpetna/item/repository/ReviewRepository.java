package com.anpetna.item.repository;

import com.anpetna.item.domain.ReviewEntity;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface ReviewRepository extends JpaRepository<ReviewEntity, Long>, ReviewRepositoryCustom {

    // 리뷰id(pk)과 멤버id가 동시에 일치하는 행이 존재하는가?
    @Query("SELECT COUNT(r) > 0 FROM ReviewEntity r WHERE r.reviewId = :reviewId AND r.memberId.memberId = :memberId")
    boolean IsOwnerOfReview(@Param("reviewId") Long reviewId, @Param("memberId") String memberId);

    boolean existsByMemberId_MemberIdAndItemId_ItemId(String memberIdMemberId, Long itemIdItemId);
}
