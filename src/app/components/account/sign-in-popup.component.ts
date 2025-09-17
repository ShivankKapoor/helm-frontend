import { Component, signal, output } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-sign-in-popup',
  standalone: true,
  imports: [FormsModule, CommonModule],
  template: `
    <div class="signin-backdrop" (click)="onBackdropClick($event)">
      <div class="signin-modal" (click)="$event.stopPropagation()">
        <div class="signin-header">
          <h3>Sign In</h3>
          <button class="close-btn" (click)="close.emit()" aria-label="Close">
            <i class="bi bi-x"></i>
          </button>
        </div>
        
        <div class="signin-content">
          <form (ngSubmit)="onSubmit()" #signInForm="ngForm">
            <div class="form-group">
              <label for="email">Email</label>
              <input
                type="email"
                id="email"
                name="email"
                [(ngModel)]="email"
                required
                #emailInput="ngModel"
                placeholder="Enter your email"
                autocomplete="email"
              />
              <div *ngIf="emailInput.invalid && emailInput.touched" class="error-message">
                <span *ngIf="emailInput.errors?.['required']">Email is required</span>
                <span *ngIf="emailInput.errors?.['email']">Please enter a valid email</span>
              </div>
            </div>

            <div class="form-group">
              <label for="password">Password</label>
              <div class="password-input-wrapper">
                <input
                  [type]="showPassword() ? 'text' : 'password'"
                  id="password"
                  name="password"
                  [(ngModel)]="password"
                  required
                  minlength="6"
                  #passwordInput="ngModel"
                  placeholder="Enter your password"
                  autocomplete="current-password"
                />
                <button
                  type="button"
                  class="password-toggle"
                  (click)="togglePasswordVisibility()"
                  aria-label="Toggle password visibility"
                >
                  <i [class]="showPassword() ? 'bi bi-eye-slash' : 'bi bi-eye'"></i>
                </button>
              </div>
              <div *ngIf="passwordInput.invalid && passwordInput.touched" class="error-message">
                <span *ngIf="passwordInput.errors?.['required']">Password is required</span>
                <span *ngIf="passwordInput.errors?.['minlength']">Password must be at least 6 characters</span>
              </div>
            </div>

            <div class="form-actions">
              <button 
                type="submit" 
                class="signin-btn"
                [disabled]="signInForm.invalid || isLoading()"
              >
                <span *ngIf="!isLoading()">Sign In</span>
                <span *ngIf="isLoading()" class="loading-spinner">
                  <i class="bi bi-arrow-clockwise"></i> Signing in...
                </span>
              </button>
            </div>

            <div *ngIf="errorMessage()" class="general-error">
              {{ errorMessage() }}
            </div>
          </form>

          <div class="signin-footer">
            <p>Account Creation is currently disabled.</p>
          </div>
        </div>
      </div>
    </div>
  `,
  styleUrl: './sign-in-popup.component.scss'
})
export class SignInPopupComponent {
  email = '';
  password = '';
  
  protected readonly showPassword = signal(false);
  protected readonly isLoading = signal(false);
  protected readonly errorMessage = signal('');

  // Output events
  close = output<void>();
  signIn = output<{ email: string; password: string }>();
  switchToSignUpEvent = output<void>();
  forgotPasswordEvent = output<void>();

  onBackdropClick(event: Event) {
    if (event.target === event.currentTarget) {
      this.close.emit();
    }
  }

  togglePasswordVisibility() {
    this.showPassword.set(!this.showPassword());
  }

  onSubmit() {
    if (this.email && this.password) {
      this.isLoading.set(true);
      this.errorMessage.set('');
      
      // Emit the sign-in event with credentials
      this.signIn.emit({ email: this.email, password: this.password });
    }
  }

  switchToSignUp(event: Event) {
    event.preventDefault();
    this.switchToSignUpEvent.emit();
  }

  forgotPassword(event: Event) {
    event.preventDefault();
    this.forgotPasswordEvent.emit();
  }

  // Method to be called by parent to handle sign-in response
  handleSignInResponse(success: boolean, error?: string) {
    this.isLoading.set(false);
    if (!success && error) {
      this.errorMessage.set(error);
    } else if (success) {
      this.close.emit();
    }
  }
}