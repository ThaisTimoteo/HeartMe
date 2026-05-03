package com.heartme.notificationservice.service;

import java.util.List;
import java.util.UUID;

import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.heartme.notificationservice.dto.NotificationEventRequest;
import com.heartme.notificationservice.dto.NotificationReadResponse;
import com.heartme.notificationservice.dto.NotificationWSMessage;
import com.heartme.notificationservice.model.Notification;
import com.heartme.notificationservice.repository.NotificationRepository;

@Service
public class NotificationService {

    private final NotificationRepository repository;
    private final SimpMessagingTemplate messagingTemplate;

    public NotificationService(NotificationRepository repository, SimpMessagingTemplate messagingTemplate) {
        this.repository = repository;
        this.messagingTemplate = messagingTemplate;
    }

    @Transactional
    public NotificationWSMessage handleEvent(NotificationEventRequest req) {
        Notification n = new Notification();
        n.setRecipientUserId(req.getRecipientUserId());
        n.setActorUserId(req.getActorUserId());
        n.setType(req.getType());
        n.setEntityId(req.getEntityId());
        n.setMessage(req.getMessage());

        n = repository.save(n);

        NotificationWSMessage msg = toWsMessage(n);
        UUID userId = n.getRecipientUserId();
        messagingTemplate.convertAndSendToUser(userId.toString(), "/queue/notifications", msg);

        return msg;
    }

    @Transactional(readOnly = true)
    public List<NotificationReadResponse> listByRecipient(UUID recipientUserId) {
        return repository.findTop50ByRecipientUserIdOrderByCreatedAtDesc(recipientUserId)
                .stream()
                .map(this::toReadResponse)
                .toList();
    }

    @Transactional
    public void deleteByUser(UUID userId) {
        repository.deleteByRecipientUserIdOrActorUserId(userId, userId);
    }

    @Transactional
    public NotificationReadResponse markAsRead(UUID notificationId, UUID requesterUserId) {
        Notification notification = repository.findById(notificationId)
                .orElseThrow(() -> new RuntimeException("Notificação não encontrada"));
        if (!notification.getRecipientUserId().equals(requesterUserId)) {
            throw new RuntimeException("Você não pode alterar notificações de outro usuário");
        }
        notification.setRead(true);
        return toReadResponse(repository.save(notification));
    }

    private NotificationReadResponse toReadResponse(Notification n) {
        NotificationReadResponse m = new NotificationReadResponse();
        m.setId(n.getId());
        m.setRecipientUserId(n.getRecipientUserId());
        m.setActorUserId(n.getActorUserId());
        m.setType(n.getType());
        m.setEntityId(n.getEntityId());
        m.setMessage(n.getMessage());
        m.setRead(n.isRead());
        m.setCreatedAt(n.getCreatedAt());
        return m;
    }

    private NotificationWSMessage toWsMessage(Notification n) {
        NotificationWSMessage m = new NotificationWSMessage();
        m.setId(n.getId());
        m.setRecipientUserId(n.getRecipientUserId());
        m.setActorUserId(n.getActorUserId());
        m.setType(n.getType());
        m.setEntityId(n.getEntityId());
        m.setMessage(n.getMessage());
        m.setRead(n.isRead());
        m.setCreatedAt(n.getCreatedAt());
        return m;
    }
}
