package com.heartme.authservice.service;

import com.heartme.authservice.dto.LoginRequest;
import com.heartme.authservice.dto.RegisterRequest;
import com.heartme.authservice.model.UserCredentials;
import com.heartme.authservice.repository.UserCredentialsRepository;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.util.Optional;
import java.util.UUID;

@Service
public class AuthService {

    private final UserCredentialsRepository repository;
    private final PasswordEncoder passwordEncoder;

    public AuthService(UserCredentialsRepository repository, PasswordEncoder passwordEncoder) {
        this.repository = repository;
        this.passwordEncoder = passwordEncoder;
    }

    // Registro de usuário
    public UserCredentials register(RegisterRequest request) {
        Optional<UserCredentials> existing = repository.findByEmail(request.getEmail());
        if (existing.isPresent()) {
            throw new RuntimeException("Email já cadastrado");
        }

        UserCredentials user = new UserCredentials();
        //user.setId(UUID.randomUUID());
        user.setEmail(request.getEmail());
        user.setPasswordHash(passwordEncoder.encode(request.getPassword()));
        //user.setCreatedAt(LocalDateTime.now());
        //user.setUpdatedAt(LocalDateTime.now());

        return repository.save(user);
    }

    // Login de usuário
    public UserCredentials login(LoginRequest request) {
        return repository.findByEmail(request.getEmail())
                .filter(user -> passwordEncoder.matches(request.getPassword(), user.getPasswordHash()))
                .orElseThrow(() -> new RuntimeException("Credenciais inválidas"));
    }
}
