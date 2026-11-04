package com.credx.keyforge.repository;

import com.credx.keyforge.entity.AuditLog;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;

public interface AuditLogRepository extends JpaRepository<AuditLog, String> {
    Page<AuditLog> findAllByOrganizationIdOrderByCreatedAtDesc(String organizationId, Pageable pageable);

    Page<AuditLog> findAllByActorUserIdOrderByCreatedAtDesc(String actorUserId, Pageable pageable);

    @Query("SELECT a FROM AuditLog a WHERE a.organizationId IN :orgIds OR a.actorUserId = :actorUserId ORDER BY a.createdAt DESC")
    Page<AuditLog> findForUserAndOrgs(@Param("orgIds") List<String> orgIds, @Param("actorUserId") String actorUserId, Pageable pageable);
}
