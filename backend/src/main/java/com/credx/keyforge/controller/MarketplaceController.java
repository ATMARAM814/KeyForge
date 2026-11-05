package com.credx.keyforge.controller;

import com.credx.keyforge.dto.apikey.ApiKeyCreatedResponse;
import com.credx.keyforge.dto.apikey.ApiKeyResponse;
import com.credx.keyforge.dto.marketplace.CreateServiceListingRequest;
import com.credx.keyforge.dto.marketplace.ServiceInvocationRequest;
import com.credx.keyforge.dto.marketplace.ServiceInvocationResponse;
import com.credx.keyforge.dto.marketplace.ServiceListingResponse;
import com.credx.keyforge.dto.marketplace.SubscribeServiceRequest;
import com.credx.keyforge.entity.ServiceCategory;
import com.credx.keyforge.service.ServiceListingService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/marketplace")
@RequiredArgsConstructor
public class MarketplaceController {

    private final ServiceListingService serviceListingService;

    @GetMapping("/services")
    public ResponseEntity<List<ServiceListingResponse>> listServices(
            @RequestParam(required = false) ServiceCategory category,
            @RequestParam(required = false) String search) {
        return ResponseEntity.ok(serviceListingService.listServices(category, search));
    }

    @GetMapping("/services/mine")
    public ResponseEntity<List<ServiceListingResponse>> getMyServices() {
        return ResponseEntity.ok(serviceListingService.getMyServices());
    }

    @GetMapping("/services/{id}")
    public ResponseEntity<ServiceListingResponse> getServiceById(@PathVariable String id) {
        return ResponseEntity.ok(serviceListingService.getServiceById(id));
    }

    @PostMapping("/services")
    public ResponseEntity<ServiceListingResponse> createService(
            @Valid @RequestBody CreateServiceListingRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED).body(serviceListingService.createService(request));
    }

    @DeleteMapping("/services/{id}")
    public ResponseEntity<Void> deleteService(@PathVariable String id) {
        serviceListingService.deleteService(id);
        return ResponseEntity.noContent().build();
    }

    @DeleteMapping("/services/cleanup/all")
    public ResponseEntity<Void> clearAllServices() {
        serviceListingService.clearAllServices();
        return ResponseEntity.noContent().build();
    }

    @PostMapping("/services/{id}/subscribe")
    public ResponseEntity<ApiKeyCreatedResponse> subscribe(
            @PathVariable String id,
            @Valid @RequestBody(required = false) SubscribeServiceRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED).body(serviceListingService.subscribeAndGenerateKey(id, request));
    }

    @GetMapping("/subscriptions/my-keys")
    public ResponseEntity<List<ApiKeyResponse>> getMySubscribedKeys() {
        return ResponseEntity.ok(serviceListingService.getMySubscribedKeys());
    }

    @GetMapping({"/provider/rate-limit-requests", "/services/provider/rate-limit-requests"})
    public ResponseEntity<List<ApiKeyResponse>> getProviderRateLimitRequests() {
        return ResponseEntity.ok(serviceListingService.getProviderRateLimitRequests());
    }

    @PostMapping({"/provider/rate-limit-requests/{keyId}/approve", "/services/provider/rate-limit-requests/{keyId}/approve"})
    public ResponseEntity<ApiKeyResponse> approveRateLimitRequest(@PathVariable String keyId) {
        return ResponseEntity.ok(serviceListingService.approveRateLimitRequest(keyId));
    }

    @PostMapping({"/provider/rate-limit-requests/{keyId}/reject", "/services/provider/rate-limit-requests/{keyId}/reject"})
    public ResponseEntity<ApiKeyResponse> rejectRateLimitRequest(@PathVariable String keyId) {
        return ResponseEntity.ok(serviceListingService.rejectRateLimitRequest(keyId));
    }

    @PostMapping("/services/{id}/invoke")
    public ResponseEntity<ServiceInvocationResponse> invoke(
            @PathVariable String id,
            @RequestHeader("X-API-Key") String apiKeyHeader,
            @RequestBody(required = false) ServiceInvocationRequest request,
            jakarta.servlet.http.HttpServletRequest servletRequest,
            @RequestHeader(value = "X-Region", required = false) String regionHeader,
            @RequestHeader(value = "X-App-ID", required = false) String appIdHeader,
            @RequestHeader(value = "X-Bundle-ID", required = false) String bundleIdHeader) {
        ServiceInvocationRequest req = request != null ? request : new ServiceInvocationRequest("{}");
        String clientIp = servletRequest.getHeader("X-Forwarded-For") != null
                ? servletRequest.getHeader("X-Forwarded-For").split(",")[0].trim()
                : servletRequest.getRemoteAddr();
        String origin = servletRequest.getHeader("Origin") != null
                ? servletRequest.getHeader("Origin")
                : servletRequest.getHeader("Referer");
        String appId = appIdHeader != null && !appIdHeader.isBlank() ? appIdHeader : bundleIdHeader;
        return ResponseEntity.ok(serviceListingService.invokeService(id, apiKeyHeader, req, clientIp, origin, regionHeader, appId));
    }
}
