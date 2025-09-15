import { Component, computed, inject } from '@angular/core';
import { ThemeService } from '../../services/theme.service';

@Component({
  selector: 'app-theme-toggle',
  imports: [],
  template: `
    <button class="theme-toggle" (click)="toggleTheme()">
      <i [class]="iconClass()"></i>
    </button>
  `,
  styles: ``
})
export class ThemeToggleComponent {
  private themeService = inject(ThemeService);

  iconClass = computed(() => 
    this.themeService.isDark() ? 'bi bi-moon-fill' : 'bi bi-sun-fill'
  );

  toggleTheme(): void {
    this.themeService.toggleTheme();
  }
}