package com.heartme.authservice.controller;

import java.util.Collections;
import java.util.UUID;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.heartme.authservice.dto.AccountResponse;
import com.heartme.authservice.dto.LoginRequest;
import com.heartme.authservice.dto.RegisterRequest;
import com.heartme.authservice.dto.UpdateAccountRequest;
import com.heartme.authservice.model.UserCredentials;
import com.heartme.authservice.security.JwtUtil;
import com.heartme.authservice.service.AuthService;

@RestController
@RequestMapping("/auth")
public class AuthController {

    private final AuthService authService;

    @Autowired
    private JwtUtil jwtUtil;

    @Autowired
    public AuthController(AuthService authService) {
        this.authService = authService;
    }

    @PostMapping("/register")
    public ResponseEntity<?> register(@RequestBody RegisterRequest request) {
        try {
            if (request.getEmail() == null || request.getEmail().isBlank()) {
                return ResponseEntity.badRequest().body("Email é obrigatório");
            }
            if (request.getPassword() == null || request.getPassword().isBlank()) {
                return ResponseEntity.badRequest().body("Senha é obrigatória");
            }

            UserCredentials savedUser = authService.register(request);
            return ResponseEntity.status(201).body(toResponse(savedUser));
        } catch (DataIntegrityViolationException e) {
            return ResponseEntity.status(HttpStatus.CONFLICT).body("E-mail já cadastrado.");
        }
    }

    @PostMapping("/login")
    public ResponseEntity<?> login(@RequestBody LoginRequest request) {
        try {
            if (request.getEmail() == null || request.getEmail().isBlank()) {
                return ResponseEntity.badRequest().body("Email é obrigatório");
            }
            if (request.getPassword() == null || request.getPassword().isBlank()) {
                return ResponseEntity.badRequest().body("Senha é obrigatória");
            }

            UserCredentials user = authService.authenticate(request.getEmail(), request.getPassword());
            String token = jwtUtil.generateToken(user.getId());
            return ResponseEntity.ok(Collections.singletonMap("token", token));
        } catch (Exception e) {
            return ResponseEntity.status(401).body("Erro no login: " + e.getMessage());
        }
    }

    @GetMapping("/me")
    public ResponseEntity<?> me(@RequestHeader(value = "Authorization", required = false) String authHeader) {
        try {
            UUID userId = extractUserId(authHeader);
            return ResponseEntity.ok(toResponse(authService.getById(userId)));
        } catch (Exception e) {
            return ResponseEntity.status(401).body(e.getMessage());
        }
    }

    @PutMapping("/me")
    public ResponseEntity<?> updateMe(
            @RequestHeader(value = "Authorization", required = false) String authHeader,
            @RequestBody UpdateAccountRequest request
    ) {
        try {
            UUID userId = extractUserId(authHeader);
            return ResponseEntity.ok(toResponse(authService.updateAccount(userId, request)));
        } catch (DataIntegrityViolationException e) {
            return ResponseEntity.status(HttpStatus.CONFLICT).body("E-mail já cadastrado.");
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(e.getMessage());
        }
    }

    @DeleteMapping("/me")
    public ResponseEntity<?> deleteMe(@RequestHeader(value = "Authorization", required = false) String authHeader) {
        try {
            UUID userId = extractUserId(authHeader);
            authService.deleteAccount(userId);
            return ResponseEntity.noContent().build();
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(e.getMessage());
        }
    }


    @DeleteMapping("/internal/users/{userId}")
    public ResponseEntity<?> deleteInternal(@PathVariable UUID userId) {
        try {
            authService.deleteAccount(userId);
            return ResponseEntity.noContent().build();
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(e.getMessage());
        }
    }

    private UUID extractUserId(String authHeader) {
        if (authHeader == null || !authHeader.startsWith("Bearer ")) {
            throw new RuntimeException("Token ausente");
        }
        return jwtUtil.validateTokenAndGetUserId(authHeader.substring(7));
    }

    private AccountResponse toResponse(UserCredentials user) {
        AccountResponse response = new AccountResponse();
        response.setId(user.getId());
        response.setEmail(user.getEmail());
        response.setEnabled(user.isEnabled());
        response.setCreatedAt(user.getCreatedAt());
        response.setUpdatedAt(user.getUpdatedAt());
        return response;
    }
}
