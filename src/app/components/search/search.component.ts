import { Component, ViewChild, ElementRef, AfterViewInit } from '@angular/core';

@Component({
  selector: 'app-search',
  imports: [],
  template: `
    <form
      class="search-box"
      action="https://www.google.com/search"
      method="GET"
      autocomplete="off"
    >
      <div class="search-icon">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
        </svg>
      </div>
      <input
        #searchInput
        type="text"
        name="q"
        placeholder="Search Google..."
        required
      />
      <button type="submit">Search</button>
    </form>
  `,
  styles: ``
})
export class SearchComponent implements AfterViewInit {
  @ViewChild('searchInput') searchInput!: ElementRef<HTMLInputElement>;

  ngAfterViewInit() {
    // Clear and focus the search input after the view initializes
    // Use setTimeout to ensure it runs after Angular's change detection
    setTimeout(() => {
      this.searchInput.nativeElement.value = ''; // Clear any existing value
      this.searchInput.nativeElement.focus();   // Focus for immediate typing
    }, 100);
  }
}