package com.heartme.postservice.controller;

import java.util.List;

import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import com.heartme.postservice.dto.ImageSearchResult;
import com.heartme.postservice.service.ImageService;

@RestController
@RequestMapping("/posts/images")
public class ImageController {

    private final ImageService imageService;

    public ImageController(ImageService imageService) {
        this.imageService = imageService;
    }

    @GetMapping("/search")
    public ResponseEntity<List<ImageSearchResult>> search(@RequestParam String query) {
        return ResponseEntity.ok(imageService.searchImages(query, 10));
    }
}
