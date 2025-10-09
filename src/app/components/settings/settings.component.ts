import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ThemeService } from '../../services/theme.service';
import { ColorService } from '../../services/color.service';
import { ConfigService } from '../../services/config.service';
import { AccountService } from '../../services/account.service';
import { WeatherService, GeocodeResult } from '../../services/weather.service';
import { QuickLinkConfig, QuickLinksConfig, HeroWidgetConfig, WeatherWidgetConfig } from '../../models/config.model';
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

            <!-- Hero Widget Section -->
            <div class="setting-section">
              <label>Hero Widget</label>
              <div class="hero-widget-manager">
                <label class="toggle-row">
                  <input 
                    type="checkbox" 
                    [(ngModel)]="heroWidgetEnabled"
                    (ngModelChange)="onHeroWidgetEnabledChange($event)"
                  >
                  <span>Enable Hero Widget</span>
                </label>
                
                @if (heroWidgetEnabled) {
                  <div class="hero-widget-options">
                    <div class="setting-row">
                      <label for="hero-mode">Display Mode</label>
                      <select 
                        id="hero-mode"
                        class="setting-select" 
                        [(ngModel)]="heroWidgetMode"
                        (ngModelChange)="onHeroWidgetModeChange($event)"
                      >
                        <option value="greeting">Time-based Greeting</option>
                        <option value="clock">Digital Clock</option>
                        <option value="both">Greeting + Clock</option>
                        <option value="none">None (Hide Widget)</option>
                      </select>
                    </div>
                    
                    @if (heroWidgetMode === 'clock' || heroWidgetMode === 'both') {
                      <div class="setting-row">
                        <label for="clock-format">Clock Format</label>
                        <select 
                          id="clock-format"
                          class="setting-select" 
                          [(ngModel)]="heroClockFormat"
                          (ngModelChange)="onHeroClockFormatChange($event)"
                        >
                          <option value="12h">12 Hour (AM/PM)</option>
                          <option value="24h">24 Hour</option>
                        </select>
                      </div>
                      
                      <label class="toggle-row">
                        <input 
                          type="checkbox" 
                          [(ngModel)]="heroShowSeconds"
                          (ngModelChange)="onHeroShowSecondsChange($event)"
                        >
                        <span>Show Seconds</span>
                      </label>
                    }
                    
                    @if (heroWidgetMode === 'greeting' || heroWidgetMode === 'both') {
                      <div class="setting-row">
                        <label for="greeting-name">Custom Name (optional)</label>
                        <input 
                          id="greeting-name"
                          type="text" 
                          class="setting-input"
                          [(ngModel)]="heroGreetingName"
                          (ngModelChange)="onHeroGreetingNameChange($event)"
                          placeholder="Leave blank to use username"
                          maxlength="30"
                        >
                        <small class="setting-hint">Custom name for greeting (e.g., "Good Morning, Alex")</small>
                      </div>
                    }
                  </div>
                }
              </div>
            </div>

            <!-- Weather Widget Section -->
            <div class="setting-section">
              <label>Weather Widget</label>
              <div class="weather-widget-manager">
                <label class="toggle-row">
                  <input 
                    type="checkbox" 
                    [(ngModel)]="weatherWidgetEnabled"
                    (ngModelChange)="onWeatherWidgetEnabledChange($event)"
                  >
                  <span>Enable Weather Widget</span>
                </label>
                
                @if (weatherWidgetEnabled) {
                  <div class="weather-widget-options">
                    <div class="setting-row">
                      <label for="weather-zipcode">Zip Code</label>
                      <div class="input-with-button">
                        <input 
                          id="weather-zipcode"
                          type="text" 
                          class="setting-input"
                          [(ngModel)]="weatherZipCode"
                          (ngModelChange)="onWeatherZipCodeInput($event)"
                          (focus)="onWeatherZipCodeFocus()"
                          (blur)="onWeatherZipCodeBlur()"
                          placeholder="Enter zip code (e.g., 75035)"
                          maxlength="10"
                        >
                        <button 
                          type="button"
                          class="save-location-btn"
                          (click)="saveWeatherLocation()"
                          [disabled]="!weatherZipCode.trim() || isValidatingWeather || !hasWeatherChanges()"
                          [title]="hasWeatherChanges() ? 'Save and validate location' : 'No changes to save'"
                        >
                          @if (isValidatingWeather) {
                            <i class="bi bi-arrow-clockwise spin"></i>
                            <span>Saving...</span>
                          } @else {
                            <i class="bi bi-geo-alt"></i>
                            <span>Save Location</span>
                          }
                        </button>
                      </div>
                      <small class="setting-hint">Enter your zip code and click "Save Location" to get local weather</small>
                      @if (weatherValidationMessage()) {
                        <div class="validation-message" [class]="weatherValidationType()">
                          {{ weatherValidationMessage() }}
                        </div>
                      }
                    </div>
                    
                    @if (weatherCity()) {
                      <div class="setting-row">
                        <label>Location</label>
                        <div class="location-info">
                          <i class="bi bi-geo-alt"></i>
                          <span>{{ weatherCity() }}</span>
                        </div>
                      </div>
                    }
                    
                    <div class="setting-row">
                      <label>Widget Position</label>
                      <div class="weather-position-grid">
                        @for (pos of weatherPositions; track pos.value) {
                          <button 
                            type="button"
                            [class]="'weather-position-btn ' + (weatherCorner === pos.value ? 'active' : '')"
                            (click)="onWeatherCornerChange(pos.value)"
                            [title]="pos.label"
                          >
                            <i [class]="pos.icon"></i>
                            <span>{{ pos.short }}</span>
                          </button>
                        }
                        <!-- Note: Bottom-right is reserved for Settings & Account buttons -->
                        <div class="weather-reserved-position">
                          <i class="bi bi-gear-fill"></i>
                          <span>Reserved</span>
                          <small>Settings</small>
                        </div>
                      </div>
                      <small class="setting-hint">Choose where the weather widget appears on your screen</small>
                      
                      @if (weatherWidgetEnabled && weatherZipCode) {
                        <div class="weather-preview-section">
                          <div class="weather-preview-container">
                            <div [class]="'weather-preview-widget weather-preview-' + weatherCorner">
                              <i class="bi bi-thermometer-half"></i>
                              <span>{{ weatherCity() || 'Weather' }}</span>
                            </div>
                          </div>
                        </div>
                      }
                    </div>
                  </div>
                }
              </div>
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
    
    /* Hero Widget Styles */
    .hero-widget-manager {
      display: flex;
      flex-direction: column;
      gap: 0.75rem;
    }
    
    .hero-widget-options {
      display: flex;
      flex-direction: column;
      gap: 0.75rem;
      margin-left: 1.5rem;
      padding: 0.75rem;
      border-left: 2px solid var(--border-color, #e0e0e0);
      background: var(--section-bg, rgba(0, 0, 0, 0.02));
      border-radius: 0 4px 4px 0;
    }
    
    .setting-row {
      display: flex;
      flex-direction: column;
      gap: 0.25rem;
    }
    
    .setting-row label {
      font-size: 0.875rem;
      font-weight: 500;
      color: var(--text-secondary, #666);
      margin-bottom: 0.25rem;
    }
    
    .setting-select {
      padding: 8px 12px;
      border: 1px solid var(--border-color, #e0e0e0);
      border-radius: 4px;
      background: var(--input-bg, #fff);
      color: var(--input-text, #333);
      font-family: "Fira Code", monospace;
      font-size: 0.875rem;
      cursor: pointer;
      transition: border-color 0.2s ease;
    }
    
    .setting-select:focus {
      outline: none;
      border-color: var(--button-bg, #1a73e8);
      box-shadow: 0 0 0 2px rgba(26, 115, 232, 0.1);
    }
    
    .setting-input {
      padding: 8px 12px;
      border: 1px solid var(--border-color, #e0e0e0);
      border-radius: 4px;
      background: var(--input-bg, #fff);
      color: var(--input-text, #333);
      font-family: "Fira Code", monospace;
      font-size: 0.875rem;
      transition: border-color 0.2s ease;
    }
    
    .setting-input:focus {
      outline: none;
      border-color: var(--button-bg, #1a73e8);
      box-shadow: 0 0 0 2px rgba(26, 115, 232, 0.1);
    }
    
    .setting-hint {
      color: var(--text-tertiary, #999);
      font-size: 0.75rem;
      font-style: italic;
      margin-top: 0.25rem;
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
    
    /* Weather Widget Styles */
    .weather-widget-manager {
      display: flex;
      flex-direction: column;
      gap: 0.75rem;
    }
    
    .weather-widget-options {
      display: flex;
      flex-direction: column;
      gap: 0.75rem;
      margin-left: 1.5rem;
      padding: 0.75rem;
      border-left: 2px solid var(--border-color, #e0e0e0);
      background: var(--section-bg, rgba(0, 0, 0, 0.02));
      border-radius: 0 4px 4px 0;
    }
    
    .weather-position-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 8px;
      margin-top: 0.5rem;
    }
    
    .weather-position-btn {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 4px;
      padding: 12px 8px;
      border: 2px solid var(--border-color, #e0e0e0);
      border-radius: 8px;
      background: var(--button-secondary-bg, #f8f9fa);
      cursor: pointer;
      transition: all 0.2s ease;
      font-size: 0.8rem;
      color: var(--text-color, #333);
    }
    
    .weather-position-btn:hover {
      border-color: var(--button-bg, #1a73e8);
      background: var(--button-secondary-hover, #e3f2fd);
    }
    
    .weather-position-btn.active {
      border-color: var(--button-bg, #1a73e8);
      background: var(--button-bg, #1a73e8);
      color: white;
    }
    
    .weather-position-btn i {
      font-size: 1.2rem;
    }
    
    .weather-reserved-position {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 2px;
      padding: 12px 8px;
      border: 2px solid var(--border-color-disabled, #ccc);
      border-radius: 8px;
      background: var(--bg-disabled, #f5f5f5);
      color: var(--text-disabled, #999);
      font-size: 0.8rem;
      opacity: 0.6;
    }
    
    .weather-reserved-position i {
      font-size: 1.2rem;
    }
    
    .weather-reserved-position small {
      font-size: 0.7rem;
      margin-top: 2px;
    }
    
    .weather-preview-section {
      margin-top: 1rem;
    }
    
    .weather-preview-container {
      position: relative;
      height: 100px;
      border: 2px dashed var(--border-color, #ccc);
      border-radius: 8px;
      background: var(--preview-bg, #f8f9fa);
    }
    
    .weather-preview-widget {
      position: absolute;
      display: flex;
      align-items: center;
      gap: 8px;
      padding: 8px 12px;
      background: var(--button-bg, #1a73e8);
      color: white;
      border-radius: 8px;
      font-size: 0.8rem;
      font-weight: 500;
      box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
    }
    
    .weather-preview-top-left {
      top: 8px;
      left: 8px;
    }
    
    .weather-preview-top-right {
      top: 8px;
      right: 8px;
    }
    
    .weather-preview-bottom-left {
      bottom: 8px;
      left: 8px;
    }
    
    .weather-preview-bottom-right {
      bottom: 8px;
      right: 8px;
    }
    
    .location-info {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      padding: 8px 12px;
      background: var(--success-bg, #d4edda);
      border: 1px solid var(--success-border, #c3e6cb);
      border-radius: 4px;
      color: var(--success-text, #155724);
      font-size: 0.875rem;
    }
    
    .input-with-button {
      display: flex;
      gap: 8px;
      align-items: center;
    }
    
    .input-with-button .setting-input {
      flex: 1;
    }
    
    .save-location-btn {
      display: flex;
      align-items: center;
      gap: 6px;
      padding: 8px 12px;
      background: var(--button-bg, #1a73e8);
      color: white;
      border: none;
      border-radius: 4px;
      font-size: 0.8rem;
      font-weight: 500;
      cursor: pointer;
      transition: all 0.2s ease;
      white-space: nowrap;
    }
    
    .save-location-btn:hover:not(:disabled) {
      background: var(--button-hover-bg, #1557b0);
      transform: translateY(-1px);
    }
    
    .save-location-btn:disabled {
      background: var(--button-disabled-bg, #ccc);
      cursor: not-allowed;
      transform: none;
    }
    
    .save-location-btn .spin {
      animation: spin 1s linear infinite;
    }
    
    @keyframes spin {
      from { transform: rotate(0deg); }
      to { transform: rotate(360deg); }
    }
    
    .validation-message {
      padding: 6px 10px;
      border-radius: 4px;
      font-size: 0.8rem;
      margin-top: 0.25rem;
    }
    
    .validation-message.success {
      background: var(--success-bg, #d4edda);
      color: var(--success-text, #155724);
      border: 1px solid var(--success-border, #c3e6cb);
    }
    
    .validation-message.error {
      background: var(--error-bg, #f8d7da);
      color: var(--error-text, #721c24);
      border: 1px solid var(--error-border, #f5c6cb);
    }
    
    .validation-message.info {
      background: var(--info-bg, #d1ecf1);
      color: var(--info-text, #0c5460);
      border: 1px solid var(--info-border, #bee5eb);
    }

    /* Dark mode weather widget styles */
    :host-context(.dark) .weather-widget-options {
      background: rgba(255, 255, 255, 0.05);
      border-left-color: var(--border-color, #555);
    }
    
    :host-context(.dark) .weather-position-btn {
      background: var(--button-secondary-bg, #333);
      border-color: var(--border-color, #555);
      color: var(--text-color, #e0e0e0);
    }
    
    :host-context(.dark) .weather-position-btn:hover {
      background: var(--button-secondary-hover, #404040);
      border-color: var(--button-bg, #1a73e8);
    }
    
    :host-context(.dark) .weather-position-btn.active {
      background: var(--button-bg, #1a73e8);
      border-color: var(--button-bg, #1a73e8);
      color: white;
    }
    
    :host-context(.dark) .weather-reserved-position {
      background: var(--bg-disabled, #2a2a2a);
      border-color: var(--border-color-disabled, #444);
      color: var(--text-disabled, #666);
    }
    
    :host-context(.dark) .location-info {
      background: rgba(40, 167, 69, 0.2);
      border-color: rgba(40, 167, 69, 0.3);
      color: #a7d4b4;
    }
    
    :host-context(.dark) .weather-preview-container {
      background: var(--preview-bg, #333);
      border-color: var(--border-color, #555);
    }
    
    :host-context(.dark) .validation-message.success {
      background: rgba(40, 167, 69, 0.2);
      color: #a7d4b4;
      border-color: rgba(40, 167, 69, 0.3);
    }
    
    :host-context(.dark) .validation-message.error {
      background: rgba(220, 53, 69, 0.2);
      color: #d4a7a7;
      border-color: rgba(220, 53, 69, 0.3);
    }
    
    :host-context(.dark) .validation-message.info {
      background: rgba(23, 162, 184, 0.2);
      color: #a7c7d4;
      border-color: rgba(23, 162, 184, 0.3);
    }
    
    :host-context(.dark) .setting-row label {
      color: var(--text-secondary, #b0b0b0);
    }
    
    :host-context(.dark) .setting-select,
    :host-context(.dark) .setting-input {
      background: var(--input-bg, #303134);
      color: var(--input-text, #e8eaed);
      border-color: var(--border-color, #555);
    }
    
    :host-context(.dark) .setting-hint {
      color: var(--text-tertiary, #888);
    }
  `]
})
export class SettingsComponent {
  themeService = inject(ThemeService);
  colorService = inject(ColorService);
  configService = inject(ConfigService);
  accountService = inject(AccountService);
  weatherService = inject(WeatherService);
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

  // Hero Widget properties
  heroWidgetEnabled = false;
  heroWidgetMode: 'clock' | 'greeting' | 'both' | 'none' = 'greeting';
  heroClockFormat: '12h' | '24h' = '12h';
  heroShowSeconds = false;
  heroGreetingName = '';

  // Weather Widget properties
  weatherWidgetEnabled = false;
  weatherZipCode = '';
  originalWeatherZipCode = ''; // Track original value to detect changes
  isEditingWeatherZipCode = false; // Track if user is actively editing
  weatherCorner: 'top-left' | 'top-right' | 'bottom-left' = 'top-right';
  weatherCity = signal('');
  weatherValidationMessage = signal('');
  weatherValidationType = signal<'success' | 'error' | 'info'>('info');
  isValidatingWeather = false;

  weatherPositions = [
    { value: 'top-left' as const, label: 'Top Left', short: 'TL', icon: 'bi bi-arrow-up-left' },
    { value: 'top-right' as const, label: 'Top Right', short: 'TR', icon: 'bi bi-arrow-up-right' },
    { value: 'bottom-left' as const, label: 'Bottom Left', short: 'BL', icon: 'bi bi-arrow-down-left' }
    // bottom-right removed - reserved for settings and account buttons
  ];

  constructor() {
    // Set AccountService reference in ConfigService to avoid circular dependency
    this.configService.setAccountService(this.accountService);
    
    // Subscribe to config changes to populate settings
    this.configService.config$.subscribe(config => {
      if (config?.user?.quickLinks) {
        this.quickLinksEnabled = config.user.quickLinks.enabled;
        // Ensure links is always an array before spreading
        this.quickLinksList = Array.isArray(config.user.quickLinks.links) 
          ? [...config.user.quickLinks.links] 
          : [];
        this.maxQuickLinks = config.user.quickLinks.maxLinks;
      }
      
      if (config?.user?.heroWidget) {
        this.heroWidgetEnabled = config.user.heroWidget.enabled;
        this.heroWidgetMode = config.user.heroWidget.mode;
        this.heroClockFormat = config.user.heroWidget.clockFormat;
        this.heroShowSeconds = config.user.heroWidget.showSeconds;
        this.heroGreetingName = config.user.heroWidget.greetingName;
      }
      
      if (config?.user?.weatherWidget) {
        this.weatherWidgetEnabled = config.user.weatherWidget.enabled;
        
        // Only update zip code if user isn't actively editing it
        if (!this.isEditingWeatherZipCode) {
          this.weatherZipCode = config.user.weatherWidget.zipCode;
          this.originalWeatherZipCode = config.user.weatherWidget.zipCode; // Track original value
        }
        
        // Migrate bottom-right to top-right (reserved for settings)
        const configCorner = config.user.weatherWidget.corner;
        this.weatherCorner = (configCorner as string) === 'bottom-right' ? 'top-right' : configCorner;
        
        // If migration occurred, update the config
        if ((configCorner as string) === 'bottom-right') {
          console.log('Migrating weather widget from bottom-right to top-right (reserved for settings)');
          this.configService.updateWeatherWidget({ corner: 'top-right' });
        }
        
        this.weatherCity.set(config.user.weatherWidget.city);
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

  // Hero Widget methods
  onHeroWidgetEnabledChange(enabled: boolean) {
    this.configService.updateHeroWidget({ 
      enabled,
      mode: enabled ? (this.heroWidgetMode || 'greeting') : 'none'
    });
  }

  onHeroWidgetModeChange(mode: 'clock' | 'greeting' | 'both') {
    this.configService.updateHeroWidget({ mode });
  }

  onHeroClockFormatChange(clockFormat: '12h' | '24h') {
    this.configService.updateHeroWidget({ clockFormat });
  }

  onHeroShowSecondsChange(showSeconds: boolean) {
    this.configService.updateHeroWidget({ showSeconds });
  }

  onHeroGreetingNameChange(greetingName: string) {
    this.configService.updateHeroWidget({ greetingName });
  }

  // Weather Widget methods
  onWeatherWidgetEnabledChange(enabled: boolean) {
    this.configService.toggleWeatherWidget(enabled);
  }

  onWeatherZipCodeInput(zipCode: string) {
    // Mark as actively editing
    this.isEditingWeatherZipCode = true;
    
    // Just update the input field, no API calls
    this.weatherZipCode = zipCode;
    
    // Clear validation messages when user types
    if (this.weatherValidationMessage()) {
      this.weatherValidationMessage.set('');
    }
  }

  onWeatherZipCodeFocus() {
    this.isEditingWeatherZipCode = true;
  }

  onWeatherZipCodeBlur() {
    // Small delay to allow for button clicks
    setTimeout(() => {
      this.isEditingWeatherZipCode = false;
    }, 100);
  }

  hasWeatherChanges(): boolean {
    return this.weatherZipCode.trim() !== this.originalWeatherZipCode.trim();
  }

  async saveWeatherLocation() {
    const zipCode = this.weatherZipCode.trim();
    
    if (!zipCode) {
      this.weatherValidationMessage.set('Please enter a zip code');
      this.weatherValidationType.set('error');
      return;
    }

    // Validate zip code format (basic)
    if (!/^\d{5}(-\d{4})?$/.test(zipCode)) {
      this.weatherValidationMessage.set('Please enter a valid 5-digit zip code');
      this.weatherValidationType.set('error');
      return;
    }

    this.isValidatingWeather = true;
    this.weatherValidationMessage.set('Validating location...');
    this.weatherValidationType.set('info');

    try {
      const locationResult = await this.weatherService.getLocationFromZipCode(zipCode).toPromise();
      
      if (locationResult) {
        this.weatherCity.set(locationResult.name);
        this.weatherValidationMessage.set(`Location saved: ${locationResult.name}`);
        this.weatherValidationType.set('success');
        
        // Update config with new location data AND clear cache in one operation to prevent rapid API calls
        this.configService.updateWeatherWidgetDebounced({
          // New location data
          zipCode: zipCode,
          city: locationResult.name,
          latitude: locationResult.latitude,
          longitude: locationResult.longitude,
          // Clear cache data to force fresh fetch
          lastWeatherUpdate: undefined,
          cachedTemperature: undefined,
          cachedWeatherCode: undefined,
          cachedWeatherDescription: undefined,
          cachedWindSpeed: undefined,
          cachedWindDirection: undefined,
          cachedIsDay: undefined,
          rateLimitedUntil: undefined
        });

        // Clear ongoing requests and progress flags to ensure clean state
        this.weatherService.clearOngoingRequests();
        
        // Let the weather widget component handle the weather update through config subscription
        // No need to call weatherService.getWeatherWithCaching() here as it causes duplicate requests

        // Update the original value so hasWeatherChanges returns false
        this.originalWeatherZipCode = zipCode;
        
        // Reset editing flag since we've saved
        this.isEditingWeatherZipCode = false;

        // Clear validation message after a delay
        setTimeout(() => {
          this.weatherValidationMessage.set('');
        }, 3000);
      }
    } catch (error) {
      console.error('Weather location validation error:', error);
      this.weatherValidationMessage.set('Location not found. Please check your zip code.');
      this.weatherValidationType.set('error');
    } finally {
      this.isValidatingWeather = false;
    }
  }

  onWeatherCornerChange(corner: 'top-left' | 'top-right' | 'bottom-left') {
    this.configService.updateWeatherWidget({ corner });
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