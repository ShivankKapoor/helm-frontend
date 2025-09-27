import { Component, signal, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { SearchComponent } from './components/search/search.component';
import { SettingsComponent } from './components/settings/settings.component';
import { SignInPopupComponent } from './components/account/sign-in-popup.component';
import { UserInfoPopupComponent } from './components/account/user-info-popup.component';
import { QuickLinkComponent } from './components/quick-link/quick-link.component';
import { AccountService } from './services/account.service';
import { ConfigService } from './services/config.service';

@Component({
  selector: 'app-root',
  imports: [CommonModule, SearchComponent, SettingsComponent, SignInPopupComponent, UserInfoPopupComponent, QuickLinkComponent],
  templateUrl: './app.html',
  styleUrl: './app.scss'
})
export class App {
  protected readonly title = signal('helm-frontend');
  protected readonly showSignInPopup = signal(false);
  protected readonly showUserInfoPopup = signal(false);
  protected readonly currentUsername = signal<string | null>(null);
  protected readonly currentUserId = signal<string | null>(null);

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

  openUserInfoPopup() {
    this.showUserInfoPopup.set(true);
    this.loadUserInfo(); // Load user info when popup opens
  }

  closeUserInfoPopup() {
    this.showUserInfoPopup.set(false);
  }

  async loadUserInfo() {
    if (this.accountService.isAuthenticated()) {
      try {
        const userInfo = await this.accountService.getCurrentUserInfo();
        if (userInfo) {
          this.currentUsername.set(userInfo.username || null);
          this.currentUserId.set(userInfo.userId || null);
        }
      } catch (error) {
        console.error('Error loading user info:', error);
      }
    }
  }

  handleAccountButtonClick() {
    if (this.accountService.isAuthenticated()) {
      this.openUserInfoPopup();
    } else {
      this.openSignInPopup();
    }
  }

  async handleSignIn(credentials: { username: string; password: string }) {
    try {
      console.log('Starting login process...');
      const response = await this.accountService.login(credentials).toPromise();
      console.log('Login response received:', response);
      
      if (response?.success) {
        const userId = response.userId || response.sessionId || 'unknown';
        console.log('Login successful, userId:', userId);
        
        // Load user info after successful login
        await this.loadUserInfo();
        
        // Sync config from server FIRST to completely override local config
        try {
          console.log('Attempting to sync config from server after login...');
          const syncSuccess = await this.configService.syncFromServer();
          if (syncSuccess) {
            console.log('Successfully synced config from server after login - local config completely overridden');
          } else {
            console.warn('Failed to sync config from server after login, falling back to local config update');
            // Only if server sync fails, update local config
            this.configService.setUserAuthenticated(userId);
          }
        } catch (syncError) {
          console.warn('Error syncing config from server after login:', syncError);
          // Only if server sync fails, update local config
          this.configService.setUserAuthenticated(userId);
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
      
      // Clear user info
      this.currentUsername.set(null);
      this.currentUserId.set(null);
      
      // Handle config service logout
      await this.configService.onUserSignOut();
    } catch (error) {
      console.error('Logout error:', error);
      // Force logout even if API call fails
      this.accountService.forceLogout();
      
      // Clear user info
      this.currentUsername.set(null);
      this.currentUserId.set(null);
      
      await this.configService.onUserSignOut();
    }
  }
}
