import { Injectable, signal } from '@angular/core';
import { ConfigService } from './config.service';
import { ColorOption, DEFAULT_COLOR_OPTIONS } from '../models/config.model';

@Injectable({
  providedIn: 'root'
})
export class ColorService {
  private readonly colorOptions: ColorOption[] = DEFAULT_COLOR_OPTIONS;
  private currentColor = signal<ColorOption>(this.getDefaultColor());

  constructor(private configService: ConfigService) {
    if (typeof window !== 'undefined' && typeof document !== 'undefined') {
      this.initializeColor();
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

  private initializeColor(): void {
    // Subscribe to config changes to always stay in sync
    this.configService.config$.subscribe(config => {
      if (config) {
        this.loadColorFromConfig(config.user.color.selectedColor);
      }
    });
  }

  private loadColor(): void {
    const config = this.configService.currentConfig;
    this.loadColorFromConfig(config.user.color.selectedColor);
  }

  private loadColorFromConfig(colorValue: string): void {
    const color = this.colorOptions.find(c => c.value === colorValue);
    if (color) {
      this.currentColor.set(color);
      this.applyColor(color);
    } else {
      // Apply default color if saved color is not found
      const defaultColor = this.getDefaultColor();
      this.currentColor.set(defaultColor);
      this.applyColor(defaultColor);
    }
  }

  private applyColor(color: ColorOption): void {
    if (typeof document !== 'undefined') {
      document.documentElement.style.setProperty('--button-bg', color.bg);
      document.documentElement.style.setProperty('--button-hover', color.hover);
      
      // Convert hex to RGB for opacity effects
      const bgRgb = this.hexToRgb(color.bg);
      const hoverRgb = this.hexToRgb(color.hover);
      
      if (bgRgb) {
        document.documentElement.style.setProperty('--button-bg-rgb', `${bgRgb.r}, ${bgRgb.g}, ${bgRgb.b}`);
      }
      if (hoverRgb) {
        document.documentElement.style.setProperty('--button-hover-rgb', `${hoverRgb.r}, ${hoverRgb.g}, ${hoverRgb.b}`);
      }
    }
  }

  private hexToRgb(hex: string): {r: number, g: number, b: number} | null {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result ? {
      r: parseInt(result[1], 16),
      g: parseInt(result[2], 16),
      b: parseInt(result[3], 16)
    } : null;
  }

  private saveColor(colorValue: string): void {
    this.configService.updateColor(colorValue);
  }
}