export type UserRole = 'DEVELOPER' | 'PROVIDER' | 'ADMIN';

export interface AuthenticatedUser {
  userId: string;
  email: string;
  fullName: string;
  role: UserRole;
  organizationName?: string;
  primaryStack?: string;
  websiteUrl?: string;
}

export interface AuthResponse {
  token: string;
  userId: string;
  email: string;
  fullName: string;
  role: UserRole;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface RegisterRequest {
  email: string;
  password: string;
  fullName: string;
  role: UserRole;
  // Developer-specific profile fields
  primaryStack?: string;
  githubUrl?: string;
  useCase?: string;
  // Provider-specific profile fields
  organizationName?: string;
  websiteUrl?: string;
  providerType?: string;
  supportEmail?: string;
  baseApiUrl?: string;
  authScheme?: string;
  hostingRegion?: string;
  defaultRateLimit?: number;
  slaTier?: string;
}
