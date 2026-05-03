package com.heartme.authservice.dto;

public class UpdateAccountRequest {
    private String email;
    private String currentPassword;
    private String password;

    public String getEmail() { return email; }
    public void setEmail(String email) { this.email = email; }
    public String getCurrentPassword() { return currentPassword; }
    public void setCurrentPassword(String currentPassword) { this.currentPassword = currentPassword; }
    public String getPassword() { return password; }
    public void setPassword(String password) { this.password = password; }
}
