package com.heartme.postservice.notification;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestTemplate;

/**
 * Ponte pro Notification Service (que você ainda vai criar).
 * Por enquanto: tenta enviar via REST e NÃO quebra o fluxo se não existir (fail-open).
 */
@Component
public class NotificationPublisher {

    private static final Logger log = LoggerFactory.getLogger(NotificationPublisher.class);

    private final boolean enabled;
    private final String baseUrl;
    private final RestTemplate restTemplate;

    public NotificationPublisher(
            @Value("${notification.enabled:false}") boolean enabled,
            @Value("${notification.baseUrl:http://localhost:8083}") String baseUrl,
            RestTemplate restTemplate
    ) {
        this.enabled = enabled;
        this.baseUrl = baseUrl;
        this.restTemplate = restTemplate;
    }

    public void publish(NotificationEvent event) {
        if (!enabled) {
            // deixa rastreável, mas sem barulho demais
            log.debug("[notification.disabled] {}", event.getType());
            return;
        }

        try {
            // endpoint que você vai criar no Notification Service no futuro
            restTemplate.postForEntity(baseUrl + "/internal/notifications/events", event, Void.class);
        } catch (Exception ex) {
            // fail-open: não atrapalha like/post
            log.warn("Falha ao publicar notificação (Notification Service ainda não está no ar?): {}", ex.getMessage());
        }
    }
}
