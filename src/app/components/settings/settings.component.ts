import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ThemeService } from '../../services/theme.service';
import { ColorService } from '../../services/color.service';
import { ConfigService } from '../../services/config.service';
import { AccountService } from '../../services/account.service';
import { QuickLinkConfig, QuickLinksConfig } from '../../models/config.model';
import { QuickLinkSettingsComponent } from '../quick-link-settings/quick-link-settings.component';

@Component({
  selector: 'app-settings',
  imports: [FormsModule, QuickLinkSettingsComponent],
  template: `
    <!-- Settings Button -->
    <button class="settings-trigger" (click)="openSettings()">
      <i class="bi bi-gear-fill"></i>
    </button>

    <!-- Settings Modal -->
    @if (isOpen()) {
      <div class="settings-backdrop" (click)="closeSettings()">
        <div class="settings-modal" (click)="$event.stopPropagation()">
          <div class="settings-header">
            <h3>Settings</h3>
            <button class="close-btn" (click)="closeSettings()">
              <i class="bi bi-x-lg"></i>
            </button>
          </div>
          
          <div class="settings-content">
            <!-- Theme Toggle Section -->
            <div class="setting-section">
              <label>Theme</label>
              <button class="theme-toggle-btn" (click)="toggleTheme()">
                <i [class]="themeIcon()"></i>
                <span>{{ themeService.isDark() ? 'Dark' : 'Light' }} Mode</span>
              </button>
            </div>

            <!-- Color Selector Section -->
            <div class="setting-section">
              <label>Color Scheme</label>
              <select 
                class="color-selector-dropdown" 
                [(ngModel)]="selectedColor"
                (ngModelChange)="onColorChange($event)"
              >
                @for (color of colorService.colors; track color.name) {
                  <option [value]="color.value">{{ color.name }}</option>
                }
              </select>
            </div>

            <!-- Quick Links Section - Multiple Links Support -->
            <div class="setting-section">
              <label>Quick Links</label>
              <div class="quick-links-manager">
                <label class="toggle-row">
                  <input 
                    type="checkbox" 
                    [(ngModel)]="quickLinksEnabled"
                    (ngModelChange)="onQuickLinksEnabledChange($event)"
                  >
                  <span>Enable Quick Links</span>
                </label>
                
                @if (quickLinksEnabled) {
                  <div class="quick-links-list">
                    @if (quickLinksList.length === 0) {
                      <div class="no-links-message">
                        <span>No quick links configured</span>
                      </div>
                    } @else {
                      @for (link of quickLinksList; track link.id) {
                        <div class="quick-link-item">
                          <div class="link-info">
                            <span class="link-text">{{ link.text }}</span>
                            <span class="link-corner">{{ formatCorner(link.corner) }}</span>
                          </div>
                          <div class="link-actions">
                            <button class="action-btn edit-btn" (click)="editQuickLink(link)" title="Edit">
                              <i class="bi bi-pencil"></i>
                            </button>
                            <button class="action-btn delete-btn" (click)="removeQuickLink(link.id)" title="Delete">
                              <i class="bi bi-trash"></i>
                            </button>
                          </div>
                        </div>
                      }
                    }
                    
                    @if (quickLinksList.length < maxQuickLinks) {
                      <button class="add-link-btn" (click)="addNewQuickLink()">
                        <i class="bi bi-plus"></i>
                        Add Quick Link
                      </button>
                    } @else {
                      <div class="max-links-message">
                        Maximum {{ maxQuickLinks }} quick links reached
                      </div>
                    }
                  </div>
                }
              </div>
            </div>

            <!-- Sync Section - Only show when user is authenticated -->
            @if (accountService.isAuthenticated()) {
              <div class="setting-section">
                <label>Configuration Sync</label>
                <div class="sync-manager">
                  <p class="sync-description">Sync your configuration with the server to access it across devices.</p>
                  <div class="sync-actions">
                    <button 
                      class="sync-btn sync-to-server" 
                      (click)="syncToServer()"
                      [disabled]="isSyncing()"
                      title="Upload current configuration to server"
                    >
                      <i class="bi" [class]="isSyncing() ? 'bi-arrow-clockwise sync-spinning' : 'bi-cloud-upload'"></i>
                      {{ isSyncing() ? 'Syncing...' : 'Sync to Server' }}
                    </button>
                    <button 
                      class="sync-btn sync-from-server" 
                      (click)="syncFromServer()"
                      [disabled]="isSyncing()"
                      title="Download configuration from server"
                    >
                      <i class="bi" [class]="isSyncing() ? 'bi-arrow-clockwise sync-spinning' : 'bi-cloud-download'"></i>
                      {{ isSyncing() ? 'Syncing...' : 'Sync from Server' }}
                    </button>
                  </div>
                  @if (syncMessage()) {
                    <div class="sync-message" [class]="syncMessageType()">
                      {{ syncMessage() }}
                    </div>
                  }
                </div>
              </div>

              <!-- Account Management Section -->
              <div class="setting-section">
                <label>Account</label>
                <div class="account-manager">
                  <p class="account-description">Manage your account and session.</p>
                  <div class="account-actions">
                    <button 
                      class="logout-btn" 
                      (click)="logout()"
                      [disabled]="isLoggingOut()"
                      title="Sign out and clear session"
                    >
                      <i class="bi" [class]="isLoggingOut() ? 'bi-arrow-clockwise sync-spinning' : 'bi-box-arrow-right'"></i>
                      {{ isLoggingOut() ? 'Signing out...' : 'Sign Out' }}
                    </button>
                  </div>
                  @if (logoutMessage()) {
                    <div class="logout-message" [class]="logoutMessageType()">
                      {{ logoutMessage() }}
                    </div>
                  }
                </div>
              </div>
            }
          </div>
        </div>
      </div>
    }

    <!-- Quick Link Settings Popup -->
    @if (showQuickLinkSettings()) {
      <app-quick-link-settings 
        [isOpen]="showQuickLinkSettings()"
        [editingLink]="getCurrentEditingLink()"
        (close)="closeQuickLinkSettings()"
        (save)="onQuickLinkSave($event)"
      />
    }
  `,
  styles: [`
    .setting-section {
      margin-bottom: 1.5rem;
    }
    
    .setting-section > label {
      display: block;
      margin-bottom: 0.5rem;
      font-weight: 600;
      color: var(--text-color, #333);
    }
    
    .toggle-row {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      cursor: pointer;
      font-weight: 500;
    }
    
    .toggle-row input[type="checkbox"] {
      margin: 0;
    }
    
    .quick-links-manager {
      display: flex;
      flex-direction: column;
      gap: 0.75rem;
    }
    
    .quick-links-list {
      margin-left: 1.5rem;
      display: flex;
      flex-direction: column;
      gap: 0.5rem;
    }
    
    .quick-link-item {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 8px 12px;
      background: var(--item-bg, #f8f9fa);
      border: 1px solid var(--border-color, #e0e0e0);
      border-radius: 6px;
    }
    
    .link-info {
      display: flex;
      flex-direction: column;
      gap: 2px;
    }
    
    .link-text {
      font-weight: 500;
      color: var(--text-color, #333);
    }
    
    .link-corner {
      font-size: 0.8rem;
      color: var(--text-secondary, #666);
    }
    
    .link-actions {
      display: flex;
      gap: 4px;
    }
    
    .action-btn {
      padding: 4px 6px;
      border: none;
      border-radius: 4px;
      cursor: pointer;
      font-size: 0.8rem;
      transition: all 0.2s ease;
    }
    
    .edit-btn {
      background: var(--button-bg, #1a73e8);
      color: white;
    }
    
    .edit-btn:hover {
      background: var(--button-hover, #155ab6);
    }
    
    .delete-btn {
      background: #dc3545;
      color: white;
    }
    
    .delete-btn:hover {
      background: #c82333;
    }
    
    .add-link-btn {
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 0.5rem;
      padding: 10px;
      background: var(--button-secondary-bg, #f8f9fa);
      border: 2px dashed var(--border-color, #ccc);
      border-radius: 6px;
      cursor: pointer;
      color: var(--text-secondary, #666);
      font-size: 0.9rem;
      transition: all 0.2s ease;
    }
    
    .add-link-btn:hover {
      background: var(--button-secondary-hover, #e9ecef);
      border-color: var(--button-bg, #1a73e8);
      color: var(--button-bg, #1a73e8);
    }
    
    .no-links-message, .max-links-message {
      text-align: center;
      color: var(--text-secondary, #666);
      font-style: italic;
      padding: 20px;
    }
    
    /* Sync Section Styles */
    .sync-manager {
      display: flex;
      flex-direction: column;
      gap: 0.75rem;
    }
    
    .sync-description {
      margin: 0;
      color: var(--text-secondary, #666);
      font-size: 0.9rem;
      line-height: 1.4;
    }
    
    .sync-actions {
      display: flex;
      gap: 0.5rem;
      flex-wrap: wrap;
    }
    
    .sync-btn {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      padding: 8px 16px;
      border: 1px solid var(--border-color, #ccc);
      border-radius: 6px;
      background: var(--button-secondary-bg, #f8f9fa);
      color: var(--text-color, #333);
      cursor: pointer;
      font-size: 0.9rem;
      transition: all 0.2s ease;
      min-width: 140px;
      justify-content: center;
    }
    
    .sync-btn:hover:not(:disabled) {
      background: var(--button-secondary-hover, #e9ecef);
      border-color: var(--button-bg, #1a73e8);
    }
    
    .sync-btn:disabled {
      opacity: 0.6;
      cursor: not-allowed;
    }
    
    .sync-to-server {
      border-color: #28a745;
    }
    
    .sync-to-server:hover:not(:disabled) {
      background: #28a745;
      color: white;
    }
    
    .sync-from-server {
      border-color: #17a2b8;
    }
    
    .sync-from-server:hover:not(:disabled) {
      background: #17a2b8;
      color: white;
    }
    
    .sync-spinning {
      animation: spin 1s linear infinite;
    }
    
    @keyframes spin {
      0% { transform: rotate(0deg); }
      100% { transform: rotate(360deg); }
    }
    
    .sync-message {
      padding: 8px 12px;
      border-radius: 4px;
      font-size: 0.9rem;
      text-align: center;
    }
    
    .sync-message.success {
      background: #d4edda;
      color: #155724;
      border: 1px solid #c3e6cb;
    }
    
    .sync-message.error {
      background: #f8d7da;
      color: #721c24;
      border: 1px solid #f5c6cb;
    }
    
    /* Dark mode adjustments */
    :host-context(.dark) .setting-section > label {
      color: var(--text-color, #e0e0e0);
    }
    
    :host-context(.dark) .toggle-row {
      color: var(--text-color, #e0e0e0);
    }
    
    :host-context(.dark) .quick-link-item {
      background: var(--item-bg, #2a2a2a);
      border-color: var(--border-color, #444);
    }
    
    :host-context(.dark) .link-text {
      color: var(--text-color, #e0e0e0);
    }
    
    :host-context(.dark) .link-corner {
      color: var(--text-secondary, #b0b0b0);
    }
    
    :host-context(.dark) .add-link-btn {
      background: var(--button-secondary-bg, #333);
      border-color: var(--border-color, #555);
      color: var(--text-secondary, #b0b0b0);
    }
    
    :host-context(.dark) .add-link-btn:hover {
      background: var(--button-secondary-hover, #404040);
      border-color: var(--button-bg, #1a73e8);
      color: var(--button-bg, #1a73e8);
    }
    
    /* Dark mode sync styles */
    :host-context(.dark) .sync-description {
      color: var(--text-secondary, #b0b0b0);
    }
    
    :host-context(.dark) .sync-btn {
      background: var(--button-secondary-bg, #333);
      border-color: var(--border-color, #555);
      color: var(--text-color, #e0e0e0);
    }
    
    :host-context(.dark) .sync-btn:hover:not(:disabled) {
      background: var(--button-secondary-hover, #404040);
    }
    
    :host-context(.dark) .sync-message.success {
      background: #1e4d2b;
      color: #a7d4b4;
      border-color: #2d5a3a;
    }
    
    :host-context(.dark) .sync-message.error {
      background: #4d1e1e;
      color: #d4a7a7;
      border-color: #5a2d2d;
    }
    
    /* Account Management Styles */
    .account-manager {
      display: flex;
      flex-direction: column;
      gap: 0.75rem;
    }
    
    .account-description {
      margin: 0;
      color: var(--text-secondary, #666);
      font-size: 0.9rem;
      line-height: 1.4;
    }
    
    .account-actions {
      display: flex;
      gap: 0.5rem;
      flex-wrap: wrap;
    }
    
    .logout-btn {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      padding: 8px 16px;
      border: 1px solid #dc3545;
      border-radius: 6px;
      background: #dc3545;
      color: white;
      cursor: pointer;
      font-size: 0.9rem;
      transition: all 0.2s ease;
      min-width: 120px;
      justify-content: center;
    }
    
    .logout-btn:hover:not(:disabled) {
      background: #c82333;
      border-color: #c82333;
    }
    
    .logout-btn:disabled {
      opacity: 0.6;
      cursor: not-allowed;
    }
    
    .logout-message {
      padding: 8px 12px;
      border-radius: 4px;
      font-size: 0.9rem;
      text-align: center;
    }
    
    .logout-message.success {
      background: #d4edda;
      color: #155724;
      border: 1px solid #c3e6cb;
    }
    
    .logout-message.error {
      background: #f8d7da;
      color: #721c24;
      border: 1px solid #f5c6cb;
    }
    
    /* Dark mode account styles */
    :host-context(.dark) .account-description {
      color: var(--text-secondary, #b0b0b0);
    }
    
    :host-context(.dark) .logout-message.success {
      background: #1e4d2b;
      color: #a7d4b4;
      border-color: #2d5a3a;
    }
    
    :host-context(.dark) .logout-message.error {
      background: #4d1e1e;
      color: #d4a7a7;
      border-color: #5a2d2d;
    }
  `]
})
export class SettingsComponent {
  themeService = inject(ThemeService);
  colorService = inject(ColorService);
  configService = inject(ConfigService);
  accountService = inject(AccountService);
  isOpen = signal(false);
  showQuickLinkSettings = signal(false);
  
  // Sync properties
  isSyncing = signal(false);
  syncMessage = signal('');
  syncMessageType = signal<'success' | 'error'>('success');
  
  // Logout properties
  isLoggingOut = signal(false);
  logoutMessage = signal('');
  logoutMessageType = signal<'success' | 'error'>('success');

  // Quick Links properties
  quickLinksEnabled = false;
  quickLinksList: QuickLinkConfig[] = [];
  maxQuickLinks = 5;
  editingLinkId: string | null = null;

  constructor() {
    // Set AccountService reference in ConfigService to avoid circular dependency
    this.configService.setAccountService(this.accountService);
    
    // Subscribe to config changes to populate quick links settings
    this.configService.config$.subscribe(config => {
      if (config?.user?.quickLinks) {
        this.quickLinksEnabled = config.user.quickLinks.enabled;
        // Ensure links is always an array before spreading
        this.quickLinksList = Array.isArray(config.user.quickLinks.links) 
          ? [...config.user.quickLinks.links] 
          : [];
        this.maxQuickLinks = config.user.quickLinks.maxLinks;
      }
    });
  }

  get selectedColor() {
    return this.colorService.currentColorValue().value;
  }
  
  set selectedColor(value: string) {
    this.colorService.setColor(value);
  }

  themeIcon() {
    return this.themeService.isDark() ? 'bi bi-moon-fill' : 'bi bi-sun-fill';
  }

  openSettings() {
    this.isOpen.set(true);
  }

  closeSettings() {
    this.isOpen.set(false);
  }

  toggleTheme() {
    this.themeService.toggleTheme();
  }

  onColorChange(value: string) {
    this.colorService.setColor(value);
  }

  // Quick Links methods
  onQuickLinksEnabledChange(enabled: boolean) {
    this.configService.toggleQuickLinks(enabled);
  }

  addNewQuickLink() {
    this.editingLinkId = null; // Mark as new link
    this.openQuickLinkSettings();
  }

  editQuickLink(link: QuickLinkConfig) {
    this.editingLinkId = link.id;
    this.openQuickLinkSettings();
  }

  removeQuickLink(id: string) {
    this.configService.removeQuickLink(id);
  }

  openQuickLinkSettings() {
    this.showQuickLinkSettings.set(true);
  }

  closeQuickLinkSettings() {
    this.showQuickLinkSettings.set(false);
    this.editingLinkId = null;
  }

  onQuickLinkSave(config: QuickLinkConfig) {
    if (this.editingLinkId) {
      // Update existing link
      this.configService.updateQuickLink(this.editingLinkId, config);
    } else {
      // Add new link
      this.configService.addQuickLink(config);
    }
  }

  formatCorner(corner: QuickLinkConfig['corner']): string {
    return corner.split('-').map(word => 
      word.charAt(0).toUpperCase() + word.slice(1)
    ).join(' ');
  }

  getCurrentEditingLink(): QuickLinkConfig | null {
    if (!this.editingLinkId) return null;
    return this.quickLinksList.find(link => link.id === this.editingLinkId) || null;
  }

  // Sync methods
  async syncToServer() {
    this.isSyncing.set(true);
    this.syncMessage.set('');
    
    try {
      console.log('Starting sync to server...');
      const success = await this.configService.syncToServer();
      if (success) {
        this.syncMessage.set('Configuration synced to server successfully!');
        this.syncMessageType.set('success');
      } else {
        this.syncMessage.set('Failed to sync configuration to server.');
        this.syncMessageType.set('error');
      }
    } catch (error) {
      console.error('Sync to server error:', error);
      this.syncMessage.set('Error syncing to server. Please try again.');
      this.syncMessageType.set('error');
    } finally {
      this.isSyncing.set(false);
      // Clear message after 3 seconds
      setTimeout(() => this.syncMessage.set(''), 3000);
    }
  }

  async syncFromServer() {
    this.isSyncing.set(true);
    this.syncMessage.set('');
    
    try {
      console.log('Starting sync from server...');
      console.log('Current config before sync:', this.configService.currentConfig);
      
      const success = await this.configService.syncFromServer();
      if (success) {
        console.log('Config after sync:', this.configService.currentConfig);
        this.configService.debugLocalStorage(); // Debug localStorage state
        this.syncMessage.set('Configuration synced from server successfully!');
        this.syncMessageType.set('success');
      } else {
        this.syncMessage.set('No configuration found on server or sync failed.');
        this.syncMessageType.set('error');
      }
    } catch (error) {
      console.error('Sync from server error:', error);
      this.syncMessage.set('Error syncing from server. Please try again.');
      this.syncMessageType.set('error');
    } finally {
      this.isSyncing.set(false);
      // Clear message after 3 seconds
      setTimeout(() => this.syncMessage.set(''), 3000);
    }
  }

  // Logout method
  async logout() {
    this.isLoggingOut.set(true);
    this.logoutMessage.set('');
    
    try {
      console.log('Starting logout process...');
      
      // Sync current config to server before logging out
      const currentConfig = this.configService.currentConfig;
      if (!currentConfig.isGuest && currentConfig.userId) {
        try {
          console.log('Syncing config before logout...');
          await this.configService.syncToServer();
        } catch (syncError) {
          console.warn('Failed to sync config before logout:', syncError);
        }
      }
      
      // Logout from server and clear session
      await this.accountService.logout().toPromise();
      
      // Handle config service logout
      await this.configService.onUserSignOut();
      
      this.logoutMessage.set('Successfully signed out!');
      this.logoutMessageType.set('success');
      
      // Close settings panel after successful logout
      setTimeout(() => {
        this.closeSettings();
      }, 1000);
      
    } catch (error) {
      console.error('Logout error:', error);
      
      // Force logout even if API call fails
      this.accountService.forceLogout();
      await this.configService.onUserSignOut();
      
      this.logoutMessage.set('Signed out (some errors occurred)');
      this.logoutMessageType.set('error');
      
      // Close settings panel even if there were errors
      setTimeout(() => {
        this.closeSettings();
      }, 1500);
    } finally {
      this.isLoggingOut.set(false);
      // Clear message after showing it
      setTimeout(() => this.logoutMessage.set(''), 3000);
    }
  }
}