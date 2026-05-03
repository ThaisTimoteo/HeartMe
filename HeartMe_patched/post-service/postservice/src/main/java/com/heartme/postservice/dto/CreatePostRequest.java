package com.heartme.postservice.dto;

import java.util.List;

public class CreatePostRequest {
    public String title;
    public String content;
    public List<String> imageKeywords;
    public String imageUrl;
    public List<String> selectedImages;
    public List<String> keywords;
}
