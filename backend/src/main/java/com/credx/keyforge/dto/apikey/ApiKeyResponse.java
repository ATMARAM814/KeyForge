package com.credx.keyforge.dto.apikey;

import com.credx.keyforge.entity.ApiKey;
import com.credx.keyforge.entity.ApiKeyStatus;
import com.credx.keyforge.entity.Scope;

import java.time.Instant;
import java.util.List;

public record ApiKeyResponse(
        String id,
        String projectId,
        String projectName,
        String name,
        String keyPrefix,
        List<Scope> scopes,
        ApiKeyStatus status,
        Instant createdAt,
        Instant expiresAt,
        Instant lastUsedAt,
        Integer rateLimitPerMinute,
        String serviceId,
        String serviceName,
        String providerName,
        String endpointUrl,
        String ownerEmail,
        String clientType,
        Long expectedRequestsPerDay,
        Integer expectedPeakPerMinute,
        String typicalRegions,
        Integer requestedRateLimit,
        String requestedRateLimitReason,
        String rateLimitApprovalStatus,
        Long rotationGracePeriodSeconds,
        String restrictions,
        String allowedEndpoints,
        Double spendCapUsd,
        String alertChannel,
        String alertWebhookUrl,
        String riskAction,
        Integer behavioralRiskScore,
        String tags
) {
    public ApiKeyResponse(
            String id,
            String projectId,
            String projectName,
            String name,
            String keyPrefix,
            List<Scope> scopes,
            ApiKeyStatus status,
            Instant createdAt,
            Instant expiresAt,
            Instant lastUsedAt,
            Integer rateLimitPerMinute
    ) {
        this(id, projectId, projectName, name, keyPrefix, scopes, status, createdAt, expiresAt, lastUsedAt, rateLimitPerMinute, null, name, null, null,
             null, "SERVER", null, null, null, null, null, "APPROVED", 86400L, null, null, null, "EMAIL", null, "ALERT_ONLY", 0, null);
    }

    public static ApiKeyResponse from(ApiKey apiKey) {
        String serviceId = apiKey.getServiceListing() != null ? apiKey.getServiceListing().getId() : null;
        String serviceName = apiKey.getServiceListing() != null ? apiKey.getServiceListing().getName() :
                (apiKey.getName() != null && apiKey.getName().startsWith("Sub: ") ? apiKey.getName().substring(5) : apiKey.getName());
        String providerName = apiKey.getServiceListing() != null ? apiKey.getServiceListing().getProviderName() : null;
        String endpointUrl = apiKey.getServiceListing() != null ? apiKey.getServiceListing().getEndpointUrl() : null;

        return new ApiKeyResponse(
                apiKey.getId(),
                apiKey.getProject() != null ? apiKey.getProject().getId() : null,
                apiKey.getProject() != null ? apiKey.getProject().getName() : null,
                apiKey.getName(),
                apiKey.getKeyPrefix(),
                apiKey.getScopes(),
                apiKey.getStatus(),
                apiKey.getCreatedAt(),
                apiKey.getExpiresAt(),
                apiKey.getLastUsedAt(),
                apiKey.getRateLimitPerMinute(),
                serviceId,
                serviceName,
                providerName,
                endpointUrl,
                apiKey.getOwnerEmail(),
                apiKey.getClientType() != null ? apiKey.getClientType() : "SERVER",
                apiKey.getExpectedRequestsPerDay(),
                apiKey.getExpectedPeakPerMinute(),
                apiKey.getTypicalRegions(),
                apiKey.getRequestedRateLimit(),
                apiKey.getRequestedRateLimitReason(),
                apiKey.getRateLimitApprovalStatus() != null ? apiKey.getRateLimitApprovalStatus() : "APPROVED",
                apiKey.getRotationGracePeriodSeconds() != null ? apiKey.getRotationGracePeriodSeconds() : 86400L,
                apiKey.getRestrictions(),
                apiKey.getAllowedEndpoints(),
                apiKey.getSpendCapUsd(),
                apiKey.getAlertChannel() != null ? apiKey.getAlertChannel() : "EMAIL",
                apiKey.getAlertWebhookUrl(),
                apiKey.getRiskAction() != null ? apiKey.getRiskAction() : "ALERT_ONLY",
                apiKey.getBehavioralRiskScore() != null ? apiKey.getBehavioralRiskScore() : 0,
                apiKey.getTags()
        );
    }
}
