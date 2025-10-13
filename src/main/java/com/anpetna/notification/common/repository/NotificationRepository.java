package com.anpetna.notification.common.repository;

import com.anpetna.notification.common.domain.NotificationEntity;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.*;
import org.springframework.data.repository.query.Param;
import org.springframework.transaction.annotation.Transactional;

import java.util.Optional;

public interface NotificationRepository extends JpaRepository<NotificationEntity, Long> {

    // 전체 알림 (정렬은 Pageable에서 지정)
    Page<NotificationEntity> findByReceiver_MemberId(String receiverMemberId, Pageable pageable);

    // 미읽음 알림만 (정렬은 Pageable에서 지정)
    Page<NotificationEntity> findByReceiver_MemberIdAndIsReadFalse(String receiverMemberId, Pageable pageable);

    // 읽지 않은 개수 (뱃지 표시용)
    long countByReceiver_MemberIdAndIsReadFalse(String receiverMemberId);

    @Query("""
        select n
        from NotificationEntity n
        where n.nId = :nId
          and n.receiver.memberId = :receiverMemberId
    """)
    Optional<NotificationEntity> findOneByIdAndOwner(@Param("nId") Long nId,
                                                     @Param("receiverMemberId") String receiverMemberId);

    @Modifying
    @Transactional
    @Query("""
        update NotificationEntity n
        set n.isRead = true,
        n.readAt = current_timestamp
        where n.receiver.memberId = :memberId
        and n.isRead = false
    """)
    int markAllRead(String memberId);

}