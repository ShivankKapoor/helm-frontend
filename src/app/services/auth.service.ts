import { Injectable, signal } from '@angular/core';

export interface User {
  id: string;
  email: string;
  name?: string;
}

export interface SignInCredentials {
  email: string;
  password: string;
}

export interface AuthResponse {
  success: boolean;
  user?: User;
  error?: string;
}

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private readonly currentUser = signal<User | null>(null);
  private readonly isAuthenticated = signal<boolean>(false);
  private readonly isLoading = signal<boolean>(false);

  // Public readonly signals
  readonly user = this.currentUser.asReadonly();
  readonly authenticated = this.isAuthenticated.asReadonly();
  readonly loading = this.isLoading.asReadonly();

  constructor() {
    // Check for existing session on initialization
    this.checkExistingSession();
  }

  /**
   * Sign in a user with email and password
   */
  async signIn(credentials: SignInCredentials): Promise<AuthResponse> {
    this.isLoading.set(true);

    try {
      // Simulate API call delay
      await new Promise(resolve => setTimeout(resolve, 1000));

      // Mock authentication logic
      if (this.validateCredentials(credentials)) {
        const user: User = {
          id: '1',
          email: credentials.email,
          name: this.extractNameFromEmail(credentials.email)
        };

        this.setCurrentUser(user);
        this.saveSession(user);

        return { success: true, user };
      } else {
        return { 
          success: false, 
          error: 'Invalid email or password. Please try again.' 
        };
      }
    } catch (error) {
      console.error('Sign-in error:', error);
      return { 
        success: false, 
        error: 'An unexpected error occurred. Please try again.' 
      };
    } finally {
      this.isLoading.set(false);
    }
  }

  /**
   * Sign out the current user
   */
  signOut(): void {
    this.clearCurrentUser();
    this.clearSession();
  }

  /**
   * Check if there's an existing session
   */
  private checkExistingSession(): void {
    try {
      const savedUser = localStorage.getItem('helm_user');
      if (savedUser) {
        const user: User = JSON.parse(savedUser);
        this.setCurrentUser(user);
      }
    } catch (error) {
      console.error('Error checking existing session:', error);
      this.clearSession();
    }
  }

  /**
   * Set the current user and update authentication state
   */
  private setCurrentUser(user: User): void {
    this.currentUser.set(user);
    this.isAuthenticated.set(true);
  }

  /**
   * Clear the current user and update authentication state
   */
  private clearCurrentUser(): void {
    this.currentUser.set(null);
    this.isAuthenticated.set(false);
  }

  /**
   * Save user session to localStorage
   */
  private saveSession(user: User): void {
    try {
      localStorage.setItem('helm_user', JSON.stringify(user));
    } catch (error) {
      console.error('Error saving session:', error);
    }
  }

  /**
   * Clear saved session from localStorage
   */
  private clearSession(): void {
    try {
      localStorage.removeItem('helm_user');
    } catch (error) {
      console.error('Error clearing session:', error);
    }
  }

  /**
   * Mock credential validation
   * In a real app, this would be handled by your backend API
   */
  private validateCredentials(credentials: SignInCredentials): boolean {
    // For demo purposes, accept any email with password length >= 6
    // In production, this validation would be done by your authentication server
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(credentials.email) && credentials.password.length >= 6;
  }

  /**
   * Extract a display name from email address
   */
  private extractNameFromEmail(email: string): string {
    const localPart = email.split('@')[0];
    return localPart
      .split(/[._-]/)
      .map(part => part.charAt(0).toUpperCase() + part.slice(1))
      .join(' ');
  }

  /**
   * Reset password functionality (placeholder)
   */
  async resetPassword(email: string): Promise<{ success: boolean; message: string }> {
    // Mock password reset
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return { 
        success: false, 
        message: 'Please enter a valid email address.' 
      };
    }

    return { 
      success: true, 
      message: 'Password reset instructions have been sent to your email.' 
    };
  }
}