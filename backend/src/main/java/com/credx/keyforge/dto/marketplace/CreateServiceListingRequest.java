package com.credx.keyforge.dto.marketplace;

import com.credx.keyforge.entity.ServiceCategory;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

public record CreateServiceListingRequest(
        @NotBlank(message = "Service name is required")
        @Size(max = 100, message = "Name must be <= 100 characters")
        String name,

        @NotNull(message = "Category is required")
        ServiceCategory category,

        @NotBlank(message = "Description is required")
        @Size(max = 2000, message = "Description must be <= 2000 characters")
        String description,

        @NotBlank(message = "Endpoint URL is required")
        String endpointUrl,

        String documentation,
        String samplePayload,
        String sampleResponse,

        Integer rateLimitPerMinute,
        String pricingTier,

        Integer maxExpiryDays,
        Boolean allowNeverExpires,
        Boolean requireIpAllowlistForProduction,
        Integer defaultRateLimit,
        Integer maxRateLimit,
        String allowedScopes,
        String allowedModels
) {
}
