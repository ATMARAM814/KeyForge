package com.credx.keyforge.entity;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.time.Instant;
import java.util.ArrayList;
import java.util.List;

@Entity
@Table(name = "users", uniqueConstraints = @UniqueConstraint(columnNames = "email"))
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class User {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private String id;

    @Column(nullable = false, unique = true)
    private String email;

    @Column(name = "full_name")
    private String fullName;

    @Column(name = "password_hash", nullable = false)
    private String passwordHash;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    @Builder.Default
    private Role role = Role.DEVELOPER;

    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;

    // Developer-specific profile fields
    @Column(name = "primary_stack")
    private String primaryStack;

    @Column(name = "github_url")
    private String githubUrl;

    @Column(name = "use_case")
    private String useCase;

    // Provider-specific profile fields
    @Column(name = "organization_name")
    private String organizationName;

    @Column(name = "website_url")
    private String websiteUrl;

    @Column(name = "provider_type")
    private String providerType;

    @Column(name = "support_email")
    private String supportEmail;

    // Technical Gateway & Routing fields for Providers
    @Column(name = "base_api_url")
    private String baseApiUrl;

    @Column(name = "auth_scheme")
    private String authScheme;

    @Column(name = "hosting_region")
    private String hostingRegion;

    @Column(name = "default_rate_limit")
    private Integer defaultRateLimit;

    @Column(name = "sla_tier")
    private String slaTier;

    @OneToMany(mappedBy = "user", cascade = CascadeType.ALL, orphanRemoval = true)
    @Builder.Default
    private List<OrganizationMembership> memberships = new ArrayList<>();

    @PrePersist
    protected void onCreate() {
        if (createdAt == null) {
            createdAt = Instant.now();
        }
    }
}
