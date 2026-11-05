package com.credx.keyforge.service;

import com.credx.keyforge.dto.auth.AuthResponse;
import com.credx.keyforge.dto.auth.LoginRequest;
import com.credx.keyforge.dto.auth.RegisterRequest;
import com.credx.keyforge.entity.*;
import com.credx.keyforge.exception.DuplicateResourceException;
import com.credx.keyforge.exception.InvalidCredentialsException;
import com.credx.keyforge.repository.AuditLogRepository;
import com.credx.keyforge.repository.OrganizationMembershipRepository;
import com.credx.keyforge.repository.OrganizationRepository;
import com.credx.keyforge.repository.ServiceListingRepository;
import com.credx.keyforge.repository.UserRepository;
import com.credx.keyforge.security.JwtService;
import lombok.RequiredArgsConstructor;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.fasterxml.jackson.databind.ObjectMapper;
import java.util.Locale;

@Service
@RequiredArgsConstructor
public class AuthService {

    private final UserRepository userRepository;
    private final OrganizationRepository organizationRepository;
    private final OrganizationMembershipRepository membershipRepository;
    private final ServiceListingRepository serviceListingRepository;
    private final PasswordEncoder passwordEncoder;
    private final JwtService jwtService;
    private final AuditLogRepository auditLogRepository;
    private final ObjectMapper objectMapper;

    @Transactional
    public AuthResponse register(RegisterRequest request) {
        String normalizedEmail = request.email().trim().toLowerCase();

        if (userRepository.existsByEmail(normalizedEmail)) {
            throw new DuplicateResourceException("An account with this email already exists");
        }

        Role assignedRole = request.role() != null ? request.role() : Role.DEVELOPER;

        User user = User.builder()
                .email(normalizedEmail)
                .fullName(request.fullName().trim())
                .passwordHash(passwordEncoder.encode(request.password()))
                .role(assignedRole)
                .primaryStack(request.primaryStack())
                .githubUrl(request.githubUrl())
                .useCase(request.useCase())
                .organizationName(request.organizationName())
                .websiteUrl(request.websiteUrl())
                .providerType(request.providerType())
                .supportEmail(request.supportEmail())
                .baseApiUrl(request.baseApiUrl())
                .authScheme(request.authScheme())
                .hostingRegion(request.hostingRegion())
                .defaultRateLimit(request.defaultRateLimit())
                .slaTier(request.slaTier())
                .build();

        user = userRepository.save(user);

        // Auto-create default organization for the new user
        String orgName = (assignedRole == Role.PROVIDER && request.organizationName() != null && !request.organizationName().isBlank())
                ? request.organizationName().trim()
                : user.getFullName() + "'s Workspace";

        String slug = slugify(orgName);
        if (organizationRepository.existsBySlug(slug)) {
            slug = slug + "-" + (System.currentTimeMillis() % 10000);
        }

        Organization org = Organization.builder()
                .name(orgName)
                .slug(slug)
                .planTier(PlanTier.FREE)
                .owner(user)
                .build();
        org = organizationRepository.save(org);

        OrganizationMembership membership = OrganizationMembership.builder()
                .user(user)
                .organization(org)
                .role(MembershipRole.OWNER)
                .build();
        membershipRepository.save(membership);

        // Record registration audit log
        auditLogRepository.save(AuditLog.builder()
                .organizationId(org.getId())
                .actorUserId(user.getId())
                .actorEmail(user.getEmail())
                .action("USER_REGISTERED")
                .targetType("USER")
                .targetId(user.getId())
                .details("Registered account with role " + assignedRole + " in workspace: " + orgName)
                .build());

        // If registering as a Provider with a Base API Gateway URL, auto-publish their initial service listing
        if (assignedRole == Role.PROVIDER && request.baseApiUrl() != null && !request.baseApiUrl().isBlank()) {
            ServiceCategory category = ServiceCategory.REST_API;
            if (request.providerType() != null) {
                try {
                    category = ServiceCategory.valueOf(request.providerType().toUpperCase());
                } catch (Exception ignored) {
                }
            }

            int rateLimit = request.defaultRateLimit() != null && request.defaultRateLimit() > 0 ? request.defaultRateLimit() : 60;
            String serviceSlug = slugify(orgName) + "-api-" + java.util.UUID.randomUUID().toString().substring(0, 6);

            ServiceListing initialListing = ServiceListing.builder()
                    .name(orgName + " Production API")
                    .slug(serviceSlug)
                    .category(category)
                    .description(orgName + " live production endpoints. SLA: " + (request.slaTier() != null ? request.slaTier() : "99.9% Uptime") + ". Hosting: " + (request.hostingRegion() != null ? request.hostingRegion() : "Global Cloud") + ". Auth: " + (request.authScheme() != null ? request.authScheme() : "Bearer Token"))
                    .providerName(orgName)
                    .providerUserId(user.getId())
                    .endpointUrl(request.baseApiUrl().trim())
                    .documentation("Production API gateway provisioned by " + orgName + ". Support: " + (request.supportEmail() != null ? request.supportEmail() : user.getEmail()))
                    .rateLimitPerMinute(rateLimit)
                    .pricingTier("Verified Provider")
                    .declaredEndpoints(ServiceListingService.normalizeEndpointsWithMapper(objectMapper, null, category, request.baseApiUrl()))
                    .isActive(true)
                    .build();
            serviceListingRepository.save(initialListing);
        }

        String token = jwtService.generateToken(user.getId(), user.getEmail(), user.getRole().name());
        return new AuthResponse(token, user.getId(), user.getEmail(), user.getFullName(), user.getRole().name());
    }

    private String slugify(String name) {
        String slug = name.trim().toLowerCase(Locale.ROOT)
                .replaceAll("[^a-z0-9]+", "-")
                .replaceAll("(^-|-$)", "");
        return slug.isEmpty() ? "org" : slug;
    }

    public AuthResponse login(LoginRequest request) {
        String normalizedEmail = request.email().trim().toLowerCase();

        User user = userRepository.findByEmail(normalizedEmail)
                .orElseThrow(() -> new InvalidCredentialsException("Invalid email or password"));

        if (!passwordEncoder.matches(request.password(), user.getPasswordHash())) {
            throw new InvalidCredentialsException("Invalid email or password");
        }

        String token = jwtService.generateToken(user.getId(), user.getEmail(), user.getRole().name());
        return new AuthResponse(token, user.getId(), user.getEmail(), user.getFullName(), user.getRole().name());
    }
}
