package com.heartme.postservice.service;

import java.net.URLEncoder;
import java.nio.charset.StandardCharsets;
import java.text.Normalizer;
import java.util.ArrayList;
import java.util.Collections;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Locale;
import java.util.Map;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpMethod;
import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;

import com.heartme.postservice.dto.ImageSearchResult;

@Service
public class ImageService {

    @Value("${unsplash.api.key:}")
    private String apiKey;

    private final RestTemplate restTemplate = new RestTemplate();

    public String getImageUrl(String keyword) {
        if (keyword == null || keyword.isBlank()) return null;
        List<ImageSearchResult> results = searchImages(keyword, 1);
        return results.isEmpty() ? null : results.get(0).getRegularUrl();
    }

    public List<ImageSearchResult> searchImages(String keyword, int perPage) {
        if (keyword == null || keyword.isBlank()) return Collections.emptyList();
        if (apiKey == null || apiKey.isBlank()) return Collections.emptyList();

        int size = Math.max(1, Math.min(perPage, 12));
        LinkedHashSet<String> attempts = buildQueryAttempts(keyword);
        LinkedHashSet<String> seenIds = new LinkedHashSet<>();
        List<ImageSearchResult> merged = new ArrayList<>();

        for (String attempt : attempts) {
            List<ImageSearchResult> results = searchUnsplash(attempt, size);
            for (ImageSearchResult result : results) {
                String id = result.getId();
                String dedupeKey = (id == null || id.isBlank()) ? result.getRegularUrl() : id;
                if (dedupeKey == null || dedupeKey.isBlank() || seenIds.add(dedupeKey)) {
                    merged.add(result);
                }
                if (merged.size() >= size) {
                    return merged;
                }
            }
        }

        return merged;
    }

    private LinkedHashSet<String> buildQueryAttempts(String keyword) {
        String trimmed = keyword == null ? "" : keyword.trim();
        LinkedHashSet<String> attempts = new LinkedHashSet<>();
        if (trimmed.isBlank()) return attempts;

        String normalized = normalize(trimmed);
        String canonicalEnglish = toCanonicalEnglish(trimmed);
        String normalizedCanonical = normalize(canonicalEnglish);

        addAttempt(attempts, canonicalEnglish);
        addAttempt(attempts, normalizedCanonical);

        if (!normalized.equals(normalizedCanonical)) {
            addAttempt(attempts, trimmed);
            addAttempt(attempts, normalized);
            addAttempt(attempts, canonicalEnglish + " " + trimmed);
            addAttempt(attempts, normalizedCanonical + " " + normalized);
        }

        return attempts;
    }

    private List<ImageSearchResult> searchUnsplash(String keyword, int perPage) {
        if (keyword == null || keyword.isBlank()) return Collections.emptyList();

        String query = URLEncoder.encode(keyword.trim(), StandardCharsets.UTF_8);
        String url = "https://api.unsplash.com/search/photos?query=" + query + "&per_page=" + perPage;

        try {
            HttpHeaders headers = new HttpHeaders();
            headers.set("Authorization", "Client-ID " + apiKey);
            headers.set("Accept-Version", "v1");

            ResponseEntity<Map> response = restTemplate.exchange(
                    url,
                    HttpMethod.GET,
                    new HttpEntity<>(headers),
                    Map.class
            );

            Object resultsObj = response.getBody() == null ? null : response.getBody().get("results");
            if (!(resultsObj instanceof List<?> list)) return Collections.emptyList();

            List<ImageSearchResult> items = new ArrayList<>();
            for (Object itemObj : list) {
                if (!(itemObj instanceof Map<?, ?> item)) continue;
                Map<?, ?> urls = item.get("urls") instanceof Map<?, ?> map ? map : Collections.emptyMap();
                Map<?, ?> user = item.get("user") instanceof Map<?, ?> map ? map : Collections.emptyMap();

                String regular = stringValue(urls.get("regular"));
                if (regular == null || regular.isBlank()) continue;

                items.add(new ImageSearchResult(
                        stringValue(item.get("id")),
                        stringValue(urls.get("thumb")),
                        regular,
                        stringValue(item.get("alt_description")),
                        stringValue(user.get("name"))
                ));
            }
            return items;
        } catch (Exception e) {
            System.out.println("Erro ao buscar imagens no Unsplash: " + e.getMessage());
            return Collections.emptyList();
        }
    }

    private String toCanonicalEnglish(String keyword) {
        if (keyword == null || keyword.isBlank()) return "";

        String direct = translateUsingDictionary(keyword, "pt", "en");
        if (direct != null && !direct.isBlank()) return direct;

        String english = translateUsingDictionary(keyword, "en", "pt");
        if (english != null && !english.isBlank()) {
            String backToEnglish = translateUsingDictionary(english, "pt", "en");
            if (backToEnglish != null && !backToEnglish.isBlank()) return backToEnglish;
        }

        return normalize(keyword);
    }

    private String translateUsingDictionary(String keyword, String sourceLang, String targetLang) {
        String normalized = normalize(keyword);
        if (normalized.isBlank()) return null;

        return switch (sourceLang + "->" + targetLang) {
            case "pt->en" -> switch (normalized) {
                case "cafe" -> "coffee";
                case "praia" -> "beach";
                case "livro", "livros" -> "books";
                case "gato", "gatos" -> "cat";
                case "cachorro", "cachorros" -> "dog";
                case "amor" -> "love";
                case "coracao", "coracoes" -> "heart";
                case "flor", "flores" -> "flowers";
                case "natureza" -> "nature";
                case "ceu" -> "sky";
                case "mar" -> "sea";
                case "sol" -> "sun";
                case "chuva" -> "rain";
                case "cidade" -> "city";
                case "noite" -> "night";
                case "musica" -> "music";
                case "filme", "filmes" -> "movie";
                case "comida" -> "food";
                case "bolo" -> "cake";
                case "pizza" -> "pizza";
                case "familia" -> "family";
                case "viagem" -> "travel";
                case "felicidade" -> "happiness";
                case "trabalho" -> "work";
                case "estudo" -> "study";
                case "faculdade", "facul" -> "college";
                case "tecnologia" -> "technology";
                case "programacao" -> "programming";
                case "frontend", "front end" -> "frontend";
                case "casal" -> "couple";
                case "amizade" -> "friendship";
                case "mae" -> "mother";
                case "pai" -> "father";
                case "carro" -> "car";
                case "moto" -> "motorcycle";
                case "anime" -> "anime";
                case "jogo", "jogos" -> "game";
                case "academia" -> "gym";
                case "corrida" -> "running";
                default -> null;
            };
            case "en->pt" -> switch (normalized) {
                case "coffee" -> "cafe";
                case "beach" -> "praia";
                case "book", "books" -> "livros";
                case "cat", "cats" -> "gato";
                case "dog", "dogs" -> "cachorro";
                case "love" -> "amor";
                case "heart", "hearts" -> "coracao";
                case "flower", "flowers" -> "flores";
                case "nature" -> "natureza";
                case "sky" -> "ceu";
                case "sea" -> "mar";
                case "sun" -> "sol";
                case "rain" -> "chuva";
                case "city" -> "cidade";
                case "night" -> "noite";
                case "music" -> "musica";
                case "movie", "movies", "film", "films" -> "filme";
                case "food" -> "comida";
                case "cake" -> "bolo";
                case "pizza" -> "pizza";
                case "family" -> "familia";
                case "travel", "trip" -> "viagem";
                case "happiness" -> "felicidade";
                case "work" -> "trabalho";
                case "study" -> "estudo";
                case "college" -> "faculdade";
                case "technology" -> "tecnologia";
                case "programming" -> "programacao";
                case "frontend", "front end" -> "frontend";
                case "couple" -> "casal";
                case "friendship" -> "amizade";
                case "mother" -> "mae";
                case "father" -> "pai";
                case "car" -> "carro";
                case "motorcycle", "motorbike" -> "moto";
                case "anime" -> "anime";
                case "game", "games" -> "jogo";
                case "gym" -> "academia";
                case "running" -> "corrida";
                default -> null;
            };
            default -> null;
        };
    }


    private void addAttempt(LinkedHashSet<String> attempts, String value) {
        if (value == null) return;
        String cleaned = value.trim();
        if (!cleaned.isBlank()) {
            attempts.add(cleaned);
        }
    }

    private String normalize(String value) {
        String normalized = Normalizer.normalize(value, Normalizer.Form.NFD)
                .replaceAll("\\p{M}", "")
                .toLowerCase(Locale.ROOT)
                .trim();
        return normalized.replaceAll("\\s+", " ");
    }

    private String stringValue(Object value) {
        return value == null ? null : String.valueOf(value);
    }
}
