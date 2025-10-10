package com.anpetna.core.dto;


import com.anpetna.core.cosstant.AggregateType;
import lombok.Builder;
import lombok.Getter;
import lombok.Setter;
import lombok.ToString;

@Builder
@Getter
@Setter
@ToString
public class EventDTO<T> {

    private AggregateType aggregateType;

    private String aggregateId;

    private String topicName;

    private T payload;

}
