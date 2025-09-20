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
              <label for="username">Username</label>
              <input
                type="text"
                id="username"
                name="username"
                [(ngModel)]="username"
                required
                minlength="3"
                maxlength="50"
                #usernameInput="ngModel"
                placeholder="Enter your username"
                autocomplete="username"
              />
              <div *ngIf="usernameInput.invalid && usernameInput.touched" class="error-message">
                <span *ngIf="usernameInput.errors?.['required']">Username is required</span>
                <span *ngIf="usernameInput.errors?.['minlength']">Username must be at least 3 characters</span>
                <span *ngIf="usernameInput.errors?.['maxlength']">Username must be no more than 50 characters</span>
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
  username = '';
  password = '';
  
  protected readonly showPassword = signal(false);
  protected readonly isLoading = signal(false);
  protected readonly errorMessage = signal('');

  // Output events
  close = output<void>();
  signIn = output<{ username: string; password: string }>();
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
    if (this.username && this.password) {
      this.isLoading.set(true);
      this.errorMessage.set('');
      
      // Emit the sign-in event with credentials
      this.signIn.emit({ username: this.username, password: this.password });
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