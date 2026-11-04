package com.credx.keyforge.entity;

import jakarta.persistence.*;
import lombok.*;

import java.time.Instant;

@Entity
@Table(name = "service_listings", indexes = {
        @Index(name = "idx_services_category", columnList = "category"),
        @Index(name = "idx_services_provider", columnList = "provider_user_id")
})
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class ServiceListing {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private String id;

    @Column(nullable = false)
    private String name;

    @Column(nullable = false, unique = true)
    private String slug;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private ServiceCategory category;

    @Column(length = 2000, nullable = false)
    private String description;

    @Column(name = "provider_name", nullable = false)
    private String providerName;

    @Column(name = "provider_user_id")
    private String providerUserId;

    @Column(name = "endpoint_url", nullable = false)
    private String endpointUrl;

    @Column(name = "documentation", length = 4000)
    private String documentation;

    @Column(name = "sample_payload", length = 2000)
    private String samplePayload;

    @Column(name = "sample_response", length = 2000)
    private String sampleResponse;

    @Column(name = "rate_limit_per_minute", nullable = false)
    @Builder.Default
    private Integer rateLimitPerMinute = 60;

    public int getRateLimitPerMinute() {
        return rateLimitPerMinute != null && rateLimitPerMinute > 0 ? rateLimitPerMinute : 60;
    }

    @Column(name = "pricing_tier")
    @Builder.Default
    private String pricingTier = "Free / Open Access";

    // ==========================================
    // PROVIDER POLICY TEMPLATE
    // ==========================================
    @Column(name = "max_expiry_days")
    @Builder.Default
    private Integer maxExpiryDays = 365;

    @Column(name = "allow_never_expires")
    @Builder.Default
    private Boolean allowNeverExpires = false;

    @Column(name = "require_ip_allowlist_for_production")
    @Builder.Default
    private Boolean requireIpAllowlistForProduction = false;

    @Column(name = "default_rate_limit")
    @Builder.Default
    private Integer defaultRateLimit = 60;

    @Column(name = "max_rate_limit")
    @Builder.Default
    private Integer maxRateLimit = 1000;

    public boolean isAllowNeverExpires() {
        return Boolean.TRUE.equals(allowNeverExpires);
    }

    public boolean isRequireIpAllowlistForProduction() {
        return Boolean.TRUE.equals(requireIpAllowlistForProduction);
    }

    public int getDefaultRateLimit() {
        return defaultRateLimit != null && defaultRateLimit > 0 ? defaultRateLimit : rateLimitPerMinute;
    }

    public int getMaxRateLimit() {
        return maxRateLimit != null && maxRateLimit > 0 ? maxRateLimit : 1000;
    }

    @Column(name = "allowed_scopes", length = 500)
    private String allowedScopes;

    @Column(name = "allowed_models", length = 1000)
    private String allowedModels;

    @Column(name = "is_active", nullable = false)
    @Builder.Default
    private Boolean isActive = true;

    public boolean isActive() {
        return !Boolean.FALSE.equals(isActive);
    }

    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;

    @PrePersist
    protected void onCreate() {
        if (createdAt == null) {
            createdAt = Instant.now();
        }
    }
}
