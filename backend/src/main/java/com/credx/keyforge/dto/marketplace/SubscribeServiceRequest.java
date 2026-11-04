package com.credx.keyforge.dto.marketplace;

import com.credx.keyforge.entity.Environment;
import com.credx.keyforge.entity.Scope;
import jakarta.validation.constraints.Size;

import java.time.Instant;
import java.util.List;

public record SubscribeServiceRequest(
        @Size(min = 2, max = 100, message = "Application name must be between 2 and 100 characters")
        String applicationName,

        Environment environment,

        String ownerEmail,

        String clientType,

        Long expectedRequestsPerDay,

        Integer expectedPeakPerMinute,

        List<String> typicalRegions,

        Integer requestedRateLimit,

        String requestedRateLimitReason,

        Instant expiresAt,

        Long rotationGracePeriodSeconds,

        String restrictions,

        List<DeclaredEndpointPermission> allowedEndpoints,

        List<Scope> scopes,

        Double spendCapUsd,

        String alertChannel,

        String alertWebhookUrl,

        String riskAction,

        String tags,

        // Legacy / fallback fields
        String description,
        Integer rateLimitPerMinute,
        String allowedIps
) {
}
