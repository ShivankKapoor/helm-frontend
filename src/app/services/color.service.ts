import { Injectable, signal } from '@angular/core';

export interface ColorOption {
  name: string;
  value: string;
  bg: string;
  hover: string;
}

@Injectable({
  providedIn: 'root'
})
export class ColorService {
  private readonly colorOptions: ColorOption[] = [
    { name: 'Blue', value: '#1a73e8,#155ab6', bg: '#1a73e8', hover: '#155ab6' },
    { name: 'Yellow', value: '#fbbc05,#c69000', bg: '#fbbc05', hover: '#c69000' },
    { name: 'Green', value: '#34a853,#2e7d32', bg: '#34a853', hover: '#2e7d32' },
    { name: 'Red', value: '#ea4335,#b03a2e', bg: '#ea4335', hover: '#b03a2e' },
    { name: 'Purple', value: '#9B59B6,#6B3F87', bg: '#9B59B6', hover: '#6B3F87' },
    { name: 'Teal', value: '#3B7F70,#0A5F50', bg: '#3B7F70', hover: '#0A5F50' },
    { name: 'Orange', value: '#FF6720,#CC4F00', bg: '#FF6720', hover: '#CC4F00' }
  ];

  private currentColor = signal<ColorOption>(this.getDefaultColor());

  constructor() {
    if (typeof window !== 'undefined' && typeof document !== 'undefined') {
      this.loadColor();
    }
  }

  get colors(): ColorOption[] {
    return this.colorOptions;
  }

  get currentColorValue() {
    return this.currentColor.asReadonly();
  }

  setColor(colorValue: string): void {
    const color = this.colorOptions.find(c => c.value === colorValue);
    if (color) {
      this.currentColor.set(color);
      this.applyColor(color);
      this.saveColor(colorValue);
    }
  }

  private getDefaultColor(): ColorOption {
    return this.colorOptions[0]; // Blue is default
  }

  private loadColor(): void {
    const savedColor = this.getCookie('accent');
    if (savedColor) {
      const color = this.colorOptions.find(c => c.value === savedColor);
      if (color) {
        this.currentColor.set(color);
        this.applyColor(color);
        return;
      }
    }
    // Apply default color
    this.applyColor(this.getDefaultColor());
  }

  private applyColor(color: ColorOption): void {
    if (typeof document !== 'undefined') {
      document.documentElement.style.setProperty('--button-bg', color.bg);
      document.documentElement.style.setProperty('--button-hover', color.hover);
    }
  }

  private saveColor(colorValue: string): void {
    this.setCookie('accent', colorValue, 365);
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