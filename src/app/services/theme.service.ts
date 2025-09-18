import { Injectable, signal, computed } from '@angular/core';
import { ConfigService } from './config.service';

@Injectable({
  providedIn: 'root'
})
export class ThemeService {
  private isDarkTheme = signal(false);

  constructor(private configService: ConfigService) {
    if (typeof window !== 'undefined' && typeof document !== 'undefined') {
      this.initializeTheme();
    }
  }

  get isDark() {
    return this.isDarkTheme.asReadonly();
  }

  toggleTheme(): void {
    const newTheme = !this.isDarkTheme();
    this.isDarkTheme.set(newTheme);
    this.applyTheme(newTheme);
    this.saveTheme(newTheme);
  }

  setTheme(isDark: boolean): void {
    this.isDarkTheme.set(isDark);
    this.applyTheme(isDark);
    this.saveTheme(isDark);
  }

  private initializeTheme(): void {
    // Subscribe to config changes to always stay in sync
    this.configService.config$.subscribe(config => {
      if (config) {
        this.loadThemeFromConfig(config.user.theme.mode === 'dark');
      }
    });
  }

  private loadTheme(): void {
    const config = this.configService.currentConfig;
    const isDark = config.user.theme.mode === 'dark';
    this.loadThemeFromConfig(isDark);
  }

  private loadThemeFromConfig(isDark: boolean): void {
    this.isDarkTheme.set(isDark);
    this.applyTheme(isDark);
  }

  private applyTheme(isDark: boolean): void {
    if (typeof document !== 'undefined') {
      if (isDark) {
        document.body.classList.add('dark');
      } else {
        document.body.classList.remove('dark');
      }
    }
  }

  private saveTheme(isDark: boolean): void {
    this.configService.updateTheme(isDark ? 'dark' : 'light');
  }
}