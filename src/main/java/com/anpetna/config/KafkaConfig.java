package com.anpetna.config;

import org.apache.kafka.clients.admin.NewTopic;
import org.apache.kafka.clients.consumer.ConsumerConfig;
import org.apache.kafka.clients.producer.ProducerConfig;
import org.apache.kafka.common.serialization.StringDeserializer;
import org.apache.kafka.common.serialization.StringSerializer;
import org.springframework.boot.autoconfigure.AutoConfiguration;
import org.springframework.boot.autoconfigure.condition.ConditionalOnMissingBean;
import org.springframework.boot.autoconfigure.kafka.KafkaProperties;
import org.springframework.context.annotation.Bean;
import org.springframework.kafka.annotation.EnableKafka;
import org.springframework.kafka.config.ConcurrentKafkaListenerContainerFactory;
import org.springframework.kafka.config.TopicBuilder;
import org.springframework.kafka.core.*;
import org.springframework.kafka.listener.ContainerProperties;
import org.springframework.kafka.support.serializer.JsonDeserializer;
import org.springframework.kafka.support.serializer.JsonSerializer;

import java.util.HashMap;
import java.util.List;
import java.util.Map;

@AutoConfiguration
@EnableKafka
public class KafkaConfig {

    // ---------------- Producer ----------------
    @Bean
    public ProducerFactory<String, Object> producerFactory(KafkaProperties props) {
        Map<String, Object> config = new HashMap<>(props.buildProducerProperties());
        config.put(ProducerConfig.KEY_SERIALIZER_CLASS_CONFIG, StringSerializer.class);
        config.put(ProducerConfig.VALUE_SERIALIZER_CLASS_CONFIG, JsonSerializer.class);
        return new DefaultKafkaProducerFactory<>(config);
    }

    @Bean
    @ConditionalOnMissingBean
    public KafkaTemplate<String, Object> kafkaTemplate(ProducerFactory<String, Object> factory) {
        return new KafkaTemplate<>(factory);
    }

    // ---------------- Consumer ----------------
    @Bean
    public ConcurrentKafkaListenerContainerFactory<String, Object> paymentGroupFactory(KafkaProperties props) {
        // 기존 baseConsumerFactory를 쓰지 않고 새 맵을 생성
        Map<String, Object> consumerProps = new HashMap<>(props.buildConsumerProperties());
        consumerProps.put(ConsumerConfig.GROUP_ID_CONFIG, "payment-group");

        JsonDeserializer<Object> deserializer = new JsonDeserializer<>(Object.class);
        deserializer.addTrustedPackages("*");

        ConsumerFactory<String, Object> consumerFactory =
                new DefaultKafkaConsumerFactory<>(consumerProps, new StringDeserializer(), deserializer);

        ConcurrentKafkaListenerContainerFactory<String, Object> factory =
                new ConcurrentKafkaListenerContainerFactory<>();
        factory.setConsumerFactory(consumerFactory);
        factory.setConcurrency(1);
        factory.getContainerProperties().setAckMode(ContainerProperties.AckMode.MANUAL);
        return factory;
    }


    // ---------------- Topic ----------------
   @Bean
    public List<NewTopic> topics() {
        return List.of(
                TopicBuilder.name("order-topic").partitions(3).replicas(1).build(),
                TopicBuilder.name("payment-topic").partitions(3).replicas(1).build(),
                TopicBuilder.name("accounting-topic").partitions(3).replicas(1).build(),
                TopicBuilder.name("notification-topic").partitions(3).replicas(1).build()
        );
    }
}
