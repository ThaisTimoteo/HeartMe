package com.heartme.postservice.service;

import java.util.List;
import java.util.UUID;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;

import com.heartme.postservice.dto.UserProfile;
import com.heartme.postservice.model.Like;
import com.heartme.postservice.model.Post;
import com.heartme.postservice.notification.NotificationEvent;
import com.heartme.postservice.notification.NotificationPublisher;
import com.heartme.postservice.repository.LikeRepository;
import com.heartme.postservice.repository.PostRepository;

@Service
public class LikeService {

    private final LikeRepository likeRepository;
    private final PostRepository postRepository;
    private final NotificationPublisher notificationPublisher;
    private final RestTemplate restTemplate;
    private final String userServiceBaseUrl;

    public LikeService(
            LikeRepository likeRepository,
            PostRepository postRepository,
            NotificationPublisher notificationPublisher,
            RestTemplate restTemplate,
            @Value("${user.service.base-url:http://localhost:8081}") String userServiceBaseUrl
    ) {
        this.likeRepository = likeRepository;
        this.postRepository = postRepository;
        this.notificationPublisher = notificationPublisher;
        this.restTemplate = restTemplate;
        this.userServiceBaseUrl = userServiceBaseUrl;
    }

    public Like likePost(UUID postId, UUID userId) {
        return likeRepository.findByPostIdAndUserId(postId, userId)
                .orElseGet(() -> {
                    Like like = new Like();
                    like.setPostId(postId);
                    like.setUserId(userId);

                    Like saved = likeRepository.save(like);

                    Post post = postRepository.findById(postId).orElse(null);
                    if (post != null
                            && post.getUserId() != null
                            && !post.getUserId().equals(userId)) {

                        NotificationEvent event = new NotificationEvent();
                        event.setRecipientUserId(post.getUserId());
                        event.setActorUserId(userId);
                        event.setType("POST_LIKED");
                        event.setEntityId(postId);
                        event.setMessage(resolveActorLabel(userId) + " curtiu o seu post.");

                        notificationPublisher.publish(event);
                    }

                    return saved;
                });
    }

    public List<Like> getLikesByPost(UUID postId) {
        return likeRepository.findByPostId(postId);
    }

    public List<Like> getLikesByUser(UUID userId) {
        return likeRepository.findByUserId(userId);
    }

    private String resolveActorLabel(UUID userId) {
        try {
            String baseUrl = userServiceBaseUrl == null ? "" : userServiceBaseUrl.trim();
            if (baseUrl.endsWith("/")) {
                baseUrl = baseUrl.substring(0, baseUrl.length() - 1);
            }
            UserProfile profile = restTemplate.getForObject(baseUrl + "/users/by-auth/" + userId, UserProfile.class);
            if (profile != null) {
                String username = profile.getUsername();
                if (username != null && !username.isBlank()) {
                    return username.trim();
                }
                String name = profile.getName();
                if (name != null && !name.isBlank()) {
                    return name.trim();
                }
            }
        } catch (Exception ignored) {
        }
        return "Alguém";
    }
}
