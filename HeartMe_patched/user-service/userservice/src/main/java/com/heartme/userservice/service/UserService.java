package com.heartme.userservice.service;

import java.text.Normalizer;
import java.util.ArrayList;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpMethod;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.client.RestTemplate;

import com.heartme.userservice.dto.UserCreateRequest;
import com.heartme.userservice.model.Folder;
import com.heartme.userservice.model.UserProfile;
import com.heartme.userservice.repository.FolderRepository;
import com.heartme.userservice.repository.UserRepository;

@Service
public class UserService {

    private final UserRepository userRepository;
    private final FolderRepository folderRepository;
    private final RestTemplate restTemplate;
    private final String authServiceBaseUrl;
    private final String postServiceBaseUrl;
    private final String notificationServiceBaseUrl;

    public UserService(
            UserRepository userRepository,
            FolderRepository folderRepository,
            RestTemplate restTemplate,
            @Value("${auth.service.base-url:http://localhost:8080}") String authServiceBaseUrl,
            @Value("${post.service.base-url:http://localhost:8082}") String postServiceBaseUrl,
            @Value("${notification.service.base-url:http://localhost:8083}") String notificationServiceBaseUrl
    ) {
        this.userRepository = userRepository;
        this.folderRepository = folderRepository;
        this.restTemplate = restTemplate;
        this.authServiceBaseUrl = trimBaseUrl(authServiceBaseUrl);
        this.postServiceBaseUrl = trimBaseUrl(postServiceBaseUrl);
        this.notificationServiceBaseUrl = trimBaseUrl(notificationServiceBaseUrl);
    }

    public UserProfile create(UUID userId, UserCreateRequest request) {
        String username = normalizeUsername(request.getUsername(), request.getName(), userId);
        validatePayload(username);

        if (userRepository.existsByUserId(userId)) {
            throw new RuntimeException("Usuário já possui perfil");
        }
        ensureUsernameAvailable(username, null);

        UserProfile profile = new UserProfile();
        profile.setUserId(userId);
        profile.setUsername(username);
        profile.setName(clean(request.getName()));
        profile.setBio(clean(request.getBio()));
        profile.setAvatarUrl(clean(request.getAvatarUrl()));

        return userRepository.save(profile);
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

    public List<UserProfile> search(String query) {
        String q = clean(query);
        if (q == null) {
            return userRepository.findAll().stream()
                    .sorted((a, b) -> String.valueOf(a.getUsername()).compareToIgnoreCase(String.valueOf(b.getUsername())))
                    .limit(20)
                    .toList();
        }
        return userRepository.findTop20ByUsernameContainingIgnoreCaseOrNameContainingIgnoreCaseOrderByUsernameAsc(q, q);
    }

    public UserProfile update(UUID id, UUID requesterUserId, UserProfile updatedUser) {
        return userRepository.findById(id)
                .map(user -> {
                    if (!user.getUserId().equals(requesterUserId)) {
                        throw new RuntimeException("Você não pode editar o perfil de outro usuário");
                    }

                    String username = normalizeUsername(updatedUser.getUsername(), updatedUser.getName(), user.getUserId());
                    validatePayload(username);
                    ensureUsernameAvailable(username, user.getId());

                    user.setUsername(username);
                    user.setName(clean(updatedUser.getName()));
                    user.setBio(clean(updatedUser.getBio()));
                    user.setAvatarUrl(clean(updatedUser.getAvatarUrl()));
                    user.setPreferences(clean(updatedUser.getPreferences()));
                    return userRepository.save(user);
                })
                .orElseThrow(() -> new RuntimeException("Perfil não encontrado"));
    }

    public void delete(UUID id, UUID requesterUserId) {
        UserProfile profile = userRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Perfil não encontrado"));
        if (!profile.getUserId().equals(requesterUserId)) {
            throw new RuntimeException("Você não pode excluir o perfil de outro usuário");
        }
        userRepository.delete(profile);
        folderRepository.deleteByUserId(requesterUserId);
    }

    @Transactional
    public void deleteAccount(UUID requesterUserId) {
        UserProfile profile = userRepository.findByUserId(requesterUserId).orElse(null);
        folderRepository.deleteByUserId(requesterUserId);
        safeDeleteByUrl(postServiceBaseUrl + "/posts/internal/user/" + requesterUserId);
        safeDeleteByUrl(notificationServiceBaseUrl + "/internal/notifications/users/" + requesterUserId);
        if (profile != null) {
            userRepository.delete(profile);
        }
        safeDeleteByUrl(authServiceBaseUrl + "/auth/internal/users/" + requesterUserId);
    }

    public List<Folder> listFolders(UUID requesterUserId) {
        return folderRepository.findByUserIdOrderByUpdatedAtDesc(requesterUserId);
    }

    public Folder createFolder(UUID requesterUserId, String rawName) {
        String name = clean(rawName);
        if (name == null) throw new RuntimeException("Informe um nome para a pasta");
        Folder folder = new Folder();
        folder.setUserId(requesterUserId);
        folder.setName(name);
        folder.setPostIds(new ArrayList<>());
        return folderRepository.save(folder);
    }

    public Folder renameFolder(UUID requesterUserId, UUID folderId, String rawName) {
        Folder folder = requireOwnedFolder(requesterUserId, folderId);
        String name = clean(rawName);
        if (name == null) throw new RuntimeException("Informe um nome para a pasta");
        folder.setName(name);
        return folderRepository.save(folder);
    }

    public void deleteFolder(UUID requesterUserId, UUID folderId) {
        Folder folder = requireOwnedFolder(requesterUserId, folderId);
        folderRepository.delete(folder);
    }

    public Folder addPostToFolder(UUID requesterUserId, UUID folderId, UUID postId) {
        Folder folder = requireOwnedFolder(requesterUserId, folderId);
        List<UUID> postIds = new ArrayList<>(folder.getPostIds() == null ? List.of() : folder.getPostIds());
        if (!postIds.contains(postId)) postIds.add(0, postId);
        folder.setPostIds(postIds);
        return folderRepository.save(folder);
    }

    public Folder removePostFromFolder(UUID requesterUserId, UUID folderId, UUID postId) {
        Folder folder = requireOwnedFolder(requesterUserId, folderId);
        List<UUID> postIds = new ArrayList<>(folder.getPostIds() == null ? List.of() : folder.getPostIds());
        postIds.removeIf(id -> id.equals(postId));
        folder.setPostIds(postIds);
        return folderRepository.save(folder);
    }

    private Folder requireOwnedFolder(UUID requesterUserId, UUID folderId) {
        Folder folder = folderRepository.findById(folderId)
                .orElseThrow(() -> new RuntimeException("Pasta não encontrada"));
        if (!folder.getUserId().equals(requesterUserId)) {
            throw new RuntimeException("Você não pode alterar a pasta de outro usuário");
        }
        return folder;
    }

    private void validatePayload(String username) {
        if (username == null || username.isBlank()) {
            throw new RuntimeException("Nome de usuário é obrigatório");
        }
        if (username.length() < 3) {
            throw new RuntimeException("Nome de usuário deve ter pelo menos 3 caracteres");
        }
    }

    private void ensureUsernameAvailable(String username, UUID currentProfileId) {
        boolean exists = currentProfileId == null
                ? userRepository.existsByUsernameIgnoreCase(username)
                : userRepository.existsByUsernameIgnoreCaseAndIdNot(username, currentProfileId);
        if (exists) {
            throw new RuntimeException("Esse nome de usuário já está em uso");
        }
    }

    private String normalizeUsername(String rawUsername, String fallbackName, UUID userId) {
        String base = clean(rawUsername);
        if (base == null) {
            base = clean(fallbackName);
        }
        if (base == null) {
            base = "user_" + userId.toString().replace("-", "").substring(0, 8);
        }

        String normalized = Normalizer.normalize(base, Normalizer.Form.NFD)
                .replaceAll("\\p{M}+", "")
                .toLowerCase()
                .replaceAll("[^a-z0-9._]+", "_")
                .replaceAll("^[_\\.]+|[_\\.]+$", "")
                .replaceAll("[_\\.]{2,}", "_");

        if (normalized.length() > 30) {
            normalized = normalized.substring(0, 30).replaceAll("^[_\\.]+|[_\\.]+$", "");
        }

        if (normalized.length() < 3) {
            normalized = "user_" + userId.toString().replace("-", "").substring(0, 8);
        }

        return normalized;
    }

    private String clean(String value) {
        if (value == null) return null;
        String trimmed = value.trim();
        return trimmed.isBlank() ? null : trimmed;
    }

    private String trimBaseUrl(String value) {
        if (value == null) return "";
        String trimmed = value.trim();
        return trimmed.endsWith("/") ? trimmed.substring(0, trimmed.length() - 1) : trimmed;
    }

    private void safeDeleteByUrl(String url) {
        try {
            HttpHeaders headers = new HttpHeaders();
            headers.setContentType(MediaType.APPLICATION_JSON);
            restTemplate.exchange(url, HttpMethod.DELETE, new HttpEntity<>(headers), Void.class);
        } catch (Exception ignored) {
        }
    }
}
