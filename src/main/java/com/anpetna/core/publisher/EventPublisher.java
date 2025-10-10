package com.anpetna.core.publisher;

import com.anpetna.core.dto.EventDTO;

public interface EventPublisher {

    public void publishEvent(EventDTO event);

    public void processPendingEvents(int maxRetry);
}
