import { Component, signal, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { SearchComponent } from './components/search/search.component';
import { SettingsComponent } from './components/settings/settings.component';
import { SignInPopupComponent } from './components/account/sign-in-popup.component';
import { QuickLinkComponent } from './components/quick-link/quick-link.component';
import { AccountService } from './services/account.service';
import { ConfigService } from './services/config.service';

@Component({
  selector: 'app-root',
  imports: [CommonModule, SearchComponent, SettingsComponent, SignInPopupComponent, QuickLinkComponent],
  templateUrl: './app.html',
  styleUrl: './app.scss'
})
export class App {
  protected readonly title = signal('helm-frontend');
  protected readonly showSignInPopup = signal(false);

  @ViewChild(SignInPopupComponent) signInPopup?: SignInPopupComponent;

  constructor(
    protected accountService: AccountService,
    private configService: ConfigService
  ) {
    // Set AccountService reference in ConfigService to avoid circular dependency
    this.configService.setAccountService(this.accountService);
  }

  openSignInPopup() {
    this.showSignInPopup.set(true);
  }

  closeSignInPopup() {
    this.showSignInPopup.set(false);
  }

  async handleSignIn(credentials: { username: string; password: string }) {
    try {
      console.log('Starting login process...');
      const response = await this.accountService.login(credentials).toPromise();
      console.log('Login response received:', response);
      
      if (response?.success) {
        const userId = response.userId || response.sessionId || 'unknown';
        console.log('Login successful, userId:', userId);
        
        // Login successful - mark as authenticated locally
        this.configService.setUserAuthenticated(userId);
        console.log('Local config updated to mark user as authenticated');
        
        // Automatically sync config from server after login
        try {
          const syncSuccess = await this.configService.syncFromServer();
          if (syncSuccess) {
            console.log('Successfully synced config from server after login');
          } else {
            console.warn('Failed to sync config from server after login');
          }
        } catch (syncError) {
          console.warn('Error syncing config from server after login:', syncError);
        }
        
        this.signInPopup?.handleSignInResponse(true);
      } else {
        console.error('Login failed:', response?.message);
        this.signInPopup?.handleSignInResponse(false, response?.message || 'Login failed');
      }
    } catch (error: any) {
      console.error('Login error:', error);
      this.signInPopup?.handleSignInResponse(false, 'Network error. Please try again.');
    }
  }

  handleSwitchToSignUp() {
    // For now, just close the popup. In a real app, you'd open a sign-up popup
    console.log('Switch to sign up requested');
    this.closeSignInPopup();
  }

  handleForgotPassword() {
    // For now, just log. In a real app, you'd open a forgot password dialog
    console.log('Forgot password requested');
  }

  async signOut() {
    try {
      // Logout from server (no config syncing)
      await this.accountService.logout().toPromise();
      
      // Handle config service logout
      await this.configService.onUserSignOut();
    } catch (error) {
      console.error('Logout error:', error);
      // Force logout even if API call fails
      this.accountService.forceLogout();
      await this.configService.onUserSignOut();
    }
  }
}
