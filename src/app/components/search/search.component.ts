import { Component } from '@angular/core';

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
      <input
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
export class SearchComponent {

}