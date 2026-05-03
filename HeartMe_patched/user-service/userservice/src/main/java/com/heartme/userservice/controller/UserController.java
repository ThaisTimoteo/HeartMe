package com.heartme.userservice.controller;

import com.heartme.userservice.dto.UserCreateRequest;
import com.heartme.userservice.model.Folder;
import com.heartme.userservice.model.UserProfile;
import com.heartme.userservice.service.UserService;

import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.security.Principal;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;

@RestController
@RequestMapping("/users")
public class UserController {

    private final UserService userService;

    public UserController(UserService userService) {
        this.userService = userService;
    }

    @GetMapping("/me")
    public ResponseEntity<UserProfile> me(Principal principal) {
        if (principal == null || principal.getName() == null) {
            return ResponseEntity.status(401).build();
        }

        UUID userId = UUID.fromString(principal.getName());

        return userService.getByUserId(userId)
                .map(ResponseEntity::ok)
                .orElse(ResponseEntity.notFound().build());
    }

    @PostMapping
    public ResponseEntity<UserProfile> create(@RequestBody UserCreateRequest request, Principal principal) {
        if (principal == null || principal.getName() == null) {
            return ResponseEntity.status(401).build();
        }

        UUID userId = UUID.fromString(principal.getName());
        UserProfile created = userService.create(userId, request);
        return ResponseEntity.status(201).body(created);
    }

    @GetMapping("/search")
    public ResponseEntity<List<UserProfile>> search(@RequestParam(name = "q", required = false) String query) {
        return ResponseEntity.ok(userService.search(query));
    }

    @GetMapping("/{id}")
    public ResponseEntity<UserProfile> getById(@PathVariable UUID id) {
        Optional<UserProfile> user = userService.getById(id);
        return user.map(ResponseEntity::ok).orElse(ResponseEntity.notFound().build());
    }

    @GetMapping("/by-auth/{userId}")
    public ResponseEntity<UserProfile> getByUserId(@PathVariable UUID userId) {
        Optional<UserProfile> user = userService.getByUserId(userId);
        return user.map(ResponseEntity::ok).orElse(ResponseEntity.notFound().build());
    }

    @GetMapping
    public ResponseEntity<List<UserProfile>> getAll() {
        return ResponseEntity.ok(userService.getAll());
    }

    @PutMapping("/{id}")
    public ResponseEntity<?> update(@PathVariable UUID id, @RequestBody UserProfile updatedUser, Principal principal) {
        try {
            if (principal == null || principal.getName() == null) {
                return ResponseEntity.status(401).build();
            }
            UUID requesterId = UUID.fromString(principal.getName());
            UserProfile user = userService.update(id, requesterId, updatedUser);
            return ResponseEntity.ok(user);
        } catch (RuntimeException e) {
            return ResponseEntity.badRequest().body(e.getMessage());
        }
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<?> delete(@PathVariable UUID id, Principal principal) {
        try {
            if (principal == null || principal.getName() == null) {
                return ResponseEntity.status(401).build();
            }
            UUID requesterId = UUID.fromString(principal.getName());
            userService.delete(id, requesterId);
            return ResponseEntity.noContent().build();
        } catch (RuntimeException e) {
            return ResponseEntity.badRequest().body(e.getMessage());
        }
    }

    @DeleteMapping("/me/account")
    public ResponseEntity<?> deleteAccount(Principal principal) {
        try {
            if (principal == null || principal.getName() == null) {
                return ResponseEntity.status(401).build();
            }
            UUID requesterId = UUID.fromString(principal.getName());
            userService.deleteAccount(requesterId);
            return ResponseEntity.noContent().build();
        } catch (RuntimeException e) {
            return ResponseEntity.badRequest().body(e.getMessage());
        }
    }

    @GetMapping("/me/folders")
    public ResponseEntity<?> listFolders(Principal principal) {
        UUID requesterId = requireUser(principal);
        return ResponseEntity.ok(userService.listFolders(requesterId));
    }

    @PostMapping("/me/folders")
    public ResponseEntity<?> createFolder(Principal principal, @RequestBody Map<String, String> body) {
        UUID requesterId = requireUser(principal);
        return ResponseEntity.status(201).body(userService.createFolder(requesterId, body.get("name")));
    }


    @PutMapping("/me/folders/{folderId}")
    public ResponseEntity<Folder> renameFolder(Principal principal, @PathVariable UUID folderId, @RequestBody Map<String, String> body) {
        UUID requesterId = requireUser(principal);
        return ResponseEntity.ok(userService.renameFolder(requesterId, folderId, body.get("name")));
    }

    @DeleteMapping("/me/folders/{folderId}")
    public ResponseEntity<?> deleteFolder(Principal principal, @PathVariable UUID folderId) {
        UUID requesterId = requireUser(principal);
        userService.deleteFolder(requesterId, folderId);
        return ResponseEntity.noContent().build();
    }

    @PostMapping("/me/folders/{folderId}/posts")
    public ResponseEntity<Folder> addPostToFolder(Principal principal, @PathVariable UUID folderId, @RequestBody Map<String, String> body) {
        UUID requesterId = requireUser(principal);
        UUID postId = UUID.fromString(String.valueOf(body.get("postId")));
        return ResponseEntity.ok(userService.addPostToFolder(requesterId, folderId, postId));
    }

    @DeleteMapping("/me/folders/{folderId}/posts/{postId}")
    public ResponseEntity<Folder> removePostFromFolder(Principal principal, @PathVariable UUID folderId, @PathVariable UUID postId) {
        UUID requesterId = requireUser(principal);
        return ResponseEntity.ok(userService.removePostFromFolder(requesterId, folderId, postId));
    }

    private UUID requireUser(Principal principal) {
        if (principal == null || principal.getName() == null) {
            throw new RuntimeException("Usuário não autenticado");
        }
        return UUID.fromString(principal.getName());
    }
}
