package com.credx.keyforge.dto.marketplace;

import java.time.Instant;
import java.util.Map;

public record ServiceInvocationResponse(
        int statusCode,
        long latencyMs,
        String serviceName,
        String category,
        Instant timestamp,
        Object responseData,
        Map<String, Object> metrics
) {
}
