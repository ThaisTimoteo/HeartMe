package com.heartme.postservice.service;

import java.util.ArrayList;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Locale;
import java.util.UUID;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Service;
import org.springframework.web.client.HttpClientErrorException;
import org.springframework.web.client.RestClientException;
import org.springframework.web.client.RestTemplate;

import com.heartme.postservice.dto.UserProfile;
import com.heartme.postservice.model.Post;
import com.heartme.postservice.repository.PostRepository;

@Service
public class PostService {

    private final PostRepository postRepository;
    private final ImageService imageService;
    private final RestTemplate restTemplate;
    private final String userServiceBaseUrl;

    public PostService(
            PostRepository postRepository,
            ImageService imageService,
            RestTemplate restTemplate,
            @Value("${user.service.base-url:http://localhost:8081}") String userServiceBaseUrl
    ) {
        this.postRepository = postRepository;
        this.imageService = imageService;
        this.restTemplate = restTemplate;
        this.userServiceBaseUrl = userServiceBaseUrl;
    }

    public Post createPost(UUID userId, String title, String content, List<String> imageKeywords, String imageUrl, List<String> selectedImages, List<String> keywords) {
        validateCreateOrUpdate(userId, content, imageKeywords, imageUrl, selectedImages, keywords);
        validarUsuario(userId);

        Post post = new Post();
        post.setUserId(userId);
        post.setTitle(clean(title));
        post.setContent(clean(content));
        post.setImages(resolveImages(imageKeywords, imageUrl, selectedImages));
        post.setKeywords(resolveKeywords(content, imageKeywords, keywords));
        return postRepository.save(post);
    }

    public List<Post> getPostsByUser(UUID userId) {
        return postRepository.findByUserId(userId);
    }

    public Post getPostById(UUID postId) {
        return postRepository.findById(postId)
                .orElseThrow(() -> new RuntimeException("Post não encontrado"));
    }

    public Post updatePost(UUID postId, UUID userId, String title, String content, List<String> imageKeywords, String imageUrl, List<String> selectedImages, List<String> keywords) {
        validateCreateOrUpdate(userId, content, imageKeywords, imageUrl, selectedImages, keywords);

        Post post = postRepository.findById(postId)
                .orElseThrow(() -> new RuntimeException("Post não encontrado"));

        if (post.getUserId() == null || !post.getUserId().equals(userId)) {
            throw new RuntimeException("Você não pode editar posts de outro usuário");
        }

        post.setTitle(clean(title));
        post.setContent(clean(content));
        post.setImages(resolveImages(imageKeywords, imageUrl, selectedImages));
        post.setKeywords(resolveKeywords(content, imageKeywords, keywords));
        return postRepository.save(post);
    }

    public void deletePostsByUser(UUID userId) {
        postRepository.deleteByUserId(userId);
    }

    public void deletePost(UUID postId, UUID userId) {
        Post post = postRepository.findById(postId)
                .orElseThrow(() -> new RuntimeException("Post não encontrado"));

        if (post.getUserId() == null || !post.getUserId().equals(userId)) {
            throw new RuntimeException("Você não pode deletar posts de outro usuário");
        }

        postRepository.delete(post);
    }

    private void validateCreateOrUpdate(UUID userId, String content, List<String> imageKeywords, String imageUrl, List<String> selectedImages, List<String> keywords) {
        if (userId == null) {
            throw new RuntimeException("Usuário não autenticado");
        }
        List<String> resolvedImages = resolveImages(imageKeywords, imageUrl, selectedImages);
        if (resolvedImages == null || resolvedImages.isEmpty()) {
            throw new RuntimeException("Imagem do post é obrigatória");
        }
        List<String> resolvedKeywords = resolveKeywords(content, imageKeywords, keywords);
        if (resolvedKeywords == null || resolvedKeywords.isEmpty()) {
            throw new RuntimeException("Pelo menos uma tag é obrigatória");
        }
    }

    private String clean(String value) {
        if (value == null) return null;
        String trimmed = value.trim();
        return trimmed.isBlank() ? null : trimmed;
    }

    private List<String> resolveImages(List<String> imageKeywords, String imageUrl, List<String> selectedImages) {
        LinkedHashSet<String> urls = new LinkedHashSet<>();

        if (imageUrl != null && !imageUrl.isBlank()) {
            urls.add(imageUrl.trim());
        }

        if (selectedImages != null) {
            selectedImages.stream()
                    .filter(item -> item != null && !item.isBlank())
                    .map(String::trim)
                    .forEach(urls::add);
        }

        if (urls.isEmpty() && imageKeywords != null && !imageKeywords.isEmpty()) {
            imageKeywords.stream()
                    .filter(k -> k != null && !k.isBlank())
                    .map(imageService::getImageUrl)
                    .filter(u -> u != null && !u.isBlank())
                    .forEach(urls::add);
        }

        return urls.isEmpty() ? null : new ArrayList<>(urls);
    }

    private List<String> resolveKeywords(String content, List<String> imageKeywords, List<String> keywords) {
        LinkedHashSet<String> set = new LinkedHashSet<>();
        if (keywords != null) {
            keywords.stream().filter(v -> v != null && !v.isBlank()).map(String::trim).map(String::toLowerCase).forEach(set::add);
        }
        if (imageKeywords != null) {
            imageKeywords.stream().filter(v -> v != null && !v.isBlank()).map(String::trim).map(String::toLowerCase).forEach(set::add);
        }
        if (set.isEmpty() && content != null && !content.isBlank()) {
            for (String part : content.toLowerCase(Locale.ROOT).split("[^\\p{L}\\p{Nd}]+")) {
                if (part.length() >= 3) set.add(part);
                if (set.size() >= 6) break;
            }
        }
        return set.isEmpty() ? null : new ArrayList<>(set);
    }

    private void validarUsuario(UUID userId) {
        String baseUrl = userServiceBaseUrl == null ? "" : userServiceBaseUrl.trim();
        if (baseUrl.endsWith("/")) {
            baseUrl = baseUrl.substring(0, baseUrl.length() - 1);
        }
        String url = baseUrl + "/users/by-auth/" + userId;

        try {
            ResponseEntity<String> response = restTemplate.getForEntity(url, String.class);
            if (response.getStatusCode() == HttpStatus.NOT_FOUND || response.getBody() == null || response.getBody().isBlank()) {
                throw new RuntimeException("Crie seu perfil antes de publicar");
            }
        } catch (HttpClientErrorException.NotFound ex) {
            throw new RuntimeException("Crie seu perfil antes de publicar");
        } catch (HttpClientErrorException ex) {
            System.out.println("Aviso ao validar usuário no user-service: status=" + ex.getStatusCode() + " body=" + ex.getResponseBodyAsString());
            if (ex.getStatusCode() == HttpStatus.NOT_FOUND) {
                throw new RuntimeException("Crie seu perfil antes de publicar");
            }
            // Não bloqueia publicação por falha transitória ou contrato levemente diferente do user-service.
            // O front e o próprio fluxo de onboarding já validam a existência do perfil.
        } catch (RestClientException ex) {
            System.out.println("Aviso ao validar usuário no user-service: " + ex.getMessage());
        }
    }

    public List<Post> searchPosts(String query) {
        String q = (query == null) ? "" : query.toLowerCase(Locale.ROOT).trim();

        return postRepository.findAll().stream()
                .filter(p ->
                        (p.getTitle() != null && p.getTitle().toLowerCase(Locale.ROOT).contains(q)) ||
                        (p.getContent() != null && p.getContent().toLowerCase(Locale.ROOT).contains(q)) ||
                        (p.getKeywords() != null && p.getKeywords().stream().anyMatch(k -> k != null && k.toLowerCase(Locale.ROOT).contains(q)))
                )
                .toList();
    }
}
