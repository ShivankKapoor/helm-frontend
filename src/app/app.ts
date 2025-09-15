import { Component, signal } from '@angular/core';
import { SearchComponent } from './components/search/search.component';
import { ThemeToggleComponent } from './components/theme-toggle/theme-toggle.component';
import { ColorSelectorComponent } from './components/color-selector/color-selector.component';

@Component({
  selector: 'app-root',
  imports: [SearchComponent, ThemeToggleComponent, ColorSelectorComponent],
  templateUrl: './app.html',
  styleUrl: './app.scss'
})
export class App {
  protected readonly title = signal('helm-frontend');
}
