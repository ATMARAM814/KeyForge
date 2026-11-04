package com.credx.keyforge.dto.auth;

import com.credx.keyforge.entity.Role;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record RegisterRequest(
        @NotBlank @Email String email,
        @NotBlank @Size(min = 8, max = 100, message = "Password must be at least 8 characters") String password,
        @NotBlank @Size(max = 120) String fullName,
        Role role,
        // Developer-specific profile fields
        String primaryStack,
        String githubUrl,
        String useCase,
        // Provider-specific profile fields
        String organizationName,
        String websiteUrl,
        String providerType,
        String supportEmail,
        String baseApiUrl,
        String authScheme,
        String hostingRegion,
        Integer defaultRateLimit,
        String slaTier
) {
}
