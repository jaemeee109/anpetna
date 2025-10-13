package com.anpetna.chat.config;

import com.anpetna.chat.handlers.WebSocketChatHandler;
import lombok.RequiredArgsConstructor;
import org.springframework.context.annotation.Configuration;
import org.springframework.web.socket.config.annotation.EnableWebSocket;
import org.springframework.web.socket.config.annotation.WebSocketConfigurer;
import org.springframework.web.socket.config.annotation.WebSocketHandlerRegistry;

@RequiredArgsConstructor
@EnableWebSocket    // 어플리케이션(서버)이 웹 소켓을 사용할 수 있도록
@Configuration
public class WebSocketConfiguration implements WebSocketConfigurer {

    final private WebSocketChatHandler webSocketChatHandler;

    @Override
    public void registerWebSocketHandlers(WebSocketHandlerRegistry registry) {
        registry.addHandler(webSocketChatHandler, "/ws/chats"); // webSocketChatHandler를 등록하기
    }

}
