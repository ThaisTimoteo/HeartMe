package com.heartme.notificationservice.dto;

import java.util.UUID;

import jakarta.validation.constraints.NotNull;

public class NotificationEventRequest {

    @NotNull
    private UUID recipientUserId;

    @NotNull
    private UUID actorUserId;

    @NotNull
    private String type;

    @NotNull
    private UUID entityId;

    private String message;

    public UUID getRecipientUserId() {
        return recipientUserId;
    }

    public void setRecipientUserId(UUID recipientUserId) {
        this.recipientUserId = recipientUserId;
    }

    public UUID getActorUserId() {
        return actorUserId;
    }

    public void setActorUserId(UUID actorUserId) {
        this.actorUserId = actorUserId;
    }

    public String getType() {
        return type;
    }

    public void setType(String type) {
        this.type = type;
    }

    public UUID getEntityId() {
        return entityId;
    }

    public void setEntityId(UUID entityId) {
        this.entityId = entityId;
    }

    public String getMessage() {
        return message;
    }

    public void setMessage(String message) {
        this.message = message;
    }
}
