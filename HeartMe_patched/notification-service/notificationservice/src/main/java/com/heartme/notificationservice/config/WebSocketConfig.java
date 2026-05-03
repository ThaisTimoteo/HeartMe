package com.heartme.notificationservice.config;

import org.springframework.context.annotation.Configuration;
import org.springframework.messaging.simp.config.MessageBrokerRegistry;
import org.springframework.web.socket.config.annotation.EnableWebSocketMessageBroker;
import org.springframework.web.socket.config.annotation.StompEndpointRegistry;
import org.springframework.web.socket.config.annotation.WebSocketMessageBrokerConfigurer;

@Configuration
@EnableWebSocketMessageBroker
public class WebSocketConfig implements WebSocketMessageBrokerConfigurer {

    @Override
    public void configureMessageBroker(MessageBrokerRegistry config) {
        config.enableSimpleBroker("/queue", "/topic");
        config.setApplicationDestinationPrefixes("/app");
        config.setUserDestinationPrefix("/user");
    }

    @Override
    public void registerStompEndpoints(StompEndpointRegistry registry) {
        UserIdHandshakeInterceptor interceptor = new UserIdHandshakeInterceptor();
        UserIdHandshakeHandler handshakeHandler = new UserIdHandshakeHandler();

        registry.addEndpoint("/ws")
                .setAllowedOriginPatterns("*")
                .addInterceptors(interceptor)
                .setHandshakeHandler(handshakeHandler);

        registry.addEndpoint("/ws")
                .setAllowedOriginPatterns("*")
                .addInterceptors(interceptor)
                .setHandshakeHandler(handshakeHandler)
                .withSockJS()
                .setInterceptors(interceptor);
    }
}
