import { Component, OnInit, effect } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ConfigService } from '../../services/config.service';
import { ThemeService } from '../../services/theme.service';
import { ColorService } from '../../services/color.service';
import { ColorOption } from '../../models/config.model';

@Component({
  selector: 'app-config-debug',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="config-debug">
      <h3>Configuration Debug Panel</h3>
      
      <div class="section">
        <h4>Current Configuration:</h4>
        <pre>{{ currentConfig | json }}</pre>
      </div>

      <div class="section">
        <h4>Theme Controls:</h4>
        <p>Current theme: {{ currentTheme }}</p>
        <button (click)="toggleTheme()">Toggle Theme</button>
      </div>

      <div class="section">
        <h4>Color Controls:</h4>
        <p>Current color: {{ currentColor?.name }}</p>
        <div class="color-options">
          <button 
            *ngFor="let color of availableColors" 
            (click)="setColor(color.value)"
            [style.background-color]="color.bg"
            [class.active]="currentColor?.value === color.value">
            {{ color.name }}
          </button>
        </div>
      </div>

      <div class="section">
        <h4>Actions:</h4>
        <button (click)="resetConfig()">Reset to Defaults</button>
        <button (click)="exportConfig()">Export Config</button>
        <button (click)="clearStoredConfig()">Clear Stored Config</button>
      </div>

      <div class="section" *ngIf="exportedConfig">
        <h4>Exported Configuration:</h4>
        <textarea readonly [value]="exportedConfig" rows="10" cols="50"></textarea>
      </div>
    </div>
  `,
  styles: [`
    .config-debug {
      padding: 20px;
      border: 1px solid #ccc;
      margin: 20px;
      border-radius: 8px;
    }
    
    .section {
      margin-bottom: 20px;
      padding: 10px;
      border: 1px solid #eee;
      border-radius: 4px;
    }
    
    .color-options {
      display: flex;
      gap: 10px;
      flex-wrap: wrap;
    }
    
    .color-options button {
      padding: 8px 16px;
      border: 2px solid transparent;
      border-radius: 4px;
      color: white;
      cursor: pointer;
    }
    
    .color-options button.active {
      border-color: #000;
    }
    
    button {
      padding: 8px 16px;
      margin: 4px;
      border: 1px solid #ccc;
      border-radius: 4px;
      cursor: pointer;
    }
    
    pre {
      background: #f5f5f5;
      padding: 10px;
      border-radius: 4px;
      overflow-x: auto;
    }
    
    textarea {
      width: 100%;
      font-family: monospace;
    }
  `]
})
export class ConfigDebugComponent implements OnInit {
  currentConfig: any = {};
  currentTheme: string = 'light';
  currentColor: ColorOption | null = null;
  availableColors: ColorOption[] = [];
  exportedConfig: string = '';

  constructor(
    private configService: ConfigService,
    private themeService: ThemeService,
    private colorService: ColorService
  ) {
    // Use effect to reactively update when signals change
    effect(() => {
      this.currentTheme = this.themeService.isDark() ? 'dark' : 'light';
    });

    effect(() => {
      this.currentColor = this.colorService.currentColorValue();
    });
  }

  ngOnInit() {
    // Subscribe to configuration changes
    this.configService.config$.subscribe(config => {
      this.currentConfig = config;
    });

    // Get available colors
    this.availableColors = this.colorService.colors;
  }

  toggleTheme() {
    this.themeService.toggleTheme();
  }

  setColor(colorValue: string) {
    this.colorService.setColor(colorValue);
  }

  resetConfig() {
    this.configService.resetToDefaults();
  }

  exportConfig() {
    this.exportedConfig = this.configService.exportConfig();
  }

  clearStoredConfig() {
    this.configService.clearStoredConfig();
  }
}