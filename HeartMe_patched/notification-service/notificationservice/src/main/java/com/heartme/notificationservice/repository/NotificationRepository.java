package com.heartme.notificationservice.repository;

import java.util.List;
import java.util.UUID;

import org.springframework.data.jpa.repository.JpaRepository;

import com.heartme.notificationservice.model.Notification;

public interface NotificationRepository extends JpaRepository<Notification, UUID> {
    List<Notification> findTop50ByRecipientUserIdOrderByCreatedAtDesc(UUID recipientUserId);

    void deleteByRecipientUserIdOrActorUserId(UUID recipientUserId, UUID actorUserId);
}
