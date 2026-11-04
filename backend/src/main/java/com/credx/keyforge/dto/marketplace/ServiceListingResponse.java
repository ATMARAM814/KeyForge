package com.credx.keyforge.dto.marketplace;

import com.credx.keyforge.entity.ServiceCategory;
import com.credx.keyforge.entity.ServiceListing;

import java.time.Instant;

public record ServiceListingResponse(
        String id,
        String name,
        String slug,
        ServiceCategory category,
        String description,
        String providerName,
        String providerUserId,
        String endpointUrl,
        String documentation,
        String samplePayload,
        String sampleResponse,
        int rateLimitPerMinute,
        String pricingTier,
        boolean isActive,
        Instant createdAt,
        Integer maxExpiryDays,
        boolean allowNeverExpires,
        boolean requireIpAllowlistForProduction,
        int defaultRateLimit,
        int maxRateLimit,
        String allowedScopes,
        String allowedModels
) {
    public static ServiceListingResponse from(ServiceListing entity) {
        return new ServiceListingResponse(
                entity.getId(),
                entity.getName(),
                entity.getSlug(),
                entity.getCategory(),
                entity.getDescription(),
                entity.getProviderName(),
                entity.getProviderUserId(),
                entity.getEndpointUrl(),
                entity.getDocumentation(),
                entity.getSamplePayload(),
                entity.getSampleResponse(),
                entity.getRateLimitPerMinute(),
                entity.getPricingTier(),
                entity.isActive(),
                entity.getCreatedAt(),
                entity.getMaxExpiryDays() != null ? entity.getMaxExpiryDays() : 365,
                entity.isAllowNeverExpires(),
                entity.isRequireIpAllowlistForProduction(),
                entity.getDefaultRateLimit() > 0 ? entity.getDefaultRateLimit() : entity.getRateLimitPerMinute(),
                entity.getMaxRateLimit() > 0 ? entity.getMaxRateLimit() : 1000,
                entity.getAllowedScopes(),
                entity.getAllowedModels()
        );
    }
}
