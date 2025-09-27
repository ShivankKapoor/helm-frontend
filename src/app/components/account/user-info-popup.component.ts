import { Component, EventEmitter, Output, Input, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ConfigService } from '../../services/config.service';

@Component({
  selector: 'app-user-info-popup',
  imports: [CommonModule],
  template: `
    <div class="overlay" (click)="close.emit()">
      <div class="popup" (click)="$event.stopPropagation()">
        <div class="popup-header">
          <h3>Account Info</h3>
          <button class="close-button" (click)="close.emit()" aria-label="Close">
            <i class="bi-x-lg" aria-hidden="true"></i>
          </button>
        </div>
        
        <div class="popup-content">
          <div class="user-info">
            <div class="user-avatar">
              <i class="bi-person-circle" aria-hidden="true"></i>
            </div>
            <div class="user-details">
              <div class="username">{{ username || 'Unknown User' }}</div>
            </div>
          </div>

          <!-- Sync Section -->
          <div class="sync-section">
            <h4>Configuration Sync</h4>
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
          
          <button class="logout-button" (click)="onLogout()">
            <i class="bi-box-arrow-right" aria-hidden="true"></i>
            Logout
          </button>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .overlay {
      position: fixed;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      background: rgba(0, 0, 0, 0.5);
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: 1000;
      backdrop-filter: blur(4px);
    }

    .popup {
      background: var(--bg-color);
      border: 1px solid var(--border-color);
      border-radius: 12px;
      width: 320px;
      max-width: 90vw;
      box-shadow: 0 20px 40px rgba(0, 0, 0, 0.15);
      overflow: hidden;
    }

    .popup-header {
      display: flex;
      justify-content: between;
      align-items: center;
      padding: 16px 20px;
      border-bottom: 1px solid var(--border-color);
    }

    .popup-header h3 {
      margin: 0;
      font-size: 18px;
      font-weight: 600;
      color: var(--text-color);
      flex: 1;
    }

    .close-button {
      background: none;
      border: none;
      color: var(--text-color);
      font-size: 16px;
      cursor: pointer;
      padding: 4px;
      border-radius: 4px;
      display: flex;
      align-items: center;
      justify-content: center;
      transition: background-color 0.2s ease;
    }

    .close-button:hover {
      background: var(--hover-color);
    }

    .popup-content {
      padding: 20px;
    }

    .user-info {
      display: flex;
      align-items: center;
      gap: 16px;
      margin-bottom: 24px;
    }

    .user-avatar {
      font-size: 48px;
      color: var(--primary-color);
    }

    .user-details {
      flex: 1;
    }

    .username {
      font-size: 18px;
      font-weight: 600;
      color: var(--text-color);
      margin-bottom: 4px;
    }

    /* Sync Section Styles */
    .sync-section {
      margin-bottom: 24px;
      padding: 16px;
      border: 1px solid var(--border-color);
      border-radius: 8px;
      background: var(--bg-secondary, rgba(0, 0, 0, 0.02));
    }

    .sync-section h4 {
      margin: 0 0 8px 0;
      font-size: 16px;
      font-weight: 600;
      color: var(--text-color);
    }

    .sync-description {
      margin: 0 0 16px 0;
      color: var(--text-secondary, #666);
      font-size: 13px;
      line-height: 1.4;
    }

    .sync-actions {
      display: flex;
      gap: 8px;
      flex-direction: column;
      margin-bottom: 12px;
    }

    .sync-btn {
      display: flex;
      align-items: center;
      gap: 8px;
      padding: 10px 12px;
      border: 1px solid var(--border-color, #ccc);
      border-radius: 6px;
      background: var(--button-secondary-bg, #f8f9fa);
      color: var(--text-color, #333);
      cursor: pointer;
      font-size: 13px;
      transition: all 0.2s ease;
      justify-content: center;
      font-weight: 500;
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
      font-size: 12px;
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

    .logout-button {
      width: 100%;
      padding: 12px 16px;
      background: #dc3545;
      color: white;
      border: none;
      border-radius: 8px;
      font-size: 14px;
      font-weight: 500;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 8px;
      transition: background-color 0.2s ease;
    }

    .logout-button:hover {
      background: #c82333;
    }

    .logout-button:active {
      background: #bd2130;
    }

    /* Dark mode adjustments */
    :host-context(.dark) .popup {
      background: #2d2d2d;
      border-color: #404040;
    }

    :host-context(.dark) .popup-header {
      border-bottom-color: #404040;
    }

    :host-context(.dark) .close-button:hover {
      background: rgba(255, 255, 255, 0.1);
    }

    /* Dark mode sync styles */
    :host-context(.dark) .sync-section {
      background: rgba(255, 255, 255, 0.05);
      border-color: #404040;
    }

    :host-context(.dark) .sync-section h4 {
      color: var(--text-color, #e0e0e0);
    }

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
  `]
})
export class UserInfoPopupComponent {
  @Input() username?: string | null;
  @Output() close = new EventEmitter<void>();
  @Output() logout = new EventEmitter<void>();

  configService = inject(ConfigService);
  
  // Sync properties
  isSyncing = signal(false);
  syncMessage = signal('');
  syncMessageType = signal<'success' | 'error'>('success');

  onLogout() {
    this.logout.emit();
    this.close.emit();
  }

  // Sync methods - identical to settings component
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
}