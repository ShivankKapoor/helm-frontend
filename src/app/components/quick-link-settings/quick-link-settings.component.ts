import { Component, Output, EventEmitter, Input, OnChanges } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ConfigService } from '../../services/config.service';
import { QuickLinkConfig } from '../../models/config.model';

@Component({
  selector: 'app-quick-link-settings',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="quick-link-settings-backdrop" (click)="onClose()">
      <div class="quick-link-settings-modal" (click)="$event.stopPropagation()">
        <div class="modal-header">
          <h3>{{ modalTitle }}</h3>
          <button class="close-btn" (click)="onClose()">
            <i class="bi bi-x-lg"></i>
          </button>
        </div>
        
        <div class="modal-content">
          <div class="setting-item">
            <label>Link Text</label>
            <input 
              type="text" 
              [(ngModel)]="linkText"
              (ngModelChange)="onTextChange($event)"
              placeholder="e.g., Documentation, GitHub, Help"
              maxlength="20"
            >
            <small>Maximum 20 characters</small>
          </div>

          <div class="setting-item">
            <label>URL</label>
            <input 
              type="url" 
              [(ngModel)]="linkUrl"
              (ngModelChange)="onUrlChange($event)"
              placeholder="https://example.com"
            >
            <small>Must be a valid URL starting with http:// or https://</small>
          </div>

                    <div class="setting-item">
            <label>Position</label>
                      <div class="position-grid">
            @for (pos of positions; track pos.value) {
              <button 
                [class]="'position-btn ' + (linkCorner === pos.value ? 'active' : '')"
                (click)="onCornerChange(pos.value)"
                [title]="pos.label"
              >
                <i [class]="pos.icon"></i>
                <span>{{ pos.short }}</span>
              </button>
            }
            <!-- Note: Bottom-right is reserved for Settings & Account buttons -->
            <div class="reserved-position">
              <i class="bi bi-gear-fill"></i>
              <span>Reserved</span>
              <small>Settings</small>
            </div>
          </div>
          </div>

          @if (linkText && linkUrl) {
            <div class="preview-section">
              <label>Preview</label>
              <div class="preview-container">
                <div [class]="'preview-link preview-' + linkCorner">
                  {{ linkText }}
                </div>
              </div>
            </div>
          }
        </div>
        
        <div class="modal-footer">
          <button class="btn-secondary" (click)="onClose()">Cancel</button>
          <button class="btn-primary" (click)="onSave()">{{ saveButtonText }}</button>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .quick-link-settings-backdrop {
      position: fixed;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      background: rgba(0, 0, 0, 0.5);
      z-index: 2000;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 20px;
    }
    
    .quick-link-settings-modal {
      background: var(--modal-bg, white);
      border-radius: 12px;
      box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
      max-width: 500px;
      width: 100%;
      max-height: 90vh;
      overflow-y: auto;
      color: var(--text-color, #333);
    }
    
    .modal-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 20px 24px 16px;
      border-bottom: 1px solid var(--border-color, #e0e0e0);
    }
    
    .modal-header h3 {
      margin: 0;
      font-size: 1.2rem;
      font-weight: 600;
    }
    
    .close-btn {
      background: none;
      border: none;
      font-size: 1.1rem;
      cursor: pointer;
      padding: 4px;
      border-radius: 4px;
      color: var(--text-secondary, #666);
    }
    
    .close-btn:hover {
      background: var(--hover-bg, #f0f0f0);
    }
    
    .modal-content {
      padding: 20px 24px;
      display: flex;
      flex-direction: column;
      gap: 1.5rem;
    }
    
    .setting-item {
      display: flex;
      flex-direction: column;
      gap: 0.5rem;
    }
    
    .setting-item label {
      font-weight: 600;
      font-size: 0.9rem;
      color: var(--text-color, #333);
    }
    
    .setting-item input {
      padding: 10px 12px;
      border: 1px solid var(--border-color, #ccc);
      border-radius: 6px;
      font-size: 0.9rem;
      background: var(--input-bg, white);
      color: var(--text-color, #333);
      transition: border-color 0.2s ease;
    }
    
    .setting-item input:focus {
      outline: none;
      border-color: var(--button-bg, #1a73e8);
      box-shadow: 0 0 0 3px rgba(26, 115, 232, 0.1);
    }
    
    .setting-item small {
      color: var(--text-secondary, #666);
      font-size: 0.8rem;
    }
    
    .position-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 8px;
    }
    
    .position-btn {
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
    }
    
    .reserved-position {
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
    
    .reserved-position small {
      font-size: 0.7rem;
      margin-top: 2px;
    }
    
    .position-btn:hover {
      border-color: var(--button-bg, #1a73e8);
      background: var(--button-secondary-hover, #e3f2fd);
    }
    
    .position-btn.active {
      border-color: var(--button-bg, #1a73e8);
      background: var(--button-bg, #1a73e8);
      color: white;
    }
    
    .position-btn i {
      font-size: 1.2rem;
    }
    
    .preview-section {
      margin-top: 1rem;
    }
    
    .preview-container {
      position: relative;
      height: 120px;
      border: 2px dashed var(--border-color, #ccc);
      border-radius: 8px;
      background: var(--preview-bg, #f8f9fa);
    }
    
    .preview-link {
      position: absolute;
      padding: 6px 10px;
      background: var(--button-bg, #1a73e8);
      color: white;
      border-radius: 4px;
      font-size: 12px;
      font-weight: 500;
    }
    
    .preview-top-left {
      top: 8px;
      left: 8px;
    }
    
    .preview-top-right {
      top: 8px;
      right: 8px;
    }
    
    .preview-bottom-left {
      bottom: 8px;
      left: 8px;
    }
    
    .preview-bottom-right {
      bottom: 8px;
      right: 8px;
    }
    
    .modal-footer {
      display: flex;
      justify-content: flex-end;
      gap: 12px;
      padding: 16px 24px 20px;
      border-top: 1px solid var(--border-color, #e0e0e0);
    }
    
    .btn-secondary, .btn-primary {
      padding: 8px 16px;
      border-radius: 6px;
      font-size: 0.9rem;
      font-weight: 500;
      cursor: pointer;
      transition: all 0.2s ease;
    }
    
    .btn-secondary {
      background: transparent;
      border: 1px solid var(--border-color, #ccc);
      color: var(--text-color, #333);
    }
    
    .btn-secondary:hover {
      background: var(--hover-bg, #f0f0f0);
    }
    
    .btn-primary {
      background: var(--button-bg, #1a73e8);
      border: 1px solid var(--button-bg, #1a73e8);
      color: white;
    }
    
    .btn-primary:hover {
      background: var(--button-hover, #155ab6);
      border-color: var(--button-hover, #155ab6);
    }
    
    /* Dark mode */
    :host-context(.dark) .quick-link-settings-modal {
      background: var(--modal-bg, #2a2a2a);
    }
    
    :host-context(.dark) .modal-header {
      border-bottom-color: var(--border-color, #444);
    }
    
    :host-context(.dark) .modal-footer {
      border-top-color: var(--border-color, #444);
    }
    
    :host-context(.dark) .close-btn:hover {
      background: var(--hover-bg, #404040);
    }
    
    :host-context(.dark) .setting-item input {
      background: var(--input-bg, #333);
      border-color: var(--border-color, #555);
      color: var(--text-color, #e0e0e0);
    }
    
    :host-context(.dark) .position-btn {
      background: var(--button-secondary-bg, #333);
      border-color: var(--border-color, #555);
      color: var(--text-color, #e0e0e0);
    }
    
    :host-context(.dark) .position-btn:hover {
      background: var(--button-secondary-hover, #404040);
    }
    
    :host-context(.dark) .reserved-position {
      background: var(--bg-disabled, #2a2a2a);
      border-color: var(--border-color-disabled, #444);
      color: var(--text-disabled, #666);
    }
    
    :host-context(.dark) .preview-container {
      background: var(--preview-bg, #333);
      border-color: var(--border-color, #555);
    }
    
    :host-context(.dark) .btn-secondary {
      border-color: var(--border-color, #555);
      color: var(--text-color, #e0e0e0);
    }
    
    :host-context(.dark) .btn-secondary:hover {
      background: var(--hover-bg, #404040);
    }
  `]
})
export class QuickLinkSettingsComponent implements OnChanges {
  @Input() isOpen = false;
  @Input() editingLink: QuickLinkConfig | null = null; // Link being edited, null for new link
  @Output() close = new EventEmitter<void>();
  @Output() save = new EventEmitter<QuickLinkConfig>();

  linkText = '';
  linkUrl = '';
  linkCorner: 'top-left' | 'top-right' | 'bottom-left' = 'top-right';
  linkEnabled = true;

  positions = [
    { value: 'top-left' as const, label: 'Top Left', short: 'TL', icon: 'bi bi-arrow-up-left' },
    { value: 'top-right' as const, label: 'Top Right', short: 'TR', icon: 'bi bi-arrow-up-right' },
    { value: 'bottom-left' as const, label: 'Bottom Left', short: 'BL', icon: 'bi bi-arrow-down-left' }
    // bottom-right removed - reserved for settings and account buttons
  ];

  constructor(private configService: ConfigService) {}

  ngOnChanges() {
    // Load values when editingLink changes
    if (this.editingLink) {
      this.linkText = this.editingLink.text;
      this.linkUrl = this.editingLink.url;
      // Migrate bottom-right to top-right (reserved for settings)
      this.linkCorner = (this.editingLink.corner as string) === 'bottom-right' ? 'top-right' : this.editingLink.corner;
      this.linkEnabled = this.editingLink.enabled;
    } else {
      // Reset for new link
      this.linkText = '';
      this.linkUrl = '';
      this.linkCorner = 'top-right'; // Default to top-right instead of bottom-right
      this.linkEnabled = true;
    }
  }

  onTextChange(text: string) {
    this.linkText = text;
  }

  onUrlChange(url: string) {
    this.linkUrl = url;
  }

  onCornerChange(corner: 'top-left' | 'top-right' | 'bottom-left') {
    this.linkCorner = corner;
  }

  onSave() {
    const config: QuickLinkConfig = {
      id: this.editingLink?.id || '', // Will be set by ConfigService for new links
      enabled: this.linkEnabled,
      text: this.linkText,
      url: this.linkUrl,
      corner: this.linkCorner,
      order: this.editingLink?.order || 0 // Will be calculated by ConfigService for new links
    };
    
    this.save.emit(config);
    this.onClose();
  }

  onClose() {
    this.close.emit();
  }

  get modalTitle(): string {
    return this.editingLink ? 'Edit Quick Link' : 'Add Quick Link';
  }

  get saveButtonText(): string {
    return this.editingLink ? 'Update' : 'Add';
  }
}