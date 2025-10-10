package com.anpetna.outbox.publisher;

import com.anpetna.core.dto.EventDTO;
import com.anpetna.core.publisher.EventPublisher;
import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.anpetna.outbox.domain.OutboxEntity;
import com.anpetna.outbox.repository.OutboxRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.log4j.Log4j2;
import org.modelmapper.ModelMapper;
import org.springframework.kafka.core.KafkaTemplate;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;
import java.util.List;

@Component
@RequiredArgsConstructor
@Log4j2
public class EventPublisherImpl implements EventPublisher {

    private final OutboxRepository outboxRepository;
    private final KafkaTemplate<String, Object> kafkaTemplate;
    private final ModelMapper modelMapper;
    private final ObjectMapper objectMapper;

    @Transactional
    public void publishEvent(EventDTO event){
        log.info("Publishing event: " + event);
        try {
            String jasonPayload = objectMapper.writeValueAsString(event.getPayload());
            log.info("payload JasonSerialized: " + jasonPayload);
            event.setPayload(jasonPayload);
            log.info("set JasonSerialized payload to event: " + event);
        }catch (JsonProcessingException e){
            e.printStackTrace();
        }
        OutboxEntity outboxEntity = modelMapper.map(event, OutboxEntity.class);
        log.info("Mapping result: " + outboxEntity);

        outboxRepository.save(outboxEntity);  // JPA가 중복 키 오류 발생 시 예외

        kafkaTemplate.send(event.getTopicName(), event.getAggregateId(),event.getPayload());
        kafkaTemplate.flush();
    }


    @Transactional
    public void processPendingEvents(int maxRetry) {    //아직 처리되지 않은 이벤트를 찾아 실제로 발행/처리하는 역할
        List<OutboxEntity> events = outboxRepository.findByProcessedFalseAndRetryCountLessThanOrderByCreatedAtAsc(maxRetry);
        for (OutboxEntity event : events) {
            try {
                // Kafka 발행, Redis 갱신 등 처리 로직
                outboxRepository.save(event.completePendingEvent());
            } catch (Exception ex) {
                outboxRepository.save(event.failPendingEvent());
            }
        }
    }

}
