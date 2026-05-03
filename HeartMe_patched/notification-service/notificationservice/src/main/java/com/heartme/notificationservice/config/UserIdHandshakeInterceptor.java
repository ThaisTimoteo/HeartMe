package com.heartme.notificationservice.config;

import java.net.URI;
import java.util.Map;

import org.springframework.http.server.ServerHttpRequest;
import org.springframework.http.server.ServerHttpResponse;
import org.springframework.lang.Nullable;
import org.springframework.web.socket.WebSocketHandler;
import org.springframework.web.socket.server.HandshakeInterceptor;

public class UserIdHandshakeInterceptor implements HandshakeInterceptor {

    @Override
    public boolean beforeHandshake(
            ServerHttpRequest request,
            ServerHttpResponse response,
            WebSocketHandler wsHandler,
            Map<String, Object> attributes
    ) {
        // Tenta pegar userId do query param: /ws?userId=<uuid>
        URI uri = request.getURI();
        String query = uri.getQuery(); // ex: "userId=..."
        if (query != null) {
            for (String part : query.split("&")) {
                String[] kv = part.split("=", 2);
                if (kv.length == 2 && "userId".equals(kv[0]) && kv[1] != null && !kv[1].isBlank()) {
                    attributes.put("userId", kv[1]);
                    break;
                }
            }
        }

        // fallback: header opcional
        if (!attributes.containsKey("userId")) {
            var header = request.getHeaders().getFirst("X-User-Id");
            if (header != null && !header.isBlank()) {
                attributes.put("userId", header);
            }
        }

        return true;
    }

    @Override
    public void afterHandshake(
            ServerHttpRequest request,
            ServerHttpResponse response,
            WebSocketHandler wsHandler,
            @Nullable Exception exception
    ) {
        // nada
    }
}
