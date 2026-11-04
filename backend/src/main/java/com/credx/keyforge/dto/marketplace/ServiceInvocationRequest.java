package com.credx.keyforge.dto.marketplace;

public record ServiceInvocationRequest(
        String payload,
        String endpoint,
        String method
) {
    public ServiceInvocationRequest(String payload) {
        this(payload, null, "POST");
    }
}
