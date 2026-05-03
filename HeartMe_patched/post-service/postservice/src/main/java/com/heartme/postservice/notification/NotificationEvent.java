package com.heartme.postservice.notification;

import java.time.Instant;
import java.util.UUID;

public class NotificationEvent {

    private UUID recipientUserId;
    private UUID actorUserId;
    private String type;      // ex: POST_LIKED
    private UUID entityId;    // ex: postId
    private String message;
    private Instant createdAt = Instant.now();

    public UUID getRecipientUserId() { return recipientUserId; }
    public void setRecipientUserId(UUID recipientUserId) { this.recipientUserId = recipientUserId; }

    public UUID getActorUserId() { return actorUserId; }
    public void setActorUserId(UUID actorUserId) { this.actorUserId = actorUserId; }

    public String getType() { return type; }
    public void setType(String type) { this.type = type; }

    public UUID getEntityId() { return entityId; }
    public void setEntityId(UUID entityId) { this.entityId = entityId; }

    public String getMessage() { return message; }
    public void setMessage(String message) { this.message = message; }

    public Instant getCreatedAt() { return createdAt; }
    public void setCreatedAt(Instant createdAt) { this.createdAt = createdAt; }
}
