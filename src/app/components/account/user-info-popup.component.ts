import { Component, EventEmitter, Output, Input } from '@angular/core';
import { CommonModule } from '@angular/common';

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
  `]
})
export class UserInfoPopupComponent {
  @Input() username?: string | null;
  @Output() close = new EventEmitter<void>();
  @Output() logout = new EventEmitter<void>();

  onLogout() {
    this.logout.emit();
    this.close.emit();
  }
}