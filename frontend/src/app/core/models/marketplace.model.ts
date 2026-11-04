export type ServiceCategory =
  | 'AI_LLM'
  | 'COMPUTER_VISION'
  | 'NLP'
  | 'SPEECH'
  | 'REST_API'
  | 'UTILITY';

export interface DeclaredEndpointPermission {
  endpoint: string;
  methods: string[];
  name?: string;
}

export interface ServiceListing {
  id: string;
  name: string;
  slug: string;
  category: ServiceCategory;
  description: string;
  providerName: string;
  providerUserId: string;
  endpointUrl: string;
  documentation?: string;
  samplePayload?: string;
  sampleResponse?: string;
  rateLimitPerMinute: number;
  pricingTier: string;
  isActive: boolean;
  createdAt: string;
  maxExpiryDays?: number;
  allowNeverExpires?: boolean;
  requireIpAllowlistForProduction?: boolean;
  defaultRateLimit?: number;
  maxRateLimit?: number;
  allowedScopes?: string;
  allowedModels?: string;
  declaredEndpoints?: DeclaredEndpointPermission[];
}

export interface CreateServiceListingRequest {
  name: string;
  category: ServiceCategory;
  description: string;
  endpointUrl: string;
  documentation?: string;
  samplePayload?: string;
  sampleResponse?: string;
  rateLimitPerMinute?: number;
  pricingTier?: string;
  maxExpiryDays?: number;
  allowNeverExpires?: boolean;
  requireIpAllowlistForProduction?: boolean;
  defaultRateLimit?: number;
  maxRateLimit?: number;
  allowedScopes?: string;
  allowedModels?: string;
  declaredEndpoints?: DeclaredEndpointPermission[];
}

export interface ServiceInvocationResponse {
  statusCode: number;
  latencyMs: number;
  serviceName: string;
  category: string;
  timestamp: string;
  responseData: any;
  metrics: {
    tokensUsed?: number;
    rateLimitRemaining?: number;
    rateLimitLimit?: number;
    serviceTier?: string;
    [key: string]: any;
  };
}

export interface DeclaredBaselineProfile {
  ownerEmail?: string;
  clientType?: 'server' | 'browser' | 'mobile' | 'ci_batch';
  expectedRequestsPerDay?: number;
  expectedPeakPerMinute?: number;
  typicalRegions?: string[];
  requestedRateLimit?: number;
  requestedRateLimitReason?: string;
  rateLimitApprovalStatus?: 'APPROVED' | 'PENDING_APPROVAL' | 'REJECTED';
  rotationGracePeriodSeconds?: number;
  restrictions?: string;
  allowedEndpoints?: DeclaredEndpointPermission[];
  spendCapUsd?: number;
  alertChannel?: 'EMAIL' | 'WEBHOOK';
  alertWebhookUrl?: string;
  riskAction?: 'ALERT_ONLY' | 'THROTTLE' | 'AUTO_SUSPEND';
  tags?: string;
}

export interface SubscribeServiceRequest {
  applicationName: string;
  environment: 'PRODUCTION' | 'STAGING' | 'DEVELOPMENT';
  ownerEmail?: string;
  clientType?: 'server' | 'browser' | 'mobile' | 'ci_batch';
  expectedRequestsPerDay?: number;
  expectedPeakPerMinute?: number;
  typicalRegions?: string[];
  requestedRateLimit?: number;
  requestedRateLimitReason?: string;
  expiresAt?: string | null;
  rotationGracePeriodSeconds?: number;
  restrictions?: string;
  allowedEndpoints?: DeclaredEndpointPermission[];
  scopes?: string[];
  spendCapUsd?: number;
  alertChannel?: 'EMAIL' | 'WEBHOOK';
  alertWebhookUrl?: string;
  riskAction?: 'ALERT_ONLY' | 'THROTTLE' | 'AUTO_SUSPEND';
  tags?: string;
  description?: string;
  rateLimitPerMinute?: number;
  allowedIps?: string;
}
