package com.heartme.authservice.dto;

import java.time.LocalDateTime;
import java.util.UUID;

public class RegisterResponse {
    private UUID id;
    private String email;
    private boolean enabled;
    private LocalDateTime createdAt;

    public RegisterResponse(UUID id, String email, boolean enabled, LocalDateTime createdAt) {
        this.id = id;
        this.email = email;
        this.enabled = enabled;
        this.createdAt = createdAt;
    }

    public UUID getId() { return id; }
    public String getEmail() { return email; }
    public boolean isEnabled() { return enabled; }
    public LocalDateTime getCreatedAt() { return createdAt; }
}
