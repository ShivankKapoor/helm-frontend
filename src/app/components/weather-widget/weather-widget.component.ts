import { Component, OnInit, OnDestroy, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ConfigService } from '../../services/config.service';
import { WeatherService, WeatherInfo } from '../../services/weather.service';
import { WeatherWidgetConfig } from '../../models/config.model';

@Component({
  selector: 'app-weather-widget',
  standalone: true,
  imports: [CommonModule],
  template: `
    @if (isEnabled() && config()) {
      <div class="weather-widget" [class]="'position-' + config().corner">
        @if (isLoading()) {
          <div class="weather-loading">
            <i class="bi bi-arrow-clockwise spin"></i>
            <span>Loading...</span>
          </div>
        } @else if (errorMessage()) {
          <div class="weather-error" [title]="errorMessage()">
            <i class="bi bi-exclamation-triangle"></i>
            <span>Weather unavailable</span>
          </div>
        } @else if (weatherData()) {
          <div class="weather-content" [title]="getTooltip()">
            <div class="weather-icon">
              <i [class]="getWeatherIcon()"></i>
            </div>
            <div class="weather-info">
              <div class="temperature">
                {{ weatherData()!.temperature }}{{ weatherData()!.temperatureUnit }}
              </div>
              <div class="location" [class]="getLocationClass()">{{ weatherData()!.city }}</div>
            </div>
          </div>
        } @else {
          <div class="weather-setup">
            <i class="bi bi-geo-alt"></i>
            <span>Setup weather</span>
          </div>
        }
      </div>
    }
  `,
  styles: [`
    .weather-widget {
      position: fixed;
      z-index: 1000;
      background: var(--widget-bg, rgba(255, 255, 255, 0.95));
      border: 1px solid var(--border-color, rgba(0, 0, 0, 0.1));
      border-radius: 12px;
      padding: 12px 16px;
      font-family: "Fira Code", monospace;
      color: var(--text-color, #333);
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
      backdrop-filter: blur(10px);
      transition: all 0.3s ease;
      min-width: 120px;
      max-width: 200px;
      user-select: none;
      cursor: default;
    }
    
    .weather-widget:hover {
      transform: translateY(-2px);
      box-shadow: 0 6px 20px rgba(0, 0, 0, 0.15);
    }
    
    /* Position classes */
    .position-top-left {
      top: 20px;
      left: 20px;
    }
    
    .position-top-right {
      top: 20px;
      right: 20px;
    }
    
    .position-bottom-left {
      bottom: 20px;
      left: 20px;
    }
    
    .position-bottom-right {
      bottom: 20px;
      right: 20px;
    }
    
    .weather-content {
      display: flex;
      align-items: center;
      gap: 12px;
    }
    
    .weather-icon {
      font-size: 1.5rem;
      color: var(--button-bg, #1a73e8);
      display: flex;
      align-items: center;
    }
    
    .weather-info {
      display: flex;
      flex-direction: column;
      align-items: flex-start;
      gap: 2px;
    }
    
    .temperature {
      font-size: 1.1rem;
      font-weight: 600;
      color: var(--text-color, #333);
      line-height: 1;
    }
    
    .location {
      font-size: 0.75rem;
      color: var(--text-secondary, #666);
      font-weight: 400;
      line-height: 1.1;
      max-width: 100px;
      overflow: hidden;
      word-break: break-word;
      hyphens: auto;
      display: -webkit-box;
      -webkit-line-clamp: 2;
      -webkit-box-orient: vertical;
    }
    
    /* Scale down font for very long city names */
    .location.long-name {
      font-size: 0.65rem;
      max-width: 110px;
    }
    
    .location.very-long-name {
      font-size: 0.6rem;
      max-width: 120px;
    }
    
    .location.extremely-long-name {
      font-size: 0.55rem;
      max-width: 130px;
      line-height: 1.0;
    }
    
    .weather-loading,
    .weather-error,
    .weather-setup {
      display: flex;
      align-items: center;
      gap: 8px;
      font-size: 0.85rem;
      color: var(--text-secondary, #666);
    }
    
    .weather-error {
      color: #dc3545;
    }
    
    .weather-error i {
      color: #dc3545;
    }
    
    .weather-setup {
      color: var(--text-tertiary, #999);
      cursor: pointer;
    }
    
    .weather-setup:hover {
      color: var(--button-bg, #1a73e8);
    }
    
    .spin {
      animation: spin 1s linear infinite;
    }
    
    @keyframes spin {
      0% { transform: rotate(0deg); }
      100% { transform: rotate(360deg); }
    }
    
    /* Responsive adjustments */
    @media (max-width: 768px) {
      .weather-widget {
        padding: 10px 12px;
        min-width: 100px;
      }
      
      .position-top-left {
        top: 15px;
        left: 15px;
      }
      
      .position-top-right {
        top: 15px;
        right: 15px;
      }
      
      .position-bottom-left {
        bottom: 15px;
        left: 15px;
      }
      
      .position-bottom-right {
        bottom: 15px;
        right: 15px;
      }
      
      .weather-content {
        gap: 10px;
      }
      
      .weather-icon {
        font-size: 1.3rem;
      }
      
      .temperature {
        font-size: 1rem;
      }
      
      .location {
        font-size: 0.7rem;
        max-width: 70px;
      }
      
      .weather-loading,
      .weather-error,
      .weather-setup {
        font-size: 0.8rem;
        gap: 6px;
      }
    }
    
    @media (max-width: 480px) {
      .weather-widget {
        padding: 8px 10px;
        min-width: 90px;
      }
      
      .position-top-left {
        top: 10px;
        left: 10px;
      }
      
      .position-top-right {
        top: 10px;
        right: 10px;
      }
      
      .position-bottom-left {
        bottom: 10px;
        left: 10px;
      }
      
      .position-bottom-right {
        bottom: 10px;
        right: 10px;
      }
      
      .weather-content {
        gap: 8px;
      }
      
      .weather-icon {
        font-size: 1.2rem;
      }
      
      .temperature {
        font-size: 0.9rem;
      }
      
      .location {
        font-size: 0.65rem;
        max-width: 60px;
      }
    }
    
    /* Dark mode adjustments */
    :host-context(.dark) .weather-widget {
      background: var(--widget-bg, rgba(42, 42, 42, 0.95));
      border-color: var(--border-color, rgba(255, 255, 255, 0.1));
      color: var(--text-color, #e0e0e0);
    }
    
    :host-context(.dark) .temperature {
      color: var(--text-color, #e0e0e0);
    }
    
    :host-context(.dark) .location {
      color: var(--text-secondary, #b0b0b0);
    }
    
    :host-context(.dark) .weather-loading,
    :host-context(.dark) .weather-setup {
      color: var(--text-secondary, #b0b0b0);
    }
    
    :host-context(.dark) .weather-setup:hover {
      color: var(--button-bg, #1a73e8);
    }
    
    :host-context(.dark) .weather-widget:hover {
      box-shadow: 0 6px 20px rgba(0, 0, 0, 0.3);
    }
  `]
})
export class WeatherWidgetComponent implements OnInit, OnDestroy {
  private configService = inject(ConfigService);
  private weatherService = inject(WeatherService);
  
  protected readonly config = signal<WeatherWidgetConfig>({
    enabled: false,
    zipCode: '',
    corner: 'top-right',
    city: '',
    latitude: 0,
    longitude: 0
  });
  
  protected readonly isEnabled = signal(false);
  protected readonly weatherData = signal<WeatherInfo | null>(null);
  protected readonly isLoading = signal(false);
  protected readonly errorMessage = signal<string | null>(null);
  
  private configSubscription?: any;
  private weatherSubscription?: any;
  private errorSubscription?: any;
  private loadingSubscription?: any;
  
  // Track the previous zip code to detect changes
  private previousZipCode: string = '';
  
  ngOnInit(): void {
    // Set up the weather service with config service reference
    this.weatherService.setConfigService(this.configService);
    
    // Subscribe to config changes
    this.configSubscription = this.configService.config$.subscribe(appConfig => {
      const weatherConfig = appConfig.user.weatherWidget;
      const currentZipCode = weatherConfig.zipCode;
      const zipCodeChanged = this.previousZipCode && this.previousZipCode !== currentZipCode;
      
      this.config.set(weatherConfig);
      this.isEnabled.set(weatherConfig.enabled);
      
      if (this.isEnabled() && weatherConfig.zipCode) {
        // Check if we have saved coordinates
        if (weatherConfig.latitude && weatherConfig.longitude && weatherConfig.city) {
          // If zip code changed, force a fresh API call by clearing cache and ongoing requests
          if (zipCodeChanged) {
            console.log('🔄 Zip code changed from', this.previousZipCode, 'to', currentZipCode, '- forcing fresh weather data');
            this.weatherService.clearWeatherCache();
            this.weatherService.clearOngoingRequests();
          }
          
          // Use saved coordinates with smart caching (or forced refresh if zip changed)
          this.startWeatherUpdates();
        } else if (weatherConfig.zipCode) {
          // Need to geocode first (this should only happen during migration or initial setup)
          console.log('No saved coordinates found, geocoding zip code:', weatherConfig.zipCode);
          this.geocodeAndSaveLocation(weatherConfig.zipCode);
        }
      } else {
        this.stopWeatherUpdates();
      }
      
      // Update the previous zip code for next comparison
      this.previousZipCode = currentZipCode;
    });
    
    // Subscribe to weather service
    this.weatherSubscription = this.weatherService.weatherData$.subscribe(data => {
      this.weatherData.set(data);
    });
    
    this.errorSubscription = this.weatherService.error$.subscribe(error => {
      this.errorMessage.set(error);
    });
    
    this.loadingSubscription = this.weatherService.isLoading$.subscribe(loading => {
      this.isLoading.set(loading);
    });
  }
  
  ngOnDestroy(): void {
    this.stopWeatherUpdates();
    
    if (this.configSubscription) {
      this.configSubscription.unsubscribe();
    }
    if (this.weatherSubscription) {
      this.weatherSubscription.unsubscribe();
    }
    if (this.errorSubscription) {
      this.errorSubscription.unsubscribe();
    }
    if (this.loadingSubscription) {
      this.loadingSubscription.unsubscribe();
    }
  }
  
  private startWeatherUpdates(): void {
    const currentConfig = this.config();
    if (currentConfig.latitude && currentConfig.longitude && currentConfig.city) {
      console.log('🌤️ Starting weather updates with smart caching for:', currentConfig.city);
      this.weatherService.getWeatherWithCaching(
        currentConfig.latitude,
        currentConfig.longitude,
        currentConfig.city
      );
    }
  }
  
  private stopWeatherUpdates(): void {
    console.log('🛑 Stopping weather updates');
    this.weatherService.clearWeatherData();
  }
  
  private async geocodeAndSaveLocation(zipCode: string): Promise<void> {
    try {
      console.log('🗺️ Geocoding zip code:', zipCode);
      
      // Clear cache and ongoing requests for fresh data with new location
      this.weatherService.clearWeatherCache();
      this.weatherService.clearOngoingRequests();
      
      const locationResult = await this.weatherService.getLocationFromZipCode(zipCode).toPromise();
      if (locationResult) {
        console.log('📍 Location found, saving to config:', locationResult);
        // Save the coordinates to config
        this.configService.updateWeatherWidget({
          latitude: locationResult.latitude,
          longitude: locationResult.longitude,
          city: locationResult.name
        });
        
        // Start weather updates with the new coordinates using smart caching
        this.weatherService.getWeatherWithCaching(
          locationResult.latitude,
          locationResult.longitude,
          locationResult.name
        );
      }
    } catch (error) {
      console.error('Failed to geocode zip code:', error);
      this.errorMessage.set('Failed to find location for zip code');
    }
  }
  
  protected getWeatherIcon(): string {
    const weather = this.weatherData();
    if (!weather) return 'bi-question-circle';
    
    return this.weatherService.getWeatherIcon(weather.weatherCode, weather.isDay);
  }
  
  protected getLocationClass(): string {
    const weather = this.weatherData();
    if (!weather || !weather.city) return 'location';
    
    const cityLength = weather.city.length;
    let classes = 'location';
    
    if (cityLength > 20) {
      classes += ' extremely-long-name';
    } else if (cityLength > 15) {
      classes += ' very-long-name';
    } else if (cityLength > 10) {
      classes += ' long-name';
    }
    
    return classes;
  }

  protected getTooltip(): string {
    const weather = this.weatherData();
    if (!weather) return '';
    
    return `${weather.city}\n${weather.temperature}${weather.temperatureUnit} - ${weather.weatherDescription}\nWind: ${weather.windSpeed} ${weather.windSpeedUnit}\nLast updated: ${weather.lastUpdated.toLocaleTimeString()}`;
  }
}