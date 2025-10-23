import { Component, ViewChild, ElementRef, AfterViewInit } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-search',
  imports: [CommonModule],
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
        (input)="onInput($event)"
        (keydown)="onKeydown($event)"
      />
      <button type="submit">Search</button>
    </form>
    
    <!-- Math calculator dropdown -->
    @if (showCalculator && calculatorResult) {
      <div class="calculator-dropdown">
        <div class="calculator-result">
          <div class="calc-icon">
            <i class="bi bi-calculator"></i>
          </div>
          <div class="calc-content">
            <div class="calc-expression">{{ mathExpression }}</div>
            <div class="calc-answer">= {{ calculatorResult }}</div>
          </div>
          <div class="calc-action">
            <small>Press Enter to copy</small>
          </div>
        </div>
      </div>
    }
    
    <!-- Empty search popup -->
    <div #emptySearchPopup class="empty-search-popup">
      <div class="popup-content">
        <i class="bi-lightbulb-fill"></i>
        <span class="popup-message">What would you like to search for?</span>
      </div>
    </div>
    
    <!-- Copy success popup -->
    <div #copySuccessPopup class="copy-success-popup">
      <div class="popup-content">
        <i class="bi-check-circle-fill"></i>
        <span class="popup-message">Copied to clipboard!</span>
      </div>
    </div>
  `,
  styles: [`
    .calculator-dropdown {
      position: absolute;
      top: 100%;
      left: 0;
      right: 0;
      background: var(--input-bg);
      border: 1px solid var(--border-color, #e0e0e0);
      border-radius: 0 0 12px 12px;
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
      z-index: 1000;
      margin-top: -1px;
      overflow: hidden;
    }
    
    .calculator-result {
      display: flex;
      align-items: center;
      padding: 12px 16px;
      gap: 12px;
      transition: background-color 0.2s ease;
    }
    
    .calculator-result:hover {
      background: var(--hover-bg, rgba(0, 0, 0, 0.05));
    }
    
    .calc-icon {
      color: var(--button-bg);
      font-size: 18px;
      display: flex;
      align-items: center;
    }
    
    .calc-content {
      flex: 1;
      display: flex;
      flex-direction: column;
      gap: 2px;
    }
    
    .calc-expression {
      font-family: "Fira Code", monospace;
      font-size: 14px;
      color: var(--text-secondary, #666);
    }
    
    .calc-answer {
      font-family: "Fira Code", monospace;
      font-size: 18px;
      font-weight: 600;
      color: var(--text-color);
    }
    
    .calc-action {
      color: var(--text-tertiary, #999);
      font-size: 12px;
      font-family: "Fira Code", monospace;
    }
    
    /* Position the search form relatively for dropdown positioning */
    :host {
      position: relative;
      display: block;
    }
    
    /* Dark mode adjustments */
    :host-context(.dark) .calculator-dropdown {
      background: var(--input-bg, #2a2a2a);
      border-color: var(--border-color, #444);
    }
    
    :host-context(.dark) .calculator-result:hover {
      background: var(--hover-bg, rgba(255, 255, 255, 0.1));
    }
    
    :host-context(.dark) .calc-expression {
      color: var(--text-secondary, #b0b0b0);
    }
    
    :host-context(.dark) .calc-answer {
      color: var(--text-color, #e0e0e0);
    }
    
    :host-context(.dark) .calc-action {
      color: var(--text-tertiary, #888);
    }
    
    /* Copy success popup styles */
    .copy-success-popup {
      position: fixed;
      bottom: 30px;
      left: 50%;
      transform: translateX(-50%);
      background: var(--success-bg, #d4edda);
      color: var(--success-text, #155724);
      border: 2px solid var(--success-border, #c3e6cb);
      border-radius: 12px;
      padding: 16px 24px;
      box-shadow: 0 8px 24px rgba(0, 0, 0, 0.15);
      z-index: 2000;
      opacity: 0;
      visibility: hidden;
      transform: translateX(-50%) translateY(20px);
      transition: all 0.3s cubic-bezier(0.34, 1.56, 0.64, 1);
    }
    
    .copy-success-popup.show {
      opacity: 1;
      visibility: visible;
      transform: translateX(-50%) translateY(0);
    }
    
    .copy-success-popup.hide {
      opacity: 0;
      visibility: hidden;
      transform: translateX(-50%) translateY(20px);
      transition: all 0.3s ease-in;
    }
    
    .copy-success-popup.error {
      background: var(--error-bg, #f8d7da);
      color: var(--error-text, #721c24);
      border-color: var(--error-border, #f5c6cb);
    }
    
    .copy-success-popup .popup-content {
      display: flex;
      align-items: center;
      gap: 12px;
      font-family: "Fira Code", monospace;
      font-weight: 500;
    }
    
    .copy-success-popup i {
      font-size: 20px;
    }
    
    .copy-success-popup .popup-message {
      font-size: 16px;
    }
    
    /* Dark mode for copy popup */
    :host-context(.dark) .copy-success-popup {
      background: rgba(40, 167, 69, 0.2);
      color: #a7d4b4;
      border-color: rgba(40, 167, 69, 0.3);
    }
    
    :host-context(.dark) .copy-success-popup.error {
      background: rgba(220, 53, 69, 0.2);
      color: #d4a7a7;
      border-color: rgba(220, 53, 69, 0.3);
    }
  `]
})
export class SearchComponent implements AfterViewInit {
  @ViewChild('searchInput') searchInput!: ElementRef<HTMLInputElement>;
  @ViewChild('searchForm') searchForm!: ElementRef<HTMLFormElement>;
  @ViewChild('emptySearchPopup') emptySearchPopup!: ElementRef<HTMLDivElement>;
  @ViewChild('copySuccessPopup') copySuccessPopup!: ElementRef<HTMLDivElement>;
  
  private isShaking = false; // Prevent multiple shake animations
  private isShowingPopup = false; // Prevent multiple popups
  
  // Calculator properties
  showCalculator = false;
  calculatorResult: string | null = null;
  mathExpression = '';

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
    
    // If it's a calculator result, copy to clipboard
    if (this.showCalculator && this.calculatorResult) {
      this.copyResultToClipboard();
      return false;
    }
    
    // Manually redirect to Google search if there's content
    window.location.href = `https://www.google.com/search?q=${encodeURIComponent(inputValue)}`;
    
    return false;
  }

  onInput(event: Event) {
    const target = event.target as HTMLInputElement;
    const value = target.value;
    
    if (value.startsWith('=') && value.length > 1) {
      this.handleCalculatorInput(value.substring(1));
    } else {
      this.hideCalculator();
    }
  }

  onKeydown(event: KeyboardEvent) {
    if (event.key === 'Enter' && this.showCalculator && this.calculatorResult) {
      event.preventDefault();
      this.copyResultToClipboard();
    }
  }

  private handleCalculatorInput(expression: string) {
    this.mathExpression = expression;
    
    if (expression.trim() === '') {
      this.hideCalculator();
      return;
    }
    
    try {
      const result = this.evaluateMathExpression(expression);
      this.calculatorResult = result;
      this.showCalculator = true;
    } catch (error) {
      this.hideCalculator();
    }
  }

  private evaluateMathExpression(expression: string): string {
    // Remove any whitespace
    const cleanExpr = expression.replace(/\s/g, '');
    
    // Validate that the expression only contains allowed characters
    const allowedChars = /^[0-9+\-*/.()]+$/;
    if (!allowedChars.test(cleanExpr)) {
      throw new Error('Invalid characters');
    }
    
    // Prevent dangerous operations
    if (cleanExpr.includes('**') || cleanExpr.includes('^')) {
      throw new Error('Power operations not allowed');
    }
    
    // Basic validation for balanced parentheses
    let parenthesesCount = 0;
    for (const char of cleanExpr) {
      if (char === '(') parenthesesCount++;
      if (char === ')') parenthesesCount--;
      if (parenthesesCount < 0) throw new Error('Invalid parentheses');
    }
    if (parenthesesCount !== 0) throw new Error('Unbalanced parentheses');
    
    try {
      // Use Function constructor for safer evaluation
      const result = new Function('return (' + cleanExpr + ')')();
      
      if (typeof result !== 'number' || !isFinite(result)) {
        throw new Error('Invalid result');
      }
      
      // Format the result nicely
      if (Number.isInteger(result)) {
        return result.toString();
      } else {
        // Round to reasonable decimal places
        return parseFloat(result.toFixed(10)).toString();
      }
    } catch (error) {
      throw new Error('Calculation error');
    }
  }

  private hideCalculator() {
    this.showCalculator = false;
    this.calculatorResult = null;
    this.mathExpression = '';
  }

  private async copyResultToClipboard() {
    if (!this.calculatorResult) return;
    
    try {
      await navigator.clipboard.writeText(this.calculatorResult);
      this.showCopySuccessPopup();
    } catch (err) {
      console.error('Failed to copy to clipboard:', err);
      // Show error feedback if needed
      this.showCopyErrorPopup();
    }
  }

  private showCopySuccessPopup() {
    const popup = this.copySuccessPopup.nativeElement;
    
    // Set popup flag to prevent multiple popups
    if (this.isShowingPopup) return;
    this.isShowingPopup = true;
    
    // Remove any existing classes
    popup.classList.remove('show', 'hide');
    
    // Force reflow
    void popup.offsetHeight;
    
    // Show popup
    popup.classList.add('show');
    
    // Hide popup after 2 seconds (shorter than empty search popup)
    setTimeout(() => {
      popup.classList.remove('show');
      popup.classList.add('hide');
      
      // Clear popup flag after hide animation completes
      setTimeout(() => {
        popup.classList.remove('hide');
        this.isShowingPopup = false;
      }, 300); // Match hide animation duration
    }, 2000);
  }

  private showCopyErrorPopup() {
    const popup = this.copySuccessPopup.nativeElement;
    
    // Set popup flag to prevent multiple popups
    if (this.isShowingPopup) return;
    this.isShowingPopup = true;
    
    // Update message for error
    const messageSpan = popup.querySelector('.popup-message');
    const iconElement = popup.querySelector('i');
    if (messageSpan && iconElement) {
      messageSpan.textContent = 'Failed to copy to clipboard';
      iconElement.className = 'bi-exclamation-triangle-fill';
    }
    
    // Remove any existing classes
    popup.classList.remove('show', 'hide');
    popup.classList.add('error');
    
    // Force reflow
    void popup.offsetHeight;
    
    // Show popup
    popup.classList.add('show');
    
    // Hide popup after 3 seconds
    setTimeout(() => {
      popup.classList.remove('show');
      popup.classList.add('hide');
      
      // Reset to success state after hiding
      setTimeout(() => {
        popup.classList.remove('hide', 'error');
        if (messageSpan && iconElement) {
          messageSpan.textContent = 'Copied to clipboard!';
          iconElement.className = 'bi-check-circle-fill';
        }
        this.isShowingPopup = false;
      }, 300);
    }, 3000);
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