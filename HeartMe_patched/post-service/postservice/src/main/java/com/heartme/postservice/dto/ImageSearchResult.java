package com.heartme.postservice.dto;

public class ImageSearchResult {
    private String id;
    private String thumbUrl;
    private String regularUrl;
    private String description;
    private String authorName;

    public ImageSearchResult() {}

    public ImageSearchResult(String id, String thumbUrl, String regularUrl, String description, String authorName) {
        this.id = id;
        this.thumbUrl = thumbUrl;
        this.regularUrl = regularUrl;
        this.description = description;
        this.authorName = authorName;
    }

    public String getId() { return id; }
    public void setId(String id) { this.id = id; }
    public String getThumbUrl() { return thumbUrl; }
    public void setThumbUrl(String thumbUrl) { this.thumbUrl = thumbUrl; }
    public String getRegularUrl() { return regularUrl; }
    public void setRegularUrl(String regularUrl) { this.regularUrl = regularUrl; }
    public String getDescription() { return description; }
    public void setDescription(String description) { this.description = description; }
    public String getAuthorName() { return authorName; }
    public void setAuthorName(String authorName) { this.authorName = authorName; }
}
