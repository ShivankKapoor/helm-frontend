import { Component, signal, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { SearchComponent } from './components/search/search.component';
import { SettingsComponent } from './components/settings/settings.component';
import { SignInPopupComponent } from './components/account/sign-in-popup.component';
import { QuickLinkComponent } from './components/quick-link/quick-link.component';
import { AuthService } from './services/auth.service';

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

  constructor(protected authService: AuthService) {}

  openSignInPopup() {
    this.showSignInPopup.set(true);
  }

  closeSignInPopup() {
    this.showSignInPopup.set(false);
  }

  async handleSignIn(credentials: { email: string; password: string }) {
    const result = await this.authService.signIn(credentials);
    
    // Let the popup component handle the response
    this.signInPopup?.handleSignInResponse(result.success, result.error);
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

  signOut() {
    this.authService.signOut();
  }
}
