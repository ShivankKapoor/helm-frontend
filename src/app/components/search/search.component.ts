import { Component, ViewChild, ElementRef, AfterViewInit } from '@angular/core';

@Component({
  selector: 'app-search',
  imports: [],
  template: `
    <form
      #searchForm
      class="search-box"
      action="https://www.google.com/search"
      method="GET"
      autocomplete="off"
      novalidate
      (submit)="onSubmit($event)"
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
      />
      <button type="submit">Search</button>
    </form>
    
    <!-- Empty search popup -->
    <div #emptySearchPopup class="empty-search-popup">
      <div class="popup-content">
        <i class="bi-lightbulb-fill"></i>
        <span class="popup-message">What would you like to search for?</span>
      </div>
    </div>
  `,
  styles: ``
})
export class SearchComponent implements AfterViewInit {
  @ViewChild('searchInput') searchInput!: ElementRef<HTMLInputElement>;
  @ViewChild('searchForm') searchForm!: ElementRef<HTMLFormElement>;
  @ViewChild('emptySearchPopup') emptySearchPopup!: ElementRef<HTMLDivElement>;
  
  private isShaking = false; // Prevent multiple shake animations
  private isShowingPopup = false; // Prevent multiple popups

  ngAfterViewInit() {
    // Clear and focus the search input after the view initializes
    // Use setTimeout to ensure it runs after Angular's change detection
    setTimeout(() => {
      this.searchInput.nativeElement.value = ''; // Clear any existing value
      this.searchInput.nativeElement.focus();   // Focus for immediate typing
    }, 100);
  }

  onSubmit(event: Event) {
    // Always prevent default first
    event.preventDefault();
    
    // If already shaking, ignore the request
    if (this.isShaking || this.isShowingPopup) {
      return false;
    }
    
    const inputValue = this.searchInput.nativeElement.value.trim();
    
    if (!inputValue) {
      // Trigger shake animation and popup
      this.shakeSearchBox();
      this.showEmptySearchPopup();
      
      // Focus the input to encourage typing
      this.searchInput.nativeElement.focus();
      
      return false;
    }
    
    // Manually redirect to Google search if there's content
    window.location.href = `https://www.google.com/search?q=${encodeURIComponent(inputValue)}`;
    
    return false;
  }

  private shakeSearchBox() {
    const searchBox = this.searchForm.nativeElement;
    
    // Set shaking flag to prevent multiple animations
    this.isShaking = true;
    
    // Remove any existing shake class and inline styles
    searchBox.classList.remove('shake');
    searchBox.style.removeProperty('--shake-intensity');
    searchBox.style.removeProperty('--shake-duration');
    
    // Generate random shake parameters
    const intensity = Math.random() * 8 + 4; // Random between 4px and 12px
    const duration = Math.random() * 0.4 + 0.4; // Random between 0.4s and 0.8s
    const oscillations = Math.floor(Math.random() * 3) + 3; // Random between 3 and 5 shakes
    
    // Set CSS custom properties for this shake
    searchBox.style.setProperty('--shake-intensity', `${intensity}px`);
    searchBox.style.setProperty('--shake-duration', `${duration}s`);
    searchBox.style.setProperty('--shake-oscillations', oscillations.toString());
    
    // Force reflow to ensure style changes take effect
    void searchBox.offsetHeight;
    
    // Add shake class
    searchBox.classList.add('shake');
    
    // Remove shake class after animation completes and clear shaking flag
    setTimeout(() => {
      searchBox.classList.remove('shake');
      searchBox.style.removeProperty('--shake-intensity');
      searchBox.style.removeProperty('--shake-duration');
      searchBox.style.removeProperty('--shake-oscillations');
      
      // Clear the shaking flag to allow new shake animations
      this.isShaking = false;
    }, duration * 1000 + 100); // Match animation duration plus small buffer
  }

  private showEmptySearchPopup() {
    const popup = this.emptySearchPopup.nativeElement;
    
    // Set popup flag to prevent multiple popups
    this.isShowingPopup = true;
    
    // Array of passive-aggressive but professional messages
    const messages = [
      "I'm sure you meant to type something...",
      "The search box is working, whenever you're ready.",
      "Still waiting for your query. Take your time.",
      "Perhaps you'd like to actually search for something?",
      "The keyboard is there for a reason, you know.",
      "I'll just wait here while you think of something to type.",
      "Searching requires words. Just a friendly reminder.",
      "The search box isn't going to fill itself..."
    ];
    
    // Select a random message
    const randomMessage = messages[Math.floor(Math.random() * messages.length)];
    
    // Update the popup content
    const messageSpan = popup.querySelector('.popup-message');
    if (messageSpan) {
      messageSpan.textContent = randomMessage;
    }
    
    // Remove any existing classes
    popup.classList.remove('show', 'hide');
    
    // Force reflow
    void popup.offsetHeight;
    
    // Show popup
    popup.classList.add('show');
    
    // Hide popup after 3 seconds
    setTimeout(() => {
      popup.classList.remove('show');
      popup.classList.add('hide');
      
      // Clear popup flag after hide animation completes
      setTimeout(() => {
        popup.classList.remove('hide');
        this.isShowingPopup = false;
      }, 300); // Match hide animation duration
    }, 3000);
  }
}