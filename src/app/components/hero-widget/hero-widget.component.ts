import { Component, OnInit, OnDestroy, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ConfigService } from '../../services/config.service';
import { AccountService } from '../../services/account.service';
import { HeroWidgetConfig } from '../../models/config.model';

@Component({
  selector: 'app-hero-widget',
  standalone: true,
  imports: [CommonModule],
  template: `
    @if (isEnabled() && config()) {
      <div class="hero-widget">
        @switch (config().mode) {
          @case ('clock') {
            <div class="hero-clock">
              <span class="time">{{ currentTime() }}</span>
              <span class="date">{{ currentDate() }}</span>
            </div>
          }
          @case ('greeting') {
            <div class="hero-greeting">
              <span class="greeting-text">{{ greetingMessage() }}</span>
              <span class="date">{{ currentDate() }}</span>
            </div>
          }
        }
      </div>
    }
  `,
  styles: [`
    .hero-widget {
      position: fixed;
      top: 60px;
      left: 50%;
      transform: translateX(-50%);
      z-index: 500;
      text-align: center;
      color: var(--text-color);
      font-family: "Fira Code", monospace;
      user-select: none;
      pointer-events: none;
      opacity: 0.9;
      transition: opacity 0.3s ease;
    }
    
    .hero-widget:hover {
      opacity: 1;
    }
    
    .hero-clock {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 4px;
    }
    
    .hero-greeting {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 4px;
    }
    
    .time {
      font-size: 2.5rem;
      font-weight: 600;
      letter-spacing: 0.05em;
      text-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
    }
    
    .greeting-text {
      font-size: 1.8rem;
      font-weight: 500;
      letter-spacing: 0.02em;
      text-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
    }
    
    .date {
      font-size: 0.9rem;
      opacity: 0.8;
      font-weight: 400;
      letter-spacing: 0.02em;
      text-shadow: 0 1px 2px rgba(0, 0, 0, 0.1);
    }
    
    /* Responsive adjustments */
    @media (max-width: 768px) {
      .hero-widget {
        top: 40px;
      }
      
      .time {
        font-size: 2rem;
      }
      
      .greeting-text {
        font-size: 1.4rem;
      }
      
      .date {
        font-size: 0.8rem;
      }
    }
    
    @media (max-width: 480px) {
      .hero-widget {
        top: 30px;
      }
      
      .time {
        font-size: 1.6rem;
      }
      
      .greeting-text {
        font-size: 1.2rem;
      }
      
      .date {
        font-size: 0.75rem;
      }
    }
    
    /* Dark mode adjustments */
    :host-context(.dark) .hero-widget {
      color: #e8eaed;
    }
    
    :host-context(.dark) .time,
    :host-context(.dark) .greeting-text {
      text-shadow: 0 2px 4px rgba(0, 0, 0, 0.3);
    }
    
    :host-context(.dark) .date {
      text-shadow: 0 1px 2px rgba(0, 0, 0, 0.3);
    }
  `]
})
export class HeroWidgetComponent implements OnInit, OnDestroy {
  private configService = inject(ConfigService);
  private accountService = inject(AccountService);
  
  // Hero widget component provides both clock and greeting functionality
  
  protected readonly config = signal<HeroWidgetConfig>({
    enabled: true,
    mode: 'greeting',
    clockFormat: '12h',
    showSeconds: false,
    greetingName: ''
  });
  
  protected readonly isEnabled = signal(false);
  protected readonly currentTime = signal('');
  protected readonly currentDate = signal('');
  protected readonly greetingMessage = signal('');
  protected readonly currentUsername = signal<string | null>(null);
  
  private timeInterval?: number;
  private configSubscription?: any;
  
  ngOnInit(): void {
    // Subscribe to config changes
    this.configSubscription = this.configService.config$.subscribe(appConfig => {
      const heroConfig = appConfig.user.heroWidget;
      this.config.set(heroConfig);
      this.isEnabled.set(heroConfig.enabled && heroConfig.mode !== 'disabled');
      
      if (this.isEnabled()) {
        this.startTimeUpdates();
      } else {
        this.stopTimeUpdates();
      }
    });
    
    // Get current username
    this.loadUsername();
    
    // Initialize time and greeting
    this.updateTimeAndDate();
    this.updateGreeting();
  }
  
  ngOnDestroy(): void {
    this.stopTimeUpdates();
    if (this.configSubscription) {
      this.configSubscription.unsubscribe();
    }
  }
  
  private async loadUsername(): Promise<void> {
    try {
      if (this.accountService.isAuthenticated()) {
        const username = await this.accountService.getCurrentUsername();
        this.currentUsername.set(username);
      } else {
        this.currentUsername.set(null);
      }
    } catch (error) {
      console.warn('Could not load username for hero widget:', error);
      this.currentUsername.set(null);
    }
    this.updateGreeting();
  }
  
  private startTimeUpdates(): void {
    this.stopTimeUpdates(); // Clear any existing interval
    
    // Update immediately
    this.updateTimeAndDate();
    this.updateGreeting();
    
    // Set up periodic updates - check if config exists before accessing properties
    const currentConfig = this.config();
    if (!currentConfig) return;
    
    const updateInterval = currentConfig.showSeconds ? 1000 : 60000; // 1s if showing seconds, 1min otherwise
    this.timeInterval = setInterval(() => {
      this.updateTimeAndDate();
      this.updateGreeting();
    }, updateInterval) as any;
  }
  
  private stopTimeUpdates(): void {
    if (this.timeInterval) {
      clearInterval(this.timeInterval);
      this.timeInterval = undefined;
    }
  }
  
  private updateTimeAndDate(): void {
    const now = new Date();
    const currentConfig = this.config();
    
    // Format time based on config
    const timeOptions: Intl.DateTimeFormatOptions = {
      hour: 'numeric',
      minute: '2-digit',
      hour12: currentConfig?.clockFormat === '12h' || true // default to 12h if config not available
    };
    
    if (currentConfig?.showSeconds) {
      timeOptions.second = '2-digit';
    }
    
    const timeString = now.toLocaleTimeString(undefined, timeOptions);
    this.currentTime.set(timeString);
    
    // Format date
    const dateOptions: Intl.DateTimeFormatOptions = {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    };
    
    const dateString = now.toLocaleDateString(undefined, dateOptions);
    this.currentDate.set(dateString);
  }
  
  private updateGreeting(): void {
    const hour = new Date().getHours();
    let timeOfDay: string;
    
    if (hour < 5) {
      timeOfDay = 'Good Night';
    } else if (hour < 12) {
      timeOfDay = 'Good Morning';
    } else if (hour < 17) {
      timeOfDay = 'Good Afternoon';
    } else if (hour < 22) {
      timeOfDay = 'Good Evening';
    } else {
      timeOfDay = 'Good Night';
    }
    
    // Determine name to use
    let displayName = '';
    const currentConfig = this.config();
    const configName = currentConfig?.greetingName?.trim();
    
    if (configName) {
      // Use custom name from config
      displayName = configName;
    } else if (this.currentUsername()) {
      // Use authenticated username
      displayName = this.currentUsername()!;
    }
    
    // Construct greeting message
    const greeting = displayName ? `${timeOfDay}, ${displayName}` : timeOfDay;
    this.greetingMessage.set(greeting);
  }
}