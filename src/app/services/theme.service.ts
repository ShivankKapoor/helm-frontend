import { Injectable, signal } from '@angular/core';

@Injectable({
  providedIn: 'root'
})
export class ThemeService {
  private isDarkTheme = signal(false);

  constructor() {
    if (typeof window !== 'undefined' && typeof document !== 'undefined') {
      this.loadTheme();
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

  private loadTheme(): void {
    const savedTheme = this.getCookie('theme');
    const isDark = savedTheme === 'dark';
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
    this.setCookie('theme', isDark ? 'dark' : 'light', 365);
  }

  private setCookie(name: string, value: string, days: number): void {
    if (typeof document !== 'undefined') {
      let expires = '';
      if (days) {
        const d = new Date();
        d.setTime(d.getTime() + days * 24 * 60 * 60 * 1000);
        expires = '; expires=' + d.toUTCString();
      }
      document.cookie = name + '=' + value + expires + '; path=/';
    }
  }

  private getCookie(name: string): string | null {
    if (typeof document !== 'undefined') {
      const cookies = document.cookie.split(';').map((c) => c.trim());
      for (const c of cookies) {
        if (c.startsWith(name + '=')) {
          return c.substring(name.length + 1);
        }
      }
    }
    return null;
  }
}