package com.heartme.authservice.service;

import java.util.Optional;
import java.util.UUID;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;

import com.heartme.authservice.dto.RegisterRequest;
import com.heartme.authservice.dto.UpdateAccountRequest;
import com.heartme.authservice.model.UserCredentials;
import com.heartme.authservice.repository.UserCredentialsRepository;

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

    public UserCredentials authenticate(String email, String rawPassword) {
        UserCredentials user = userRepo.findByEmail(email)
                .orElseThrow(() -> new RuntimeException("Credenciais inválidas"));

        if (!user.isEnabled()) {
            throw new RuntimeException("Usuário desativado");
        }

        boolean ok = passwordEncoder.matches(rawPassword, user.getPasswordHash());
        if (!ok) {
            throw new RuntimeException("Credenciais inválidas");
        }

        return user;
    }

    public UserCredentials getById(UUID id) {
        return userRepo.findById(id).orElseThrow(() -> new RuntimeException("Conta não encontrada"));
    }

    public UserCredentials updateAccount(UUID id, UpdateAccountRequest request) {
        UserCredentials user = getById(id);

        if (request.getCurrentPassword() == null || request.getCurrentPassword().isBlank()) {
            throw new RuntimeException("Senha atual é obrigatória");
        }

        if (!passwordEncoder.matches(request.getCurrentPassword(), user.getPasswordHash())) {
            throw new RuntimeException("Senha atual inválida");
        }

        if (request.getEmail() != null && !request.getEmail().isBlank()) {
            String nextEmail = request.getEmail().trim();
            userRepo.findByEmail(nextEmail).ifPresent(existing -> {
                if (!existing.getId().equals(user.getId())) {
                    throw new DataIntegrityViolationException("E-mail já cadastrado.");
                }
            });
            user.setEmail(nextEmail);
        }

        if (request.getPassword() != null && !request.getPassword().isBlank()) {
            user.setPasswordHash(passwordEncoder.encode(request.getPassword()));
        }

        return userRepo.save(user);
    }

    public void deleteAccount(UUID id) {
        if (!userRepo.existsById(id)) {
            throw new RuntimeException("Conta não encontrada");
        }
        userRepo.deleteById(id);
    }
}
