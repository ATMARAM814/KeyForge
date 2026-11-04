package com.credx.keyforge.dto.marketplace;

import java.util.List;

public record DeclaredEndpointPermission(String endpoint, List<String> methods) {
}
