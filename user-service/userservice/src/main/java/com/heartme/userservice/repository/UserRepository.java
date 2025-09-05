package com.heartme.userservice.repository;

import java.util.Optional;
import java.util.UUID;

import org.springframework.data.jpa.repository.JpaRepository;

import com.heartme.userservice.model.UserProfile;

public interface UserRepository extends JpaRepository<UserProfile, UUID> {

    // Buscar pelo userId (FK do Auth Service)
    Optional<UserProfile> findByUserId(UUID userId);
}
