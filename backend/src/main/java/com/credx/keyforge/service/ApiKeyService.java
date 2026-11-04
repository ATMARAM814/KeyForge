package com.credx.keyforge.service;

import com.credx.keyforge.dto.apikey.ApiKeyCreatedResponse;
import com.credx.keyforge.dto.apikey.ApiKeyResponse;
import com.credx.keyforge.dto.apikey.CreateApiKeyRequest;
import com.credx.keyforge.entity.ApiKey;
import com.credx.keyforge.entity.ApiKeyStatus;
import com.credx.keyforge.entity.AuditLog;
import com.credx.keyforge.entity.MembershipRole;
import com.credx.keyforge.entity.Project;
import com.credx.keyforge.exception.ForbiddenOperationException;
import com.credx.keyforge.exception.ResourceNotFoundException;
import com.credx.keyforge.repository.ApiKeyRepository;
import com.credx.keyforge.repository.AuditLogRepository;
import com.credx.keyforge.repository.ProjectRepository;
import com.credx.keyforge.security.AuthenticatedUser;
import com.credx.keyforge.security.CurrentUserProvider;
import com.credx.keyforge.util.ApiKeyGenerator;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.util.List;

@Service
@RequiredArgsConstructor
public class ApiKeyService {

    private final ApiKeyRepository apiKeyRepository;
    private final ProjectRepository projectRepository;
    private final ApiKeyGenerator apiKeyGenerator;
    private final OrganizationAccessService accessService;
    private final AuditLogRepository auditLogRepository;
    private final CurrentUserProvider currentUserProvider;

    @Transactional
    public ApiKeyCreatedResponse createApiKey(String userId, String organizationId, String projectId, CreateApiKeyRequest request) {
        accessService.requireRole(userId, organizationId, MembershipRole.OWNER, MembershipRole.ADMIN, MembershipRole.MEMBER);

        Project project = projectRepository.findById(projectId)
                .orElseThrow(() -> new ResourceNotFoundException("Project not found"));
        if (!project.getOrganization().getId().equals(organizationId)) {
            throw new ResourceNotFoundException("Project not found");
        }

        ApiKeyGenerator.GeneratedKey generated = apiKeyGenerator.generate(project.getEnvironment());

        ApiKey apiKey = ApiKey.builder()
                .project(project)
                .name(request.name().trim())
                .keyPrefix(generated.keyPrefix())
                .hashedKey(generated.hashedKey())
                .scopes(request.scopes())
                .status(ApiKeyStatus.ACTIVE)
                .expiresAt(request.expiresAt())
                .rateLimitPerMinute(request.rateLimitPerMinute())
                .currentWindowCount(0)
                .currentWindowStart(Instant.now())
                .build();
        apiKey = apiKeyRepository.save(apiKey);

        writeAuditLog(organizationId, "API_KEY_CREATED", apiKey.getId(), "Created API key: " + apiKey.getName());

        return new ApiKeyCreatedResponse(toResponse(apiKey), generated.fullKey());
    }

    /**
     * Lists API keys for a project, paginated. Called from the API Keys list
     * page in the dashboard.
     */
    @Transactional(readOnly = true)
    public Page<ApiKeyResponse> listApiKeys(String userId, String organizationId, String projectId, Pageable pageable) {
        accessService.requireMembership(userId, organizationId);

        Project project = projectRepository.findById(projectId)
                .orElseThrow(() -> new ResourceNotFoundException("Project not found"));
        if (!project.getOrganization().getId().equals(organizationId)) {
            throw new ResourceNotFoundException("Project not found");
        }

        return apiKeyRepository.findAllByProjectIdOrderByCreatedAtDesc(projectId, pageable)
                .map(this::toResponse);
    }

    /**
     * Look up a single API key by ID.
     */
    @Transactional(readOnly = true)
    public ApiKeyResponse getApiKey(String userId, String apiKeyId) {
        ApiKey apiKey = apiKeyRepository.findById(apiKeyId)
                .orElseThrow(() -> new ResourceNotFoundException("API key not found"));

        String orgId = apiKey.getProject().getOrganization().getId();
        accessService.requireMembership(userId, orgId);

        return toResponse(apiKey);
    }

    @Transactional
    public void revokeApiKey(String userId, String apiKeyId) {
        ApiKey apiKey = apiKeyRepository.findById(apiKeyId)
                .orElseThrow(() -> new ResourceNotFoundException("API key not found"));

        String orgId = apiKey.getProject().getOrganization().getId();
        accessService.requireRole(userId, orgId, MembershipRole.OWNER, MembershipRole.ADMIN, MembershipRole.MEMBER);

        apiKey.setStatus(ApiKeyStatus.REVOKED);
        apiKey.setRevokedAt(Instant.now());
        apiKeyRepository.save(apiKey);

        writeAuditLog(orgId, "API_KEY_REVOKED", apiKey.getId(), "Revoked API key: " + apiKey.getName());
    }

    @Deprecated
    @Transactional(readOnly = true)
    public List<ApiKeyResponse> listAllApiKeysUnpaged(String projectId) {
        return apiKeyRepository.findAllByProjectIdOrderByCreatedAtDesc(projectId)
                .stream()
                .map(this::toResponse)
                .toList();
    }

    @Transactional
    public ApiKeyCreatedResponse rotateApiKey(String userId, String oldApiKeyId) {
        ApiKey oldKey = apiKeyRepository.findById(oldApiKeyId)
                .orElseThrow(() -> new ResourceNotFoundException("API key not found"));

        Project project = oldKey.getProject();
        String orgId = project.getOrganization().getId();
        accessService.requireRole(userId, orgId, MembershipRole.OWNER, MembershipRole.ADMIN);

        if (oldKey.getStatus() == ApiKeyStatus.REVOKED) {
            throw new ForbiddenOperationException("Cannot rotate a revoked API key");
        }

        oldKey.setStatus(ApiKeyStatus.REVOKED);
        oldKey.setRevokedAt(Instant.now());
        apiKeyRepository.save(oldKey);

        ApiKeyGenerator.GeneratedKey generated = apiKeyGenerator.generate(project.getEnvironment());

        ApiKey newKey = ApiKey.builder()
                .project(project)
                .name(oldKey.getName())
                .keyPrefix(generated.keyPrefix())
                .hashedKey(generated.hashedKey())
                .scopes(new java.util.ArrayList<>(oldKey.getScopes()))
                .status(ApiKeyStatus.ACTIVE)
                .expiresAt(null)
                .rateLimitPerMinute(oldKey.getRateLimitPerMinute())
                .currentWindowCount(0)
                .currentWindowStart(Instant.now())
                .build();
        newKey = apiKeyRepository.save(newKey);

        writeAuditLog(orgId, "API_KEY_ROTATED", newKey.getId(), "Rotated API key: " + newKey.getName());

        return new ApiKeyCreatedResponse(toResponse(newKey), generated.fullKey());
    }

    private void writeAuditLog(String organizationId, String action, String targetId, String details) {
        AuthenticatedUser actor = currentUserProvider.get();
        AuditLog log = AuditLog.builder()
                .organizationId(organizationId)
                .actorUserId(actor.getUserId())
                .actorEmail(actor.getEmail())
                .action(action)
                .targetType("API_KEY")
                .targetId(targetId)
                .details(details)
                .build();
        auditLogRepository.save(log);
    }

    private ApiKeyResponse toResponse(ApiKey apiKey) {
        return new ApiKeyResponse(
                apiKey.getId(),
                apiKey.getProject().getId(),
                apiKey.getProject().getName(),
                apiKey.getName(),
                apiKey.getKeyPrefix(),
                apiKey.getScopes(),
                apiKey.getStatus(),
                apiKey.getCreatedAt(),
                apiKey.getExpiresAt(),
                apiKey.getLastUsedAt(),
                apiKey.getRateLimitPerMinute());
    }
}
