import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ThemeService } from '../../services/theme.service';
import { ColorService } from '../../services/color.service';

@Component({
  selector: 'app-settings',
  imports: [FormsModule],
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
          </div>
        </div>
      </div>
    }
  `,
  styles: ``
})
export class SettingsComponent {
  themeService = inject(ThemeService);
  colorService = inject(ColorService);
  isOpen = signal(false);

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
}