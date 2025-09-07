package com.heartme.userservice.security;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.web.SecurityFilterChain;

@Configuration
public class SecurityConfig {

    @Bean
    public SecurityFilterChain filterChain(HttpSecurity http) throws Exception {
        http
            .csrf(csrf -> csrf.disable()) // necessário para POST via Postman
            .authorizeHttpRequests(auth -> auth
                .requestMatchers("/users/**").permitAll() // libera os endpoints de usuário
                .anyRequest().authenticated()
            );

        return http.build();
    }
}
