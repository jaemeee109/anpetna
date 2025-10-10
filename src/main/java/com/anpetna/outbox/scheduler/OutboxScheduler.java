package com.anpetna.outbox.scheduler;

import com.anpetna.core.publisher.EventPublisher;
import lombok.RequiredArgsConstructor;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

//@Component
@RequiredArgsConstructor
public class OutboxScheduler {

    private final EventPublisher eventPublisher;

    //@Scheduled(fixedDelay = 5000)
    public void processOutbox() {
        eventPublisher.processPendingEvents(5);  // 최대 5회 재처리
    }

}

