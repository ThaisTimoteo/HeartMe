package com.heartme.notificationservice.config;

import java.security.Principal;
import java.util.Map;

import org.springframework.http.server.ServerHttpRequest;
import org.springframework.web.socket.WebSocketHandler;
import org.springframework.web.socket.server.support.DefaultHandshakeHandler;

public class UserIdHandshakeHandler extends DefaultHandshakeHandler {

    @Override
    protected Principal determineUser(
            ServerHttpRequest request,
            WebSocketHandler wsHandler,
            Map<String, Object> attributes
    ) {
        Object userId = attributes.get("userId");
        if (userId != null) {
            String name = String.valueOf(userId);
            return new StompPrincipal(name);
        }
        // fallback (se não vier userId, usa comportamento default)
        return super.determineUser(request, wsHandler, attributes);
    }

    private static class StompPrincipal implements Principal {
        private final String name;
        private StompPrincipal(String name) { this.name = name; }
        @Override public String getName() { return name; }
    }
}

