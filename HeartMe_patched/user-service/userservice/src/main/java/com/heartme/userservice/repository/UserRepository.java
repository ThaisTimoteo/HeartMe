package com.heartme.userservice.repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

import org.springframework.data.jpa.repository.JpaRepository;

import com.heartme.userservice.model.UserProfile;

public interface UserRepository extends JpaRepository<UserProfile, UUID> {

    Optional<UserProfile> findByUserId(UUID userId);

    boolean existsByUserId(UUID userId);

    boolean existsByUsernameIgnoreCase(String username);

    boolean existsByUsernameIgnoreCaseAndIdNot(String username, UUID id);

    List<UserProfile> findTop20ByUsernameContainingIgnoreCaseOrNameContainingIgnoreCaseOrderByUsernameAsc(String username, String name);
}
