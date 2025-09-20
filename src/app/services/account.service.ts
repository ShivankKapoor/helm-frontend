// API Configuration - Update with your deployed URL
const API_BASE_URL = 'http://localhost:8080';

import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable, BehaviorSubject, tap } from 'rxjs';

// API Response Interfaces
interface ApiResponse {
  success: boolean;
  message?: string;
  error?: string;
  details?: string;
}

interface RegisterRequest {
  username: string;
  password: string;
  data?: any;
}

interface RegisterResponse extends ApiResponse {
  userId?: string;
  username?: string;
  sessionId?: string;
}

interface LoginRequest {
  username: string;
  password: string;
}

interface LoginResponse extends ApiResponse {
  sessionId?: string;
  userId?: string;
  username?: string;
}

interface UserDataResponse extends ApiResponse {
  userId?: string;
  username?: string;
  data?: any;
}

interface UpdateDataRequest {
  data: any;
}

interface HealthResponse {
  status: string;
  service: string;
  database: string;
  timestamp: string;
}

@Injectable({
  providedIn: 'root'
})
export class AccountService {
  private sessionTokenKey = 'helm-session-token';
  private isLoggedInSubject = new BehaviorSubject<boolean>(this.hasValidSession());
  public isLoggedIn$ = this.isLoggedInSubject.asObservable();

  constructor(private http: HttpClient) { }

  /**
   * Get stored session token from cookies/localStorage
   */
  getSessionToken(): string | null {
    // Try localStorage first, then cookies as fallback
    let token = localStorage.getItem(this.sessionTokenKey);
    if (!token) {
      // Parse cookies if localStorage is empty
      const cookies = document.cookie.split(';');
      for (let cookie of cookies) {
        const [name, value] = cookie.trim().split('=');
        if (name === this.sessionTokenKey) {
          token = value;
          break;
        }
      }
    }
    return token;
  }

  /**
   * Get stored session token from cookies/localStorage (private version)
   */
  private getStoredSessionToken(): string | null {
    return this.getSessionToken();
  }

  /**
   * Store session token in both localStorage and cookies
   */
  private setSessionToken(token: string): void {
    localStorage.setItem(this.sessionTokenKey, token);
    // Set cookie with 30 days expiration
    const expirationDate = new Date();
    expirationDate.setTime(expirationDate.getTime() + (30 * 24 * 60 * 60 * 1000));
    document.cookie = `${this.sessionTokenKey}=${token}; expires=${expirationDate.toUTCString()}; path=/; SameSite=Strict`;
  }

  /**
   * Remove session token from storage
   */
  private clearSessionToken(): void {
    localStorage.removeItem(this.sessionTokenKey);
    document.cookie = `${this.sessionTokenKey}=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;`;
  }

  /**
   * Check if user has a valid session token
   */
  private hasValidSession(): boolean {
    return !!this.getStoredSessionToken();
  }

  /**
   * Create HTTP headers with session token
   */
  private getAuthHeaders(): HttpHeaders {
    const token = this.getStoredSessionToken();
    return new HttpHeaders({
      'Content-Type': 'application/json',
      ...(token && { 'sessionToken': token })
    });
  }

  /**
   * Register a new user account
   */
  register(registerData: RegisterRequest): Observable<RegisterResponse> {
    return this.http.post<RegisterResponse>(`${API_BASE_URL}/auth/register`, registerData)
      .pipe(
        tap(response => {
          if (response.success && response.sessionId) {
            this.setSessionToken(response.sessionId);
            this.isLoggedInSubject.next(true);
          }
        })
      );
  }

  /**
   * Login existing user
   */
  login(credentials: LoginRequest): Observable<LoginResponse> {
    return this.http.post<LoginResponse>(`${API_BASE_URL}/auth/login`, credentials)
      .pipe(
        tap(response => {
          if (response.success && response.sessionId) {
            this.setSessionToken(response.sessionId);
            this.isLoggedInSubject.next(true);
          }
        })
      );
  }

  /**
   * Logout current user
   */
  logout(): Observable<ApiResponse> {
    const headers = this.getAuthHeaders();
    return this.http.post<ApiResponse>(`${API_BASE_URL}/auth/logout`, {}, { headers })
      .pipe(
        tap(() => {
          this.clearSessionToken();
          this.isLoggedInSubject.next(false);
        })
      );
  }

  /**
   * Get current user's data
   */
  getUserData(): Observable<UserDataResponse> {
    const headers = this.getAuthHeaders();
    console.log('Making GET request to /api/get with headers:', headers);
    return this.http.get<UserDataResponse>(`${API_BASE_URL}/api/get`, { headers })
      .pipe(
        tap(response => {
          console.log('GET /api/get response:', response);
        })
      );
  }

  /**
   * Update user's data (completely replaces existing data)
   */
  updateUserData(data: any): Observable<ApiResponse> {
    const headers = this.getAuthHeaders();
    const updateRequest: UpdateDataRequest = { data };
    console.log('Making POST request to /api/update with headers:', headers);
    console.log('Update request payload:', updateRequest);
    return this.http.post<ApiResponse>(`${API_BASE_URL}/api/update`, updateRequest, { headers })
      .pipe(
        tap(response => {
          console.log('POST /api/update response:', response);
        })
      );
  }

  /**
   * Check API health status
   */
  checkHealth(): Observable<HealthResponse> {
    return this.http.get<HealthResponse>(`${API_BASE_URL}/health`);
  }

  /**
   * Check if user is currently logged in
   */
  isAuthenticated(): boolean {
    return this.hasValidSession();
  }

  /**
   * Force logout (clear session without API call)
   */
  forceLogout(): void {
    this.clearSessionToken();
    this.isLoggedInSubject.next(false);
  }
}