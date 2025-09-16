package com.anpetna.pay.repository;

import com.anpetna.pay.domain.TossPaymentEntity;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;

public interface TossPaymentRepository extends JpaRepository<TossPaymentEntity, Long> {
    boolean existsByOrderTossId(String orderTossId);
    Optional<TossPaymentEntity> findByOrderTossId(String orderTossId);

    boolean existsByTossPaymentKey(String tossPaymentKey);
}

