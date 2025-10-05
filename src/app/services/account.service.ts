// API Configuration - Production hosted API
const API_BASE_URL = 'https://api.helmseek.com';

import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable, BehaviorSubject, tap, catchError, of } from 'rxjs';

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

interface UsernameResponse extends ApiResponse {
  username?: string;
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
  
  // Cache for user info
  private cachedUserInfo: { username?: string; userId?: string } | null = null;
  
  // Cache for API responses with TTL
  private userDataCache: { data: any; timestamp: number } | null = null;
  private usernameCache: { data: any; timestamp: number } | null = null;
  private readonly CACHE_TTL = 30000; // 30 seconds cache

  constructor(private http: HttpClient) {
    // Defer initial session check to avoid timing issues
    setTimeout(() => this.checkInitialSession(), 0);
  }

  /**
   * Check session after service initialization
   */
  private checkInitialSession(): void {
    const hasSession = this.hasValidSession();
    console.log('Initial session check:', hasSession);
    this.isLoggedInSubject.next(hasSession);
  }

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
    console.log('Storing session token:', !!token, 'length:', token?.length);
    localStorage.setItem(this.sessionTokenKey, token);
    
    // Set cookie with 30 days expiration and proper security settings
    const expirationDate = new Date();
    expirationDate.setTime(expirationDate.getTime() + (30 * 24 * 60 * 60 * 1000));
    
    // Use Lax for better compatibility across domains while maintaining security
    document.cookie = `${this.sessionTokenKey}=${token}; expires=${expirationDate.toUTCString()}; path=/; SameSite=Lax; Secure=${location.protocol === 'https:'}`;
    
    // Update the BehaviorSubject immediately
    this.isLoggedInSubject.next(true);
  }

  /**
   * Remove session token from storage
   */
  private clearSessionToken(): void {
    console.log('Clearing session token');
    localStorage.removeItem(this.sessionTokenKey);
    
    // Clear cookie with same settings as when it was set
    document.cookie = `${this.sessionTokenKey}=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/; SameSite=Lax`;
    
    // Update the BehaviorSubject immediately
    this.isLoggedInSubject.next(false);
  }

  /**
   * Check if user has a valid session token
   */
  private hasValidSession(): boolean {
    const token = this.getStoredSessionToken();
    const isValid = !!token && token.length > 10; // Basic validation
    return isValid;
  }

  /**
   * Create HTTP headers with session token
   */
  private getAuthHeaders(): HttpHeaders {
    const token = this.getStoredSessionToken();
    console.log('Creating auth headers - token found:', !!token, 'token length:', token?.length);
    const headers = new HttpHeaders({
      'Content-Type': 'application/json',
      ...(token && { 'sessionToken': token })
    });
    console.log('Auth headers created:', headers.keys());
    return headers;
  }

  /**
   * Register a new user account
   */
  register(registerData: RegisterRequest): Observable<RegisterResponse> {
    return this.http.post<RegisterResponse>(`${API_BASE_URL}/auth/register`, registerData)
      .pipe(
        tap(response => {
          console.log('Register response:', response);
          if (response.success && response.sessionId) {
            this.setSessionToken(response.sessionId);
            // setSessionToken already updates isLoggedInSubject
          } else {
            console.error('Registration failed:', response.message || response.error);
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
          console.log('Login response:', response);
          if (response.success && response.sessionId) {
            this.setSessionToken(response.sessionId);
            // setSessionToken already updates isLoggedInSubject
          } else {
            console.error('Login failed:', response.message || response.error);
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
          this.clearUserInfoCache();
          // clearSessionToken already updates isLoggedInSubject
        })
      );
  }

  /**
   * Get current user's data
   */
  getUserData(): Observable<UserDataResponse> {
    // Check cache first
    if (this.userDataCache && (Date.now() - this.userDataCache.timestamp) < this.CACHE_TTL) {
      console.log('Returning cached user data');
      return of(this.userDataCache.data);
    }
    
    const headers = this.getAuthHeaders();
    console.log('Making GET request to /api/get with headers:', headers.keys());
    console.log('SessionToken header value:', headers.get('sessionToken'));
    return this.http.get<UserDataResponse>(`${API_BASE_URL}/api/get`, { headers })
      .pipe(
        tap(response => {
          console.log('GET /api/get response:', response);
          // Cache the response
          this.userDataCache = {
            data: response,
            timestamp: Date.now()
          };
        }),
        catchError((error: any) => {
          console.error('GET /api/get error:', error);
          console.error('Error status:', error.status);
          console.error('Error message:', error.message);
          throw error;
        })
      );
  }

  /**
   * Get current user's username from the correct endpoint
   */
  getUsername(): Observable<UsernameResponse> {
    // Check cache first
    if (this.usernameCache && (Date.now() - this.usernameCache.timestamp) < this.CACHE_TTL) {
      console.log('Returning cached username data');
      return of(this.usernameCache.data);
    }
    
    const headers = this.getAuthHeaders();
    console.log('Making GET request to /api/username with headers:', headers.keys());
    console.log('SessionToken header value:', headers.get('sessionToken'));
    return this.http.get<UsernameResponse>(`${API_BASE_URL}/api/username`, { headers })
      .pipe(
        tap(response => {
          console.log('GET /api/username response:', response);
          // Cache the response
          this.usernameCache = {
            data: response,
            timestamp: Date.now()
          };
        }),
        catchError((error: any) => {
          console.error('GET /api/username error:', error);
          console.error('Error status:', error.status);
          console.error('Error message:', error.message);
          throw error;
        })
      );
  }

  /**
   * Update user's data (completely replaces existing data)
   * Data should include: version, lastUpdated, isGuest, user object
   */
  updateUserData(data: any): Observable<ApiResponse> {
    const headers = this.getAuthHeaders();
    
    // Ensure proper data structure with lastUpdated timestamp
    const updateData = {
      ...data,
      lastUpdated: new Date().toISOString(),
      version: data.version || "1.0.0"
    };
    
    console.log('Making POST request to /api/update with headers:', headers);
    console.log('Update request payload (direct data):', updateData);
    
    // Send data directly, not wrapped in { data: ... }
    return this.http.post<ApiResponse>(`${API_BASE_URL}/api/update`, updateData, { headers })
      .pipe(
        tap(response => {
          console.log('POST /api/update response:', response);
        })
      );
  }

  /**
   * Get current user's info (username, userId)
   */
  async getCurrentUserInfo(): Promise<{ username?: string; userId?: string } | null> {
    // Return cached info if available
    if (this.cachedUserInfo) {
      return this.cachedUserInfo;
    }

    // If not authenticated, return null
    if (!this.hasValidSession()) {
      return null;
    }

    try {
      // Get username from the correct endpoint
      const usernameResponse = await this.getUsername().toPromise();
      let username = null;
      let userId = null;

      if (usernameResponse?.success && usernameResponse.username) {
        username = usernameResponse.username;
      }

      // Try to get userId from user data endpoint if needed
      try {
        const userDataResponse = await this.getUserData().toPromise();
        if (userDataResponse?.success) {
          userId = userDataResponse.userId;
        }
      } catch (userDataError) {
        console.warn('Could not fetch user data for userId:', userDataError);
      }

      if (username) {
        this.cachedUserInfo = {
          username: username,
          userId: userId || undefined
        };
        return this.cachedUserInfo;
      }
    } catch (error) {
      console.error('Error fetching user info:', error);
    }

    return null;
  }

  /**
   * Get current user's username
   */
  async getCurrentUsername(): Promise<string | null> {
    const userInfo = await this.getCurrentUserInfo();
    return userInfo?.username || null;
  }

  /**
   * Get current user's ID
   */
  async getCurrentUserId(): Promise<string | null> {
    const userInfo = await this.getCurrentUserInfo();
    return userInfo?.userId || null;
  }

  /**
   * Clear cached user info
   */
  private clearUserInfoCache(): void {
    this.cachedUserInfo = null;
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
    this.cachedUserInfo = null;
    // Clear API caches on logout
    this.userDataCache = null;
    this.usernameCache = null;
    console.log('User logged out and caches cleared');
  }
}