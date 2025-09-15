import { Component, signal } from '@angular/core';
import { SearchComponent } from './components/search/search.component';
import { SettingsComponent } from './components/settings/settings.component';

@Component({
  selector: 'app-root',
  imports: [SearchComponent, SettingsComponent],
  templateUrl: './app.html',
  styleUrl: './app.scss'
})
export class App {
  protected readonly title = signal('helm-frontend');
}
