package com.anpetna.chat.config;

import com.anpetna.config.WebConfig;
import lombok.RequiredArgsConstructor;
import org.springframework.context.annotation.Configuration;
import org.springframework.messaging.simp.config.MessageBrokerRegistry;
import org.springframework.web.socket.config.annotation.EnableWebSocketMessageBroker;
import org.springframework.web.socket.config.annotation.StompEndpointRegistry;
import org.springframework.web.socket.config.annotation.WebSocketMessageBrokerConfigurer;

@EnableWebSocketMessageBroker
@Configuration
@RequiredArgsConstructor
public class StompConfiguration implements WebSocketMessageBrokerConfigurer {

    private final WebConfig webConfig;

    @Override
    public void registerStompEndpoints(StompEndpointRegistry registry) {
        registry.addEndpoint("/stomp/chats")
         .setAllowedOriginPatterns(webConfig.getFrontUrl()); // 추가
    }

    @Override
    public void configureMessageBroker(MessageBrokerRegistry registry) {
        registry.setApplicationDestinationPrefixes("/pub"); // 메세지를 publish 할 수 있는 url 지정 가능
        registry.enableSimpleBroker("/sub");    // sub라는 엔드포인트를 통해 메세지 구독을 신청할 수 있다.
    }
}
