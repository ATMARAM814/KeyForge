package com.credx.keyforge.dto.marketplace;

import com.credx.keyforge.entity.ServiceCategory;
import com.credx.keyforge.entity.ServiceListing;
import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;

import java.time.Instant;
import java.util.ArrayList;
import java.util.List;

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
        String allowedModels,
        List<DeclaredEndpointPermission> declaredEndpoints
) {
    private static final ObjectMapper MAPPER = new ObjectMapper();

    public static ServiceListingResponse from(ServiceListing entity) {
        List<DeclaredEndpointPermission> endpoints = parseEndpoints(entity.getDeclaredEndpoints(), entity.getCategory());

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
                entity.getAllowedModels(),
                endpoints
        );
    }

    private static List<DeclaredEndpointPermission> parseEndpoints(String json, ServiceCategory category) {
        if (json != null && !json.isBlank()) {
            try {
                return MAPPER.readValue(json, new TypeReference<List<DeclaredEndpointPermission>>() {});
            } catch (Exception ignored) {}
        }

        // Standard category defaults if provider didn't explicitly set custom endpoints
        List<DeclaredEndpointPermission> defaults = new ArrayList<>();
        if (category == null) {
            defaults.add(new DeclaredEndpointPermission("/v1/invoke", List.of("POST")));
            return defaults;
        }

        switch (category) {
            case AI_LLM -> {
                defaults.add(new DeclaredEndpointPermission("/v1/chat/completions", List.of("POST")));
                defaults.add(new DeclaredEndpointPermission("/v1/embeddings", List.of("POST")));
                defaults.add(new DeclaredEndpointPermission("/v1/models", List.of("GET")));
            }
            case SPEECH -> {
                defaults.add(new DeclaredEndpointPermission("/v1/audio/transcriptions", List.of("POST")));
                defaults.add(new DeclaredEndpointPermission("/v1/audio/speech", List.of("POST")));
            }
            case COMPUTER_VISION -> {
                defaults.add(new DeclaredEndpointPermission("/v1/vision/detect", List.of("POST")));
                defaults.add(new DeclaredEndpointPermission("/v1/vision/ocr", List.of("POST")));
            }
            case NLP -> {
                defaults.add(new DeclaredEndpointPermission("/v1/nlp/sentiment", List.of("POST")));
                defaults.add(new DeclaredEndpointPermission("/v1/nlp/entities", List.of("POST")));
            }
            default -> {
                defaults.add(new DeclaredEndpointPermission("/v1/data", List.of("GET", "POST")));
                defaults.add(new DeclaredEndpointPermission("/v1/health", List.of("GET")));
            }
        }
        return defaults;
    }
}
