package com.credx.keyforge.service;

import com.credx.keyforge.dto.marketplace.DeclaredEndpointPermission;
import com.credx.keyforge.entity.ApiKey;
import com.credx.keyforge.entity.ApiKeyStatus;
import com.credx.keyforge.repository.ApiKeyRepository;
import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.net.InetAddress;
import java.time.Instant;
import java.time.ZoneOffset;
import java.time.ZonedDateTime;
import java.util.*;

@Service
@RequiredArgsConstructor
@Slf4j
public class GatewayEnforcementService {

    private final ApiKeyRepository apiKeyRepository;
    private final ObjectMapper objectMapper;

    public record EnforcementResult(
            boolean allowed,
            int httpStatus,
            String errorCode,
            String errorMessage,
            int riskScore,
            List<String> anomalies
    ) {
        public static EnforcementResult ok(int riskScore, List<String> anomalies) {
            return new EnforcementResult(true, 200, null, null, riskScore, anomalies);
        }

        public static EnforcementResult denied(int status, String code, String message, int riskScore, List<String> anomalies) {
            return new EnforcementResult(false, status, code, message, riskScore, anomalies);
        }
    }

    /**
     * Executes end-to-end gateway policy enforcement:
     * 1. Status & Expiration
     * 2. IP / Origin / App ID restrictions
     * 3. Endpoints & Scopes
     * 4. Behavioral risk scoring (region, peak volume, off-hours)
     * 5. Configured high-risk action enforcement (AUTO_SUSPEND, THROTTLE, ALERT_ONLY)
     * 6. Rate-limit enforcement
     */
    @Transactional
    public EnforcementResult enforce(
            ApiKey apiKey,
            String clientIp,
            String origin,
            String appId,
            String targetPath,
            String httpMethod,
            String observedRegion
    ) {
        Instant now = Instant.now();
        List<String> anomalies = new ArrayList<>();

        // 1. Status & Expiration
        if (apiKey.getStatus() == ApiKeyStatus.REVOKED) {
            return EnforcementResult.denied(401, "KEY_REVOKED", "The presented API key has been revoked", 100, List.of("Key is revoked"));
        }
        if (apiKey.getStatus() == ApiKeyStatus.SUSPENDED) {
            return EnforcementResult.denied(403, "KEY_SUSPENDED", "The API key is suspended due to security or policy enforcement", 100, List.of("Key is suspended"));
        }
        if (apiKey.getExpiresAt() != null && now.isAfter(apiKey.getExpiresAt())) {
            apiKey.setStatus(ApiKeyStatus.EXPIRED);
            apiKeyRepository.save(apiKey);
            return EnforcementResult.denied(401, "KEY_EXPIRED", "The API key has expired", 100, List.of("Key is expired"));
        }

        // 2. Client Restrictions (IP / Origin / App ID)
        String clientType = apiKey.getClientType() != null ? apiKey.getClientType().toUpperCase() : "SERVER";
        String restrictions = apiKey.getRestrictions();

        if (restrictions != null && !restrictions.isBlank()) {
            List<String> restrictionList = parseRestrictions(restrictions);
            if (!restrictionList.isEmpty()) {
                if (clientType.equals("SERVER") || clientType.equals("CI_BATCH")) {
                    if (!restrictionList.contains("0.0.0.0/0")) {
                        boolean ipMatches = isIpPermitted(clientIp, restrictionList);
                        if (!ipMatches) {
                            return EnforcementResult.denied(403, "IP_RESTRICTION_VIOLATION",
                                    "Client IP address (" + (clientIp != null ? clientIp : "unknown") + ") is not authorized by the key's IP allowlist",
                                    80, List.of("Unauthorized IP address: " + clientIp));
                        }
                    }
                } else if (clientType.equals("BROWSER")) {
                    boolean originMatches = isOriginPermitted(origin, restrictionList);
                    if (!originMatches) {
                        return EnforcementResult.denied(403, "ORIGIN_RESTRICTION_VIOLATION",
                                "Request origin (" + (origin != null ? origin : "empty") + ") is not authorized by the key's allowed origins",
                                80, List.of("Unauthorized browser origin: " + origin));
                    }
                } else if (clientType.equals("MOBILE")) {
                    boolean appMatches = isAppIdPermitted(appId, restrictionList);
                    if (!appMatches) {
                        return EnforcementResult.denied(403, "APP_ID_RESTRICTION_VIOLATION",
                                "Application identifier (" + (appId != null ? appId : "empty") + ") is not authorized by the key's mobile restrictions",
                                80, List.of("Unauthorized mobile App ID: " + appId));
                    }
                }
            }
        }

        // 3. Endpoints & Scopes Enforcement
        if (apiKey.getAllowedEndpoints() != null && !apiKey.getAllowedEndpoints().isBlank() && targetPath != null) {
            boolean endpointAllowed = isEndpointPermitted(targetPath, httpMethod, apiKey.getAllowedEndpoints());
            if (!endpointAllowed) {
                return EnforcementResult.denied(403, "ENDPOINT_NOT_ALLOWED",
                        "The API key is not permitted to access endpoint [" + (httpMethod != null ? httpMethod : "ANY") + " " + targetPath + "]",
                        60, List.of("Forbidden endpoint accessed: " + httpMethod + " " + targetPath));
            }
        }

        // 4. Update Window Counter for Rate Limiting & Behavioral Scoring
        if (apiKey.getCurrentWindowStart() == null || now.isAfter(apiKey.getCurrentWindowStart().plusSeconds(60))) {
            apiKey.setCurrentWindowStart(now);
            apiKey.setCurrentWindowCount(0);
        }
        int currentCount = (apiKey.getCurrentWindowCount() != null ? apiKey.getCurrentWindowCount() : 0) + 1;
        apiKey.setCurrentWindowCount(currentCount);
        apiKey.setLastUsedAt(now);

        // 5. Behavioral Risk Scoring Engine
        int riskScore = 0;

        // A. Unexpected Region
        String declaredRegions = apiKey.getTypicalRegions();
        String regionToCheck = (observedRegion != null && !observedRegion.isBlank()) ? observedRegion : "US";
        if (declaredRegions != null && !declaredRegions.isBlank()) {
            List<String> allowedRegions = Arrays.stream(declaredRegions.split(","))
                    .map(String::trim)
                    .map(String::toUpperCase)
                    .toList();
            if (!allowedRegions.contains("GLOBAL") && !allowedRegions.contains(regionToCheck.toUpperCase())) {
                riskScore += 35;
                anomalies.add("Request from unexpected region: " + regionToCheck + " (declared: " + declaredRegions + ")");
            }
        }

        // B. Volume Far Above Declared Peak
        Integer declaredPeak = apiKey.getExpectedPeakPerMinute();
        if (declaredPeak != null && declaredPeak > 0) {
            if (currentCount > (int) (declaredPeak * 1.5)) {
                riskScore += 35;
                anomalies.add("Current velocity (" + currentCount + " rpm) far exceeds declared peak (" + declaredPeak + " rpm)");
            }
        }

        // C. Requests Outside Declared / Regular Hours
        ZonedDateTime utcNow = ZonedDateTime.ofInstant(now, ZoneOffset.UTC);
        int hour = utcNow.getHour();
        if ((hour >= 1 && hour <= 4) && currentCount > 15) {
            riskScore += 20;
            anomalies.add("Off-hours high-velocity request burst detected (UTC hour: " + hour + ")");
        }

        riskScore = Math.min(100, Math.max(0, riskScore));
        apiKey.setBehavioralRiskScore(riskScore);

        // 6. High-Risk Action Enforcement
        String riskAction = apiKey.getRiskAction() != null ? apiKey.getRiskAction().toUpperCase() : "ALERT_ONLY";
        if (riskScore >= 70) {
            if ("AUTO_SUSPEND".equals(riskAction)) {
                apiKey.setStatus(ApiKeyStatus.SUSPENDED);
                apiKeyRepository.save(apiKey);
                log.warn("API key {} automatically SUSPENDED due to high risk score {}. Anomalies: {}", apiKey.getId(), riskScore, anomalies);
                return EnforcementResult.denied(403, "KEY_AUTO_SUSPENDED",
                        "Key automatically SUSPENDED due to high risk score (" + riskScore + "). Anomalies: " + String.join("; ", anomalies),
                        riskScore, anomalies);
            } else if ("THROTTLE".equals(riskAction)) {
                int throttledLimit = 10;
                if (currentCount > throttledLimit) {
                    apiKeyRepository.save(apiKey);
                    log.warn("API key {} THROTTLED due to high risk score {}. Limit: {} rpm", apiKey.getId(), riskScore, throttledLimit);
                    return EnforcementResult.denied(429, "THROTTLED_HIGH_RISK",
                            "Request throttled to " + throttledLimit + " req/min due to elevated behavioral risk score (" + riskScore + ")",
                            riskScore, anomalies);
                }
            } else {
                log.warn("ALERT: High behavioral risk detected for API key {} (score: {}). Anomalies: {}", apiKey.getId(), riskScore, anomalies);
            }
        }

        // 7. Standard Rate Limit Check
        int maxRateLimit = apiKey.getRateLimitPerMinute() != null && apiKey.getRateLimitPerMinute() > 0 ? apiKey.getRateLimitPerMinute() : 60;
        if (currentCount > maxRateLimit) {
            apiKeyRepository.save(apiKey);
            return EnforcementResult.denied(429, "TOO_MANY_REQUESTS",
                    "Rate limit exceeded (" + maxRateLimit + " requests/min)",
                    riskScore, anomalies);
        }

        apiKeyRepository.save(apiKey);
        return EnforcementResult.ok(riskScore, anomalies);
    }

    private List<String> parseRestrictions(String restrictionsStr) {
        if (restrictionsStr == null || restrictionsStr.isBlank()) {
            return Collections.emptyList();
        }
        if (restrictionsStr.trim().startsWith("[")) {
            try {
                return objectMapper.readValue(restrictionsStr, new TypeReference<List<String>>() {});
            } catch (Exception ignored) {}
        }
        return Arrays.stream(restrictionsStr.split(","))
                .map(String::trim)
                .filter(s -> !s.isBlank())
                .toList();
    }

    private boolean isIpPermitted(String clientIp, List<String> allowlist) {
        if (clientIp == null || clientIp.isBlank()) {
            return false;
        }
        String cleanIp = clientIp.trim();
        if (cleanIp.equals("0:0:0:0:0:0:0:1") || cleanIp.equals("::1")) {
            cleanIp = "127.0.0.1";
        }

        for (String allowed : allowlist) {
            String entry = allowed.trim();
            if (entry.equals("0.0.0.0/0") || entry.equals("*")) {
                return true;
            }
            if (entry.equalsIgnoreCase(cleanIp) || (cleanIp.equals("127.0.0.1") && (entry.equals("localhost") || entry.equals("127.0.0.1")))) {
                return true;
            }
            if (entry.contains("/") && matchCidr(cleanIp, entry)) {
                return true;
            }
        }
        return false;
    }

    private boolean matchCidr(String ip, String cidr) {
        try {
            String[] parts = cidr.split("/");
            if (parts.length != 2) return false;
            InetAddress ipAddr = InetAddress.getByName(ip);
            InetAddress subnetAddr = InetAddress.getByName(parts[0]);
            int prefix = Integer.parseInt(parts[1]);

            byte[] ipBytes = ipAddr.getAddress();
            byte[] subnetBytes = subnetAddr.getAddress();
            if (ipBytes.length != subnetBytes.length) return false;

            int bytesToCheck = prefix / 8;
            int remainingBits = prefix % 8;

            for (int i = 0; i < bytesToCheck; i++) {
                if (ipBytes[i] != subnetBytes[i]) return false;
            }
            if (remainingBits > 0 && bytesToCheck < ipBytes.length) {
                int mask = 0xFF << (8 - remainingBits);
                if ((ipBytes[bytesToCheck] & mask) != (subnetBytes[bytesToCheck] & mask)) {
                    return false;
                }
            }
            return true;
        } catch (Exception e) {
            return false;
        }
    }

    private boolean isOriginPermitted(String origin, List<String> allowedOrigins) {
        if (origin == null || origin.isBlank()) {
            return false;
        }
        String lowerOrigin = origin.toLowerCase().trim();
        for (String allowed : allowedOrigins) {
            String lowerAllowed = allowed.toLowerCase().trim();
            if (lowerAllowed.equals("*") || lowerOrigin.equals(lowerAllowed) || lowerOrigin.endsWith("." + lowerAllowed) || lowerOrigin.contains(lowerAllowed)) {
                return true;
            }
        }
        return false;
    }

    private boolean isAppIdPermitted(String appId, List<String> allowedAppIds) {
        if (appId == null || appId.isBlank()) {
            return false;
        }
        String cleanAppId = appId.trim();
        for (String allowed : allowedAppIds) {
            String entry = allowed.trim();
            if (entry.equals("*") || entry.equalsIgnoreCase(cleanAppId)) {
                return true;
            }
        }
        return false;
    }

    private boolean isEndpointPermitted(String targetPath, String method, String allowedEndpointsJson) {
        try {
            List<DeclaredEndpointPermission> permissions = objectMapper.readValue(
                    allowedEndpointsJson,
                    new TypeReference<List<DeclaredEndpointPermission>>() {}
            );
            if (permissions.isEmpty()) {
                return true;
            }
            for (DeclaredEndpointPermission perm : permissions) {
                if (matchesPath(targetPath, perm.endpoint())) {
                    if (perm.methods() == null || perm.methods().isEmpty()) {
                        return true;
                    }
                    if (method == null || perm.methods().stream().anyMatch(m -> m.equalsIgnoreCase(method))) {
                        return true;
                    }
                }
            }
            return false;
        } catch (Exception e) {
            return true;
        }
    }

    private boolean matchesPath(String requestPath, String pattern) {
        if (pattern == null || pattern.equals("*") || pattern.equals("/*")) {
            return true;
        }
        String cleanReq = requestPath.trim();
        String cleanPat = pattern.trim();
        if (cleanReq.equalsIgnoreCase(cleanPat)) {
            return true;
        }
        if (cleanPat.endsWith("/*")) {
            String prefix = cleanPat.substring(0, cleanPat.length() - 2);
            return cleanReq.startsWith(prefix);
        }
        return cleanReq.startsWith(cleanPat);
    }
}
