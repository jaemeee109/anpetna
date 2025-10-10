package com.anpetna.outbox.domain;

import com.anpetna.core.cosstant.AggregateType;
import jakarta.persistence.*;
import lombok.*;
import java.time.LocalDateTime;

@Entity
@Builder
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
@AllArgsConstructor
@ToString
@Table(name = "anpetna_outbox") //이벤트 타입 분기 가능 -> unique 키 x
public class OutboxEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long outBoxId;

    //aggregate는 이벤트를 그룹핑하고, 순서와 일관성을 보장하기 위한 단위
    @Enumerated(EnumType.STRING)
    private AggregateType aggregateType;

    private String aggregateId;

    private String topicName;

    //JPA에서 특정 필드가 DB에 저장될 때 직접적인 SQL 타입 정의를 해주고 싶은 경우
    @Column(columnDefinition = "json")
    private String payload;

    @Builder.Default
    private boolean processed = false;
    @Builder.Default
    private int retryCount = 0;

    private LocalDateTime lastAttemptAt;
    private LocalDateTime createdAt;

    public OutboxEntity completePendingEvent(){
        this.processed = true;
        this.lastAttemptAt = LocalDateTime.now();
        return this;
    }

    public OutboxEntity failPendingEvent(){
        this.retryCount++;
        this.lastAttemptAt = LocalDateTime.now();
        return this;
    }

}
