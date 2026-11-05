package com.credx.keyforge.service;

import com.credx.keyforge.dto.apikey.ApiKeyCreatedResponse;
import com.credx.keyforge.dto.apikey.ApiKeyResponse;
import com.credx.keyforge.dto.marketplace.CreateServiceListingRequest;
import com.credx.keyforge.dto.marketplace.DeclaredEndpointPermission;
import com.credx.keyforge.dto.marketplace.ServiceInvocationRequest;
import com.credx.keyforge.dto.marketplace.ServiceInvocationResponse;
import com.credx.keyforge.dto.marketplace.ServiceListingResponse;
import com.credx.keyforge.entity.*;
import com.credx.keyforge.exception.ForbiddenOperationException;
import com.credx.keyforge.exception.ResourceNotFoundException;
import com.credx.keyforge.repository.*;
import com.credx.keyforge.security.AuthenticatedUser;
import com.credx.keyforge.security.CurrentUserProvider;
import com.credx.keyforge.util.ApiKeyGenerator;
import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import com.credx.keyforge.exception.BadRequestException;
import com.credx.keyforge.exception.GatewayPolicyException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.util.*;

@Service
@RequiredArgsConstructor
@Slf4j
public class ServiceListingService {

    private final ServiceListingRepository serviceRepository;
    private final CurrentUserProvider currentUserProvider;
    private final UserRepository userRepository;
    private final OrganizationRepository organizationRepository;
    private final OrganizationMembershipRepository membershipRepository;
    private final ProjectRepository projectRepository;
    private final ApiKeyRepository apiKeyRepository;
    private final ApiKeyGenerator apiKeyGenerator;
    private final ApiKeyValidationService validationService;
    private final GatewayEnforcementService gatewayEnforcementService;
    private final UsageLoggingService usageLoggingService;
    private final AuditLogRepository auditLogRepository;
    private final ObjectMapper objectMapper;

    @Transactional(readOnly = true)
    public List<ServiceListingResponse> listServices(ServiceCategory category, String search) {
        boolean hasCategory = (category != null);
        boolean hasSearch = (search != null && !search.trim().isBlank());

        if (hasCategory && hasSearch) {
            return serviceRepository.findByCategoryAndSearch(category, search.trim()).stream()
                    .map(ServiceListingResponse::from)
                    .toList();
        } else if (hasCategory) {
            return serviceRepository.findByCategoryAndIsActiveTrue(category).stream()
                    .map(ServiceListingResponse::from)
                    .toList();
        } else if (hasSearch) {
            return serviceRepository.search(search.trim()).stream()
                    .map(ServiceListingResponse::from)
                    .toList();
        } else {
            return serviceRepository.findByIsActiveTrueOrderByCreatedAtDesc().stream()
                    .map(ServiceListingResponse::from)
                    .toList();
        }
    }

    @Transactional(readOnly = true)
    public ServiceListingResponse getServiceById(String id) {
        ServiceListing service = serviceRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Service listing not found: " + id));
        return ServiceListingResponse.from(service);
    }

    @Transactional(readOnly = true)
    public List<ServiceListingResponse> getMyServices() {
        AuthenticatedUser current = currentUserProvider.get();
        return serviceRepository.findByProviderUserIdOrderByCreatedAtDesc(current.getUserId()).stream()
                .map(ServiceListingResponse::from)
                .toList();
    }

    @Transactional
    public ServiceListingResponse createService(CreateServiceListingRequest request) {
        AuthenticatedUser current = currentUserProvider.get();
        if (current.getRole() != Role.PROVIDER && current.getRole() != Role.ADMIN) {
            throw new ForbiddenOperationException("Only Provider accounts are authorized to publish services and AI models");
        }
        User user = userRepository.findById(current.getUserId())
                .orElseThrow(() -> new ForbiddenOperationException("User not found"));

        String baseSlug = request.name().toLowerCase().replaceAll("[^a-z0-9]+", "-").replaceAll("^-|-$", "");
        String slug = baseSlug + "-" + UUID.randomUUID().toString().substring(0, 6);

        int defRateLimit = request.defaultRateLimit() != null && request.defaultRateLimit() > 0
                ? request.defaultRateLimit()
                : (request.rateLimitPerMinute() != null ? request.rateLimitPerMinute() : 60);
        int maxRateLimit = request.maxRateLimit() != null && request.maxRateLimit() > 0
                ? request.maxRateLimit()
                : Math.max(defRateLimit * 5, 1000);

        String declaredEndpointsJson = normalizeEndpoints(request.declaredEndpoints(), request.category(), request.endpointUrl());

        ServiceListing listing = ServiceListing.builder()
                .name(request.name().trim())
                .slug(slug)
                .category(request.category())
                .description(request.description().trim())
                .providerName(user.getFullName() != null && !user.getFullName().isBlank() ? user.getFullName() : user.getEmail())
                .providerUserId(user.getId())
                .endpointUrl(request.endpointUrl().trim())
                .documentation(request.documentation())
                .samplePayload(request.samplePayload())
                .sampleResponse(request.sampleResponse())
                .rateLimitPerMinute(defRateLimit)
                .pricingTier(request.pricingTier() != null && !request.pricingTier().isBlank() ? request.pricingTier() : "Free / Community")
                .isActive(true)
                .maxExpiryDays(request.maxExpiryDays() != null ? request.maxExpiryDays() : 365)
                .allowNeverExpires(Boolean.TRUE.equals(request.allowNeverExpires()))
                .requireIpAllowlistForProduction(Boolean.TRUE.equals(request.requireIpAllowlistForProduction()))
                .defaultRateLimit(defRateLimit)
                .maxRateLimit(maxRateLimit)
                .allowedScopes(request.allowedScopes())
                .allowedModels(request.allowedModels())
                .declaredEndpoints(declaredEndpointsJson)
                .build();

        listing = serviceRepository.save(listing);

        auditLogRepository.save(AuditLog.builder()
                .organizationId("provider-org")
                .actorUserId(current.getUserId())
                .actorEmail(current.getEmail())
                .action("SERVICE_PUBLISHED")
                .targetType("SERVICE")
                .targetId(listing.getId())
                .details("Published service: " + listing.getName() + " (" + listing.getCategory() + ")")
                .build());

        return ServiceListingResponse.from(listing);
    }

    @Transactional
    public void deleteService(String id) {
        AuthenticatedUser current = currentUserProvider.get();
        ServiceListing listing = serviceRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Service listing not found: " + id));

        if (!current.getUserId().equals(listing.getProviderUserId()) && current.getRole() != Role.ADMIN) {
            throw new ForbiddenOperationException("You are not the provider of this service");
        }

        auditLogRepository.save(AuditLog.builder()
                .organizationId("provider-org")
                .actorUserId(current.getUserId())
                .actorEmail(current.getEmail())
                .action("SERVICE_DELETED")
                .targetType("SERVICE")
                .targetId(listing.getId())
                .details("Deleted service: " + listing.getName())
                .build());

        serviceRepository.delete(listing);
    }

    @Transactional
    public void clearAllServices() {
        serviceRepository.deleteAll();
    }

    /**
     * Subscribes a developer to a service and generates an API key immediately.
     */
    @Transactional
    public ApiKeyCreatedResponse subscribeAndGenerateKey(String serviceId) {
        return subscribeAndGenerateKey(serviceId, null);
    }

    @Transactional
    public ApiKeyCreatedResponse subscribeAndGenerateKey(String serviceId, com.credx.keyforge.dto.marketplace.SubscribeServiceRequest request) {
        AuthenticatedUser current = currentUserProvider.get();
        ServiceListing service = serviceRepository.findById(serviceId)
                .orElseThrow(() -> new ResourceNotFoundException("Service listing not found: " + serviceId));

        User user = userRepository.findById(current.getUserId()).orElseThrow();
        List<OrganizationMembership> memberships = membershipRepository.findAllByUserIdWithOrganization(current.getUserId());
        Organization organization;
        if (!memberships.isEmpty()) {
            organization = memberships.get(0).getOrganization();
        } else {
            organization = organizationRepository.save(Organization.builder()
                    .name(user.getFullName() != null ? user.getFullName() + "'s Workspace" : "Developer Workspace")
                    .slug("dev-" + UUID.randomUUID().toString().substring(0, 8))
                    .planTier(PlanTier.FREE)
                    .owner(user)
                    .build());
            membershipRepository.save(OrganizationMembership.builder()
                    .user(user)
                    .organization(organization)
                    .role(MembershipRole.OWNER)
                    .build());
        }

        Environment targetEnv = (request != null && request.environment() != null)
                ? request.environment()
                : Environment.PRODUCTION;

        Project project = projectRepository.findAllByOrganizationId(organization.getId())
                .stream()
                .filter(p -> p.getEnvironment() == targetEnv)
                .findFirst()
                .orElseGet(() -> projectRepository.save(Project.builder()
                        .organization(organization)
                        .name("Marketplace Subscriptions (" + targetEnv.name() + ")")
                        .description("Automated project for " + targetEnv.name() + " marketplace subscriptions")
                        .environment(targetEnv)
                        .build()));

        ApiKeyGenerator.GeneratedKey generated = apiKeyGenerator.generate(targetEnv);

        String keyName;
        if (request != null && request.applicationName() != null && !request.applicationName().isBlank()) {
            keyName = request.applicationName().trim();
        } else {
            keyName = "Sub: " + service.getName();
        }

        // ==========================================
        // PROVIDER POLICY & RESTRICTIONS ENFORCEMENT
        // ==========================================
        // 1. Expiration Policy
        Instant expiresAt = (request != null) ? request.expiresAt() : null;
        if (expiresAt == null) {
            if (!service.isAllowNeverExpires()) {
                int days = service.getMaxExpiryDays() != null && service.getMaxExpiryDays() > 0 ? service.getMaxExpiryDays() : 90;
                expiresAt = Instant.now().plusSeconds((long) days * 86400L);
            }
        } else if (service.getMaxExpiryDays() != null && service.getMaxExpiryDays() > 0) {
            Instant maxAllowed = Instant.now().plusSeconds((long) service.getMaxExpiryDays() * 86400L);
            if (expiresAt.isAfter(maxAllowed)) {
                throw new BadRequestException("Requested key expiry exceeds provider maximum allowed policy of " + service.getMaxExpiryDays() + " days.");
            }
        }

        // 2. IP Allowlist for Production Policy
        String restrictionsStr = null;
        if (request != null && request.restrictions() != null && !request.restrictions().isEmpty()) {
            restrictionsStr = String.join(",", request.restrictions()).trim();
        }
        if (service.isRequireIpAllowlistForProduction() && targetEnv == Environment.PRODUCTION) {
            if (restrictionsStr == null || restrictionsStr.isBlank() || restrictionsStr.equals("0.0.0.0/0")) {
                throw new BadRequestException("Provider policy requires an explicit IP allowlist for Production keys. '0.0.0.0/0' is not permitted.");
            }
        }

        // 3. Rate Limit & Approval Flow
        int defaultLimit = service.getDefaultRateLimit() > 0 ? service.getDefaultRateLimit() : service.getRateLimitPerMinute();
        int activeLimit = defaultLimit;
        String approvalStatus = "APPROVED";
        Integer requestedRate = (request != null) ? request.requestedRateLimit() : null;
        String requestedReason = (request != null) ? request.requestedRateLimitReason() : null;

        if (requestedRate != null && requestedRate > defaultLimit) {
            activeLimit = defaultLimit; // Enforced limit stays at provider default until approved
            approvalStatus = "PENDING_APPROVAL";
        }

        // 4. Allowed Endpoints (validated against provider's declared endpoints)
        String allowedEndpointsJson = null;
        if (request != null && request.allowedEndpoints() != null && !request.allowedEndpoints().isEmpty()) {
            List<DeclaredEndpointPermission> validated = filterAllowedEndpointsAgainstProvider(
                    request.allowedEndpoints(),
                    service.getDeclaredEndpoints()
            );
            try {
                allowedEndpointsJson = objectMapper.writeValueAsString(validated);
            } catch (Exception ignored) {}
        }

        // 5. Scopes (filtered by provider allowed scopes if configured)
        List<Scope> scopes;
        if (request != null && request.scopes() != null && !request.scopes().isEmpty()) {
            scopes = new ArrayList<>(request.scopes());
        } else {
            scopes = new ArrayList<>(List.of(Scope.READ_ANALYTICS, Scope.READ_PROJECTS));
        }

        if (service.getAllowedScopes() != null && !service.getAllowedScopes().isBlank()) {
            Set<String> permittedScopeNames = new HashSet<>(Arrays.stream(service.getAllowedScopes().split(","))
                    .map(String::trim)
                    .map(String::toUpperCase)
                    .toList());
            scopes.removeIf(s -> !permittedScopeNames.contains(s.name()));
            if (scopes.isEmpty()) {
                permittedScopeNames.stream()
                        .findFirst()
                        .ifPresent(name -> {
                            try {
                                scopes.add(Scope.valueOf(name));
                            } catch (Exception ignored) {}
                        });
            }
        }

        ApiKey apiKey = ApiKey.builder()
                .project(project)
                .serviceListing(service)
                .name(keyName)
                .keyPrefix(generated.keyPrefix())
                .hashedKey(generated.hashedKey())
                .scopes(scopes)
                .status(ApiKeyStatus.ACTIVE)
                .expiresAt(expiresAt)
                .rateLimitPerMinute(activeLimit)
                .currentWindowCount(0)
                .currentWindowStart(Instant.now())
                .ownerEmail(request != null && request.ownerEmail() != null ? request.ownerEmail().trim() : user.getEmail())
                .clientType(request != null && request.clientType() != null ? request.clientType() : "SERVER")
                .expectedRequestsPerDay(request != null ? request.expectedRequestsPerDay() : null)
                .expectedPeakPerMinute(request != null ? request.expectedPeakPerMinute() : null)
                .typicalRegions(request != null && request.typicalRegions() != null ? String.join(",", request.typicalRegions()) : null)
                .requestedRateLimit(requestedRate)
                .requestedRateLimitReason(requestedReason)
                .rateLimitApprovalStatus(approvalStatus)
                .rotationGracePeriodSeconds(request != null && request.rotationGracePeriodSeconds() != null ? request.rotationGracePeriodSeconds().longValue() : 86400L)
                .restrictions(restrictionsStr)
                .allowedEndpoints(allowedEndpointsJson)
                .spendCapUsd(request != null ? request.spendCapUsd() : null)
                .alertChannel(request != null && request.alertChannel() != null ? request.alertChannel() : "EMAIL")
                .alertWebhookUrl(request != null ? request.alertWebhookUrl() : null)
                .riskAction(request != null && request.riskAction() != null ? request.riskAction() : "ALERT_ONLY")
                .behavioralRiskScore(0)
                .tags(request != null && request.tags() != null ? String.join(",", request.tags()) : null)
                .build();
        apiKey = apiKeyRepository.save(apiKey);

        auditLogRepository.save(AuditLog.builder()
                .organizationId(organization.getId())
                .actorUserId(current.getUserId())
                .actorEmail(current.getEmail())
                .action("API_KEY_CREATED")
                .targetType("API_KEY")
                .targetId(apiKey.getId())
                .details("Subscribed to " + service.getName() + " (" + targetEnv + ")")
                .build());

        ApiKeyResponse response = ApiKeyResponse.from(apiKey);
        return new ApiKeyCreatedResponse(response, generated.fullKey());
    }

    @Transactional(readOnly = true)
    public List<ApiKeyResponse> getMySubscribedKeys() {
        AuthenticatedUser current = currentUserProvider.get();
        return apiKeyRepository.findAllByUserId(current.getUserId()).stream()
                .map(ApiKeyResponse::from)
                .toList();
    }

    @Transactional(readOnly = true)
    public List<ApiKeyResponse> getProviderRateLimitRequests() {
        AuthenticatedUser current = currentUserProvider.get();
        return apiKeyRepository.findAllRateLimitRequestsForProvider(current.getUserId()).stream()
                .map(ApiKeyResponse::from)
                .toList();
    }

    @Transactional
    public ApiKeyResponse approveRateLimitRequest(String keyId) {
        AuthenticatedUser current = currentUserProvider.get();
        ApiKey apiKey = apiKeyRepository.findById(keyId)
                .orElseThrow(() -> new ResourceNotFoundException("API Key not found: " + keyId));

        if (apiKey.getServiceListing() == null ||
                (!apiKey.getServiceListing().getProviderUserId().equals(current.getUserId()) && current.getRole() != Role.ADMIN)) {
            throw new ForbiddenOperationException("You are not authorized to approve rate limit requests for this service");
        }

        if (apiKey.getRequestedRateLimit() != null && apiKey.getRequestedRateLimit() > 0) {
            apiKey.setRateLimitPerMinute(apiKey.getRequestedRateLimit());
            apiKey.setRateLimitApprovalStatus("APPROVED");
            apiKeyRepository.save(apiKey);

            auditLogRepository.save(AuditLog.builder()
                    .organizationId(apiKey.getProject().getOrganization().getId())
                    .actorUserId(current.getUserId())
                    .actorEmail(current.getEmail())
                    .action("RATE_LIMIT_APPROVED")
                    .targetType("API_KEY")
                    .targetId(apiKey.getId())
                    .details("Approved rate limit increase to " + apiKey.getRateLimitPerMinute() + " req/min for key: " + apiKey.getName())
                    .build());
        }
        return ApiKeyResponse.from(apiKey);
    }

    @Transactional
    public ApiKeyResponse rejectRateLimitRequest(String keyId) {
        AuthenticatedUser current = currentUserProvider.get();
        ApiKey apiKey = apiKeyRepository.findById(keyId)
                .orElseThrow(() -> new ResourceNotFoundException("API Key not found: " + keyId));

        if (apiKey.getServiceListing() == null ||
                (!apiKey.getServiceListing().getProviderUserId().equals(current.getUserId()) && current.getRole() != Role.ADMIN)) {
            throw new ForbiddenOperationException("You are not authorized to reject rate limit requests for this service");
        }

        apiKey.setRateLimitApprovalStatus("REJECTED");
        apiKeyRepository.save(apiKey);

        auditLogRepository.save(AuditLog.builder()
                .organizationId(apiKey.getProject().getOrganization().getId())
                .actorUserId(current.getUserId())
                .actorEmail(current.getEmail())
                .action("RATE_LIMIT_REJECTED")
                .targetType("API_KEY")
                .targetId(apiKey.getId())
                .details("Rejected rate limit increase for key: " + apiKey.getName())
                .build());

        return ApiKeyResponse.from(apiKey);
    }

    /**
     * Executes / tests a service in the Testing Console with an API key, enforcing full gateway policy.
     */
    @Transactional
    public ServiceInvocationResponse invokeService(
            String serviceId,
            String apiKeyHeader,
            ServiceInvocationRequest request,
            String clientIp,
            String origin,
            String region,
            String appId
    ) {
        ServiceListing service = serviceRepository.findById(serviceId)
                .orElseThrow(() -> new ResourceNotFoundException("Service listing not found: " + serviceId));

        Optional<ApiKey> resolved = validationService.resolveKey(apiKeyHeader);
        if (resolved.isEmpty()) {
            throw new GatewayPolicyException(401, "UNAUTHORIZED", "Invalid or missing X-API-Key. Please subscribe to get a valid key.");
        }

        ApiKey apiKey = resolved.get();

        String targetPath = (request != null && request.endpoint() != null && !request.endpoint().isBlank())
                ? request.endpoint()
                : service.getEndpointUrl();
        String httpMethod = (request != null && request.method() != null && !request.method().isBlank())
                ? request.method().toUpperCase()
                : "POST";

        // Gateway enforcement: rate limit, client restriction, endpoint (provider & key), risk scoring, high-risk action
        GatewayEnforcementService.EnforcementResult enforcement = gatewayEnforcementService.enforce(
                apiKey,
                clientIp != null ? clientIp : "127.0.0.1",
                origin != null ? origin : "http://localhost:4200",
                appId,
                targetPath,
                httpMethod,
                region != null ? region : "US",
                true // isConsoleTest: enables interactive console testing without transport mismatch failure
        );

        if (!enforcement.allowed()) {
            throw new GatewayPolicyException(enforcement.httpStatus(), enforcement.errorCode(), enforcement.errorMessage());
        }

        long latency = Math.max(15, (long) (Math.random() * 85) + 30);

        usageLoggingService.recordUsage(
                apiKey,
                targetPath,
                httpMethod,
                200,
                latency
        );

        Object responseData = buildSimulatedResponse(service, request != null ? request.payload() : null, httpMethod, targetPath);

        Map<String, Object> metrics = Map.of(
                "tokensUsed", (int) (Math.random() * 120) + 40,
                "rateLimitRemaining", Math.max(0, apiKey.getRateLimitPerMinute() - apiKey.getCurrentWindowCount()),
                "rateLimitLimit", apiKey.getRateLimitPerMinute(),
                "serviceTier", service.getPricingTier(),
                "behavioralRiskScore", enforcement.riskScore(),
                "riskAnomalies", enforcement.anomalies()
        );

        return new ServiceInvocationResponse(
                200,
                latency,
                service.getName(),
                service.getCategory().name(),
                Instant.now(),
                responseData,
                metrics
        );
    }

    private Object buildSimulatedResponse(ServiceListing service, String inputPayload, String httpMethod, String targetPath) {
        if ("GET".equalsIgnoreCase(httpMethod)) {
            if (targetPath != null && targetPath.contains("models")) {
                return Map.of(
                        "object", "list",
                        "data", List.of(
                                Map.of(
                                        "id", service.getSlug(),
                                        "object", "model",
                                        "created", service.getCreatedAt() != null ? service.getCreatedAt().getEpochSecond() : Instant.now().getEpochSecond(),
                                        "owned_by", service.getProviderName()
                                )
                        )
                );
            }
            return Map.of(
                    "status", "ONLINE",
                    "endpoint", targetPath != null ? targetPath : service.getEndpointUrl(),
                    "model", service.getName(),
                    "category", service.getCategory().name(),
                    "description", service.getDescription() != null ? service.getDescription() : "Endpoint operational",
                    "capabilities", List.of("chat_completions", "embeddings", "streaming"),
                    "supported_methods", List.of("GET", "POST"),
                    "timestamp", Instant.now().toString()
            );
        }

        if (service.getSampleResponse() != null && !service.getSampleResponse().isBlank()) {
            try {
                return objectMapper.readValue(service.getSampleResponse(), new TypeReference<Map<String, Object>>() {});
            } catch (Exception ignored) {
                return Map.of("rawOutput", service.getSampleResponse());
            }
        }

        return switch (service.getCategory()) {
            case AI_LLM -> {
                if (targetPath != null && targetPath.contains("embeddings")) {
                    yield Map.of(
                            "object", "list",
                            "data", List.of(
                                    Map.of(
                                            "object", "embedding",
                                            "index", 0,
                                            "embedding", List.of(0.0023, -0.0124, 0.0451, 0.0098, -0.0312, 0.0815, -0.0042, 0.0195)
                                    )
                            ),
                            "model", service.getName(),
                            "usage", Map.of("prompt_tokens", 8, "total_tokens", 8)
                    );
                }
                yield Map.of(
                        "id", "chatcmpl-" + UUID.randomUUID().toString().substring(0, 10),
                        "model", service.getName(),
                        "choices", List.of(Map.of(
                                "message", Map.of(
                                        "role", "assistant",
                                        "content", "Inference successful from " + service.getName() + ". Processed payload: " + (inputPayload != null ? inputPayload : "default prompt")
                                ),
                                "finish_reason", "stop"
                        ))
                );
            }
            case COMPUTER_VISION -> Map.of(
                    "model", service.getName(),
                    "detections", List.of(
                            Map.of("label", "object_primary", "confidence", 0.984, "box", List.of(120, 45, 340, 290)),
                            Map.of("label", "context_background", "confidence", 0.892, "box", List.of(0, 0, 800, 600))
                    )
            );
            case NLP -> Map.of(
                    "sentiment", "POSITIVE",
                    "score", 0.961,
                    "entities", List.of(Map.of("entity", "KeyForge", "type", "ORGANIZATION")),
                    "language", "en"
            );
            case SPEECH -> Map.of(
                    "transcription", "Speech processed with 99.2% accuracy.",
                    "duration_seconds", 3.4,
                    "words_count", 8
            );
            default -> Map.of(
                    "status", "success",
                    "code", 200,
                    "message", "Service " + service.getName() + " executed successfully.",
                    "result", Map.of("processedAt", Instant.now().toString())
            );
        };
    }

    public String normalizeEndpoints(List<DeclaredEndpointPermission> endpoints, ServiceCategory category, String baseEndpointUrl) {
        return normalizeEndpointsWithMapper(this.objectMapper, endpoints, category, baseEndpointUrl);
    }

    public static String normalizeEndpointsWithMapper(ObjectMapper objectMapper, List<DeclaredEndpointPermission> endpoints, ServiceCategory category, String baseEndpointUrl) {
        List<DeclaredEndpointPermission> normalized = new ArrayList<>();

        if (endpoints != null && !endpoints.isEmpty()) {
            for (DeclaredEndpointPermission ep : endpoints) {
                if (ep.endpoint() == null || ep.endpoint().isBlank()) continue;
                String path = ep.endpoint().trim();
                if (!path.startsWith("/")) path = "/" + path;

                List<String> methods = new ArrayList<>();
                if (ep.methods() != null && !ep.methods().isEmpty()) {
                    for (String m : ep.methods()) {
                        String clean = m.trim().toUpperCase();
                        if (!methods.contains(clean)) methods.add(clean);
                    }
                }
                // Automatically ensure GET is supported on all declared endpoints for reading & testing
                if (!methods.contains("GET")) {
                    methods.add(0, "GET");
                }
                if (methods.isEmpty() || (methods.size() == 1 && methods.contains("GET") && !path.contains("model"))) {
                    if (!methods.contains("POST")) methods.add("POST");
                }
                normalized.add(new DeclaredEndpointPermission(path, methods));
            }
        }

        // If no endpoints were provided, dynamically generate standard endpoints based on category
        if (normalized.isEmpty()) {
            if (category == ServiceCategory.AI_LLM) {
                normalized.add(new DeclaredEndpointPermission("/v1/chat/completions", List.of("GET", "POST")));
                normalized.add(new DeclaredEndpointPermission("/v1/embeddings", List.of("GET", "POST")));
                normalized.add(new DeclaredEndpointPermission("/v1/models", List.of("GET")));
            } else if (category == ServiceCategory.COMPUTER_VISION) {
                normalized.add(new DeclaredEndpointPermission("/v1/vision/detect", List.of("GET", "POST")));
                normalized.add(new DeclaredEndpointPermission("/v1/vision/ocr", List.of("GET", "POST")));
            } else if (category == ServiceCategory.SPEECH) {
                normalized.add(new DeclaredEndpointPermission("/v1/audio/transcriptions", List.of("GET", "POST")));
                normalized.add(new DeclaredEndpointPermission("/v1/audio/speech", List.of("GET", "POST")));
            } else if (category == ServiceCategory.NLP) {
                normalized.add(new DeclaredEndpointPermission("/v1/nlp/sentiment", List.of("GET", "POST")));
                normalized.add(new DeclaredEndpointPermission("/v1/nlp/entities", List.of("GET", "POST")));
            } else {
                normalized.add(new DeclaredEndpointPermission("/v1/data", List.of("GET", "POST")));
                normalized.add(new DeclaredEndpointPermission("/v1/health", List.of("GET")));
            }
        }

        try {
            return objectMapper.writeValueAsString(normalized);
        } catch (Exception e) {
            return "[]";
        }
    }

    public List<DeclaredEndpointPermission> filterAllowedEndpointsAgainstProvider(
            List<DeclaredEndpointPermission> requested,
            String providerEndpointsJson
    ) {
        if (requested == null || requested.isEmpty()) return Collections.emptyList();
        if (providerEndpointsJson == null || providerEndpointsJson.isBlank() || providerEndpointsJson.equals("*")) {
            return requested;
        }

        List<DeclaredEndpointPermission> providerEndpoints;
        try {
            providerEndpoints = objectMapper.readValue(providerEndpointsJson, new TypeReference<List<DeclaredEndpointPermission>>() {});
        } catch (Exception e) {
            return requested;
        }

        List<DeclaredEndpointPermission> filtered = new ArrayList<>();
        for (DeclaredEndpointPermission req : requested) {
            if (req.endpoint() == null || req.endpoint().isBlank()) continue;
            List<String> allowedMethods = new ArrayList<>();
            for (DeclaredEndpointPermission prov : providerEndpoints) {
                if (prov.endpoint() != null && prov.endpoint().equalsIgnoreCase(req.endpoint())) {
                    if (prov.methods() == null || prov.methods().isEmpty() || prov.methods().contains("*") || prov.methods().contains("ALL")) {
                        if (req.methods() != null) {
                            for (String m : req.methods()) {
                                String clean = m.trim().toUpperCase();
                                if (!allowedMethods.contains(clean)) allowedMethods.add(clean);
                            }
                        }
                    } else {
                        if (req.methods() != null) {
                            for (String m : req.methods()) {
                                String clean = m.trim().toUpperCase();
                                if (prov.methods().stream().anyMatch(pm -> pm.equalsIgnoreCase(clean))) {
                                    if (!allowedMethods.contains(clean)) allowedMethods.add(clean);
                                }
                            }
                        }
                    }
                    break;
                }
            }
            if (!allowedMethods.isEmpty()) {
                filtered.add(new DeclaredEndpointPermission(req.endpoint(), allowedMethods));
            }
        }
        return filtered.isEmpty() ? requested : filtered;
    }
}
