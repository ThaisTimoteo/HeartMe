package com.heartme.postservice.controller;

import java.security.Principal;
import java.util.List;
import java.util.UUID;

import jakarta.validation.Valid;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import com.heartme.postservice.dto.CreatePostRequest;
import com.heartme.postservice.dto.UpdatePostRequest;
import com.heartme.postservice.model.Like;
import com.heartme.postservice.model.Post;
import com.heartme.postservice.security.JwtUtil;
import com.heartme.postservice.service.LikeService;
import com.heartme.postservice.service.PostService;

@RestController
@RequestMapping("/posts")
public class PostController {

    private final PostService postService;
    private final LikeService likeService;
    private final JwtUtil jwtUtil;

    public PostController(PostService postService, LikeService likeService, JwtUtil jwtUtil) {
        this.postService = postService;
        this.likeService = likeService;
        this.jwtUtil = jwtUtil;
    }

    @PostMapping
    public ResponseEntity<Post> createPost(
            @RequestHeader(value = "Authorization", required = false) String authHeader,
            Principal principal,
            @Valid @RequestBody CreatePostRequest request
    ) {
        UUID userId = extractUserId(authHeader, principal);
        Post post = postService.createPost(userId, request.title, request.content, request.imageKeywords, request.imageUrl, request.selectedImages, request.keywords);
        return ResponseEntity.status(201).body(post);
    }

    @GetMapping
    public ResponseEntity<List<Post>> getPostsByUser(@RequestParam UUID userId) {
        return ResponseEntity.ok(postService.getPostsByUser(userId));
    }

    @GetMapping("/user/{userId}")
    public ResponseEntity<List<Post>> getPostsByUserPath(@PathVariable UUID userId) {
        return ResponseEntity.ok(postService.getPostsByUser(userId));
    }

    @GetMapping("/search")
    public ResponseEntity<List<Post>> searchPosts(@RequestParam String query) {
        return ResponseEntity.ok(postService.searchPosts(query));
    }

    @GetMapping("/{postId}")
    public ResponseEntity<Post> getPostById(@PathVariable UUID postId) {
        return ResponseEntity.ok(postService.getPostById(postId));
    }

    @PutMapping("/{postId}")
    public ResponseEntity<Post> updatePost(
            @RequestHeader(value = "Authorization", required = false) String authHeader,
            Principal principal,
            @PathVariable UUID postId,
            @Valid @RequestBody UpdatePostRequest request
    ) {
        UUID userId = extractUserId(authHeader, principal);
        Post updatedPost = postService.updatePost(postId, userId, request.title, request.content, request.imageKeywords, request.imageUrl, request.selectedImages, request.keywords);
        return ResponseEntity.ok(updatedPost);
    }

    @DeleteMapping("/{postId}")
    public ResponseEntity<Void> deletePost(
            @RequestHeader(value = "Authorization", required = false) String authHeader,
            Principal principal,
            @PathVariable UUID postId
    ) {
        UUID userId = extractUserId(authHeader, principal);
        postService.deletePost(postId, userId);
        return ResponseEntity.noContent().build();
    }

    @PostMapping("/{postId}/like")
    public ResponseEntity<Like> likePost(
            @RequestHeader(value = "Authorization", required = false) String authHeader,
            Principal principal,
            @PathVariable UUID postId
    ) {
        UUID userId = extractUserId(authHeader, principal);
        return ResponseEntity.ok(likeService.likePost(postId, userId));
    }

    @GetMapping("/{postId}/likes")
    public ResponseEntity<List<Like>> getLikesByPost(@PathVariable UUID postId) {
        return ResponseEntity.ok(likeService.getLikesByPost(postId));
    }

    @DeleteMapping("/internal/user/{userId}")
    public ResponseEntity<Void> deletePostsByUserInternal(@PathVariable UUID userId) {
        postService.deletePostsByUser(userId);
        return ResponseEntity.noContent().build();
    }

    private UUID extractUserId(String authHeader, Principal principal) {
        if (principal != null && principal.getName() != null && !principal.getName().isBlank()) {
            return UUID.fromString(principal.getName());
        }
        if (authHeader == null || !authHeader.startsWith("Bearer ")) {
            throw new IllegalArgumentException("Authorization header inválido");
        }
        String token = authHeader.substring(7).trim();
        return jwtUtil.validateTokenAndGetUserId(token);
    }
}
