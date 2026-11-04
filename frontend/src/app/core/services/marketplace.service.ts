import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import {
  CreateServiceListingRequest,
  ServiceCategory,
  ServiceInvocationResponse,
  ServiceListing,
  SubscribeServiceRequest,
} from '../models/marketplace.model';
import { ApiKey, ApiKeyCreatedResponse } from '../models/api-key.model';

@Injectable({
  providedIn: 'root',
})
export class MarketplaceService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = `${environment.apiBaseUrl}/marketplace/services`;

  listServices(category?: ServiceCategory, search?: string): Observable<ServiceListing[]> {
    let params = new HttpParams();
    if (category) {
      params = params.set('category', category);
    }
    if (search && search.trim()) {
      params = params.set('search', search.trim());
    }
    return this.http.get<ServiceListing[]>(this.baseUrl, { params });
  }

  getMyServices(): Observable<ServiceListing[]> {
    return this.http.get<ServiceListing[]>(`${this.baseUrl}/mine`);
  }

  getServiceById(id: string): Observable<ServiceListing> {
    return this.http.get<ServiceListing>(`${this.baseUrl}/${id}`);
  }

  createService(payload: CreateServiceListingRequest): Observable<ServiceListing> {
    return this.http.post<ServiceListing>(this.baseUrl, payload);
  }

  deleteService(id: string): Observable<void> {
    return this.http.delete<void>(`${this.baseUrl}/${id}`);
  }

  subscribe(serviceId: string, request?: SubscribeServiceRequest): Observable<ApiKeyCreatedResponse> {
    return this.http.post<ApiKeyCreatedResponse>(`${this.baseUrl}/${serviceId}/subscribe`, request || {});
  }

  invokeService(
    serviceId: string,
    apiKey: string,
    payload: any,
    endpoint?: string,
    method = 'POST'
  ): Observable<ServiceInvocationResponse> {
    const payloadStr = typeof payload === 'string' ? payload : JSON.stringify(payload);
    return this.http.post<ServiceInvocationResponse>(
      `${this.baseUrl}/${serviceId}/invoke`,
      { payload: payloadStr, endpoint, method },
      { headers: { 'X-API-Key': apiKey } }
    );
  }

  getMySubscribedKeys(): Observable<ApiKey[]> {
    return this.http.get<ApiKey[]>(`${environment.apiBaseUrl}/marketplace/subscriptions/my-keys`);
  }

  getProviderRateLimitRequests(): Observable<ApiKey[]> {
    return this.http.get<ApiKey[]>(`${this.baseUrl}/provider/rate-limit-requests`);
  }

  approveRateLimitRequest(keyId: string): Observable<ApiKey> {
    return this.http.post<ApiKey>(`${this.baseUrl}/provider/rate-limit-requests/${keyId}/approve`, {});
  }

  rejectRateLimitRequest(keyId: string): Observable<ApiKey> {
    return this.http.post<ApiKey>(`${this.baseUrl}/provider/rate-limit-requests/${keyId}/reject`, {});
  }
}
