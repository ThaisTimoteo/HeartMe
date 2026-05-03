package com.heartme.notificationservice.controller;

import java.util.UUID;

import org.springframework.http.ResponseEntity;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.heartme.notificationservice.dto.NotificationEventRequest;
import com.heartme.notificationservice.dto.NotificationWSMessage;
import com.heartme.notificationservice.service.NotificationService;

import jakarta.validation.Valid;

@RestController
@RequestMapping("/internal/notifications")
@Validated
public class InternalNotificationController {

    private final NotificationService notificationService;

    public InternalNotificationController(NotificationService notificationService) {
        this.notificationService = notificationService;
    }

    @PostMapping("/events")
    public ResponseEntity<NotificationWSMessage> receiveEvent(@Valid @RequestBody NotificationEventRequest request) {
        return ResponseEntity.ok(notificationService.handleEvent(request));
    }

    @DeleteMapping("/users/{userId}")
    public ResponseEntity<Void> deleteByUser(@PathVariable UUID userId) {
        notificationService.deleteByUser(userId);
        return ResponseEntity.noContent().build();
    }
}
