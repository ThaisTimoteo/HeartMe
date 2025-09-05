package com.heartme.userservice.controller;

import com.heartme.userservice.service.UserService;
import com.heartme.userservice.model.UserProfile;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@RestController
@RequestMapping("/users")
public class UserController {

    private final UserService userService;

    public UserController(UserService userService) {
        this.userService = userService;
    }

    @PostMapping
    public ResponseEntity<UserProfile> create(@RequestBody UserProfile user) {
        UserProfile created = userService.create(user);
        return ResponseEntity.ok(created);
    }

    @GetMapping("/{id}")
    public ResponseEntity<UserProfile> getById(@PathVariable UUID id) {
        Optional<UserProfile> user = userService.getById(id);
        return user.map(ResponseEntity::ok)
                   .orElse(ResponseEntity.notFound().build());
    }

    @GetMapping("/by-auth/{userId}")
    public ResponseEntity<UserProfile> getByUserId(@PathVariable UUID userId) {
        Optional<UserProfile> user = userService.getByUserId(userId);
        return user.map(ResponseEntity::ok)
                   .orElse(ResponseEntity.notFound().build());
    }

    @GetMapping
    public ResponseEntity<List<UserProfile>> getAll() {
        return ResponseEntity.ok(userService.getAll());
    }

    @PutMapping("/{id}")
    public ResponseEntity<UserProfile> update(@PathVariable UUID id, @RequestBody UserProfile updatedUser) {
        try {
            UserProfile user = userService.update(id, updatedUser);
            return ResponseEntity.ok(user);
        } catch (RuntimeException e) {
            return ResponseEntity.notFound().build();
        }
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> delete(@PathVariable UUID id) {
        userService.delete(id);
        return ResponseEntity.noContent().build();
    }
}
