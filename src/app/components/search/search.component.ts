import { Component, inject } from '@angular/core';
import { ConfigService } from '../../services/config.service';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-search',
  imports: [FormsModule],
  template: `
    <form
      class="search-box"
      (ngSubmit)="onSearch()"
      autocomplete="off"
    >
      <input
        type="text"
        [(ngModel)]="searchQuery"
        [placeholder]="searchPlaceholder"
        required
      />
      <button type="submit">Search</button>
    </form>
  `,
  styles: ``
})
export class SearchComponent {
  configService = inject(ConfigService);
  searchQuery = '';
  
  get searchPlaceholder(): string {
    const currentEngine = this.configService.getCurrentSearchEngine();
    return `Search ${currentEngine.name}...`;
  }
  
  onSearch() {
    if (this.searchQuery.trim()) {
      const searchUrl = this.configService.generateSearchUrl(this.searchQuery.trim());
      window.open(searchUrl, '_blank');
    }
  }
}