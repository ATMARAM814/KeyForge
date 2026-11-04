package com.credx.keyforge.service;

import com.credx.keyforge.dto.auditlog.AuditLogResponse;
import com.credx.keyforge.entity.AuditLog;
import com.credx.keyforge.repository.AuditLogRepository;
import com.credx.keyforge.repository.OrganizationMembershipRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;

import java.util.List;

@Service
@RequiredArgsConstructor
public class AuditLogService {

    private final AuditLogRepository auditLogRepository;
    private final OrganizationMembershipRepository membershipRepository;
    private final OrganizationAccessService accessService;

    public Page<AuditLogResponse> getAuditLogs(String userId, String organizationId, Pageable pageable) {
        accessService.requireMembership(userId, organizationId);
        Page<AuditLog> page = auditLogRepository.findAllByOrganizationIdOrderByCreatedAtDesc(organizationId, pageable);
        return page.map(this::toResponse);
    }

    public Page<AuditLogResponse> getMyAuditLogs(String userId, Pageable pageable) {
        List<String> orgIds = membershipRepository.findAllByUserId(userId).stream()
                .map(m -> m.getOrganization().getId())
                .toList();

        Page<AuditLog> page;
        if (!orgIds.isEmpty()) {
            page = auditLogRepository.findForUserAndOrgs(orgIds, userId, pageable);
        } else {
            page = auditLogRepository.findAllByActorUserIdOrderByCreatedAtDesc(userId, pageable);
        }
        return page.map(this::toResponse);
    }

    private AuditLogResponse toResponse(AuditLog log) {
        return new AuditLogResponse(
                log.getId(),
                log.getOrganizationId(),
                log.getActorUserId(),
                log.getActorEmail(),
                log.getAction(),
                log.getTargetType(),
                log.getTargetId(),
                log.getDetails(),
                log.getCreatedAt()
        );
    }
}
