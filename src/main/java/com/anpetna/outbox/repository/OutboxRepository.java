package com.anpetna.outbox.repository;

import com.anpetna.outbox.domain.OutboxEntity;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import java.util.List;

@Repository  // 없어도 JpaRepository 상속 시 자동 빈 등록
public interface OutboxRepository extends JpaRepository<OutboxEntity, Long> {

    List<OutboxEntity> findByProcessedFalseAndRetryCountLessThanOrderByCreatedAtAsc(int maxRetry);
}



