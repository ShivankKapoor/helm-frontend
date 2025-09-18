import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ThemeService } from '../../services/theme.service';
import { ColorService } from '../../services/color.service';
import { ConfigService } from '../../services/config.service';
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
  `]
})
export class SettingsComponent {
  themeService = inject(ThemeService);
  colorService = inject(ColorService);
  configService = inject(ConfigService);
  isOpen = signal(false);
  showQuickLinkSettings = signal(false);

  // Quick Links properties
  quickLinksEnabled = false;
  quickLinksList: QuickLinkConfig[] = [];
  maxQuickLinks = 5;
  editingLinkId: string | null = null;

  constructor() {
    // Subscribe to config changes to populate quick links settings
    this.configService.config$.subscribe(config => {
      if (config?.user?.quickLinks) {
        this.quickLinksEnabled = config.user.quickLinks.enabled;
        this.quickLinksList = [...config.user.quickLinks.links];
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
}