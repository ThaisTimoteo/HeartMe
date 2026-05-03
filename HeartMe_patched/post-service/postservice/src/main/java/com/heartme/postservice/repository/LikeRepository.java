package com.heartme.postservice.repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

import org.springframework.data.jpa.repository.JpaRepository;

import com.heartme.postservice.model.Like;

public interface LikeRepository extends JpaRepository<Like, UUID> {
    List<Like> findByPostId(UUID postId);
    List<Like> findByUserId(UUID userId);

    Optional<Like> findByPostIdAndUserId(UUID postId, UUID userId);

    void deleteByUserId(UUID userId);
    void deleteByPostId(UUID postId);
}
