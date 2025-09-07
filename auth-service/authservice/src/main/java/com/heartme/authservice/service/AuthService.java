package com.heartme.authservice.service;

import com.heartme.authservice.dto.RegisterRequest;
import com.heartme.authservice.model.UserCredentials;
import com.heartme.authservice.repository.UserCredentialsRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;

import java.util.Optional;

@Service
public class AuthService {

    @Autowired
    private UserCredentialsRepository userRepo;

    @Autowired
    private PasswordEncoder passwordEncoder;

    public UserCredentials register(RegisterRequest request) {
        Optional<UserCredentials> existing = userRepo.findByEmail(request.getEmail());
        if (existing.isPresent()) {
            throw new RuntimeException("Email já cadastrado");
        }

        UserCredentials user = new UserCredentials();
        user.setEmail(request.getEmail());
        user.setPasswordHash(passwordEncoder.encode(request.getPassword()));
        return userRepo.save(user);
    }
}
