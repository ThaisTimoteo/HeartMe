package com.heartme.userservice.service;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

import org.springframework.stereotype.Service;

import com.heartme.userservice.model.UserProfile;
import com.heartme.userservice.repository.UserRepository;

@Service
public class UserService {

    private final UserRepository userRepository;

    public UserService(UserRepository userRepository) {
        this.userRepository = userRepository;
    }

    public UserProfile create(UserProfile user) {
        return userRepository.save(user);
    }

    public Optional<UserProfile> getById(UUID id) {
        return userRepository.findById(id);
    }

    public Optional<UserProfile> getByUserId(UUID userId) {
        return userRepository.findByUserId(userId);
    }

    public List<UserProfile> getAll() {
        return userRepository.findAll();
    }

    public UserProfile update(UUID id, UserProfile updatedUser) {
        return userRepository.findById(id)
                .map(user -> {
                    user.setName(updatedUser.getName());
                    user.setBio(updatedUser.getBio());
                    user.setAvatarUrl(updatedUser.getAvatarUrl());
                    user.setPreferences(updatedUser.getPreferences());
                    return userRepository.save(user);
                })
                .orElseThrow(() -> new RuntimeException("UserProfile not found"));
    }

    public void delete(UUID id) {
        userRepository.deleteById(id);
    }
}
