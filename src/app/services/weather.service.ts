import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, BehaviorSubject, throwError, of } from 'rxjs';
import { catchError, map, switchMap, retry, shareReplay, share, finalize, tap } from 'rxjs/operators';

export interface GeocodeResult {
  name: string;
  latitude: number;
  longitude: number;
  country_code: string;
  admin1?: string; // State/Province
}

export interface WeatherData {
  current_weather: {
    temperature: number;
    weathercode: number;
    windspeed: number;
    winddirection: number;
    is_day: number;
  };
  current_weather_units: {
    temperature: string;
    windspeed: string;
  };
}

export interface WeatherInfo {
  temperature: number;
  temperatureUnit: string;
  weatherCode: number;
  weatherDescription: string;
  windSpeed: number;
  windSpeedUnit: string;
  windDirection: number;
  isDay: boolean;
  city: string;
  lastUpdated: Date;
}

@Injectable({
  providedIn: 'root'
})
export class WeatherService {
  private http = inject(HttpClient);
  
  private readonly GEOCODING_API = 'https://geocoding-api.open-meteo.com/v1/search';
  private readonly WEATHER_API = 'https://api.open-meteo.com/v1/forecast';
  
  // Cache duration: 15 minutes
  private readonly CACHE_DURATION_MS = 15 * 60 * 1000; // 15 minutes in milliseconds

  // Track ongoing requests to prevent duplicates and rate limiting
  private ongoingWeatherRequest: Observable<WeatherInfo> | null = null;
  private ongoingGeocodingRequest: Observable<GeocodeResult> | null = null;
  
  // Global request blocking to prevent multiple simultaneous API calls
  private isWeatherRequestInProgress = false;
  private isGeocodingRequestInProgress = false;
  
  // Network and offline handling
  private isOnline = navigator.onLine;
  private retryTimeouts: Set<any> = new Set();
  
  private weatherDataSubject = new BehaviorSubject<WeatherInfo | null>(null);
  private errorSubject = new BehaviorSubject<string | null>(null);
  private isLoadingSubject = new BehaviorSubject<boolean>(false);
  
  public weatherData$ = this.weatherDataSubject.asObservable();
  public error$ = this.errorSubject.asObservable();
  public isLoading$ = this.isLoadingSubject.asObservable();
  
  private configService: any; // Will be injected later to avoid circular dependency

  /**
   * Set ConfigService reference after injection to avoid circular dependency
   */
  setConfigService(configService: any): void {
    this.configService = configService;
    this.initializeNetworkMonitoring();
  }

  /**
   * Initialize network status monitoring
   */
  private initializeNetworkMonitoring(): void {
    // Listen for online/offline events
    window.addEventListener('online', () => {
      console.log('🌐 Network connection restored');
      this.isOnline = true;
      this.handleNetworkReconnection();
    });
    
    window.addEventListener('offline', () => {
      console.log('📵 Network connection lost');
      this.isOnline = false;
      this.clearRetryTimeouts();
    });
  }

  /**
   * Handle network reconnection - retry failed requests
   */
  private handleNetworkReconnection(): void {
    if (!this.configService) return;
    
    const config = this.configService.currentConfig;
    const weatherConfig = config?.user?.weatherWidget;
    
    // If we have location data but no recent weather data, try to refresh
    if (weatherConfig?.latitude && weatherConfig?.longitude && weatherConfig?.city) {
      const hasRecentData = this.isCacheValid(weatherConfig.lastWeatherUpdate);
      if (!hasRecentData) {
        console.log('🔄 Network restored - attempting to refresh weather data');
        setTimeout(() => {
          this.getWeatherWithCaching(weatherConfig.latitude, weatherConfig.longitude, weatherConfig.city);
        }, 1000); // Small delay to ensure network is stable
      }
    }
  }

  /**
   * Clear all retry timeouts
   */
  private clearRetryTimeouts(): void {
    this.retryTimeouts.forEach(timeout => clearTimeout(timeout));
    this.retryTimeouts.clear();
  }

  /**
   * Check if cached weather data is still valid (less than 15 minutes old)
   */
  private isCacheValid(lastUpdateIso?: string): boolean {
    if (!lastUpdateIso) return false;
    
    const lastUpdate = new Date(lastUpdateIso);
    const now = new Date();
    const timeDiff = now.getTime() - lastUpdate.getTime();
    
    return timeDiff < this.CACHE_DURATION_MS;
  }

  /**
   * Check if we're currently rate limited (should avoid API calls)
   */
  private isRateLimited(rateLimitedUntilIso?: string): boolean {
    if (!rateLimitedUntilIso) return false;
    
    const rateLimitedUntil = new Date(rateLimitedUntilIso);
    const now = new Date();
    
    return now.getTime() < rateLimitedUntil.getTime();
  }

  /**
   * Set rate limit timeout (prevents API calls until next refresh cycle)
   */
  private setRateLimit(): void {
    if (!this.configService) return;
    
    // Set rate limit until the next full refresh cycle (15 minutes from now)
    const rateLimitedUntil = new Date();
    rateLimitedUntil.setMinutes(rateLimitedUntil.getMinutes() + 15);
    
    console.log('🚫 Rate limited - API calls blocked until:', rateLimitedUntil.toISOString());
    
    // Use debounced update for rate limiting to prevent rapid API calls
    this.configService.updateWeatherWidgetDebounced({
      rateLimitedUntil: rateLimitedUntil.toISOString(),
      lastWeatherUpdate: new Date().toISOString() // Update timestamp to prevent immediate retries
    });
  }

  /**
   * Handle weather API errors with intelligent fallback and retry logic
   */
  private handleWeatherApiError(error: any, latitude: number, longitude: number, city: string): Observable<WeatherInfo> {
    this.isLoadingSubject.next(false);
    
    // Check if we're offline
    if (!this.isOnline || error.status === 0) {
      console.log('📵 Offline or network error - using cached data and scheduling retry');
      return this.handleOfflineError(latitude, longitude, city);
    }
    
    // Handle specific HTTP status codes
    switch (error.status) {
      case 429:
        console.warn('🚫 Weather API rate limit exceeded (429) - setting rate limit timeout');
        this.setRateLimit();
        return this.handleRateLimitError();
        
      case 500:
      case 502:
      case 503:
      case 504:
        console.warn('🔧 Weather API server error - using cached data and scheduling retry');
        return this.handleServerError(latitude, longitude, city);
        
      case 400:
      case 404:
        console.error('❌ Weather API client error - invalid request');
        return this.handleClientError(error);
        
      default:
        console.warn('⚠️ Unexpected weather API error - using cached data');
        return this.handleGenericError(error, latitude, longitude, city);
    }
  }

  /**
   * Handle offline/network errors
   */
  private handleOfflineError(latitude: number, longitude: number, city: string): Observable<WeatherInfo> {
    const cachedData = this.getCachedWeatherData();
    if (cachedData) {
      this.weatherDataSubject.next(cachedData);
      this.errorSubject.next('Using offline data - will refresh when online');
      console.log('📱 Using cached data while offline');
      return of(cachedData);
    } else {
      const errorMessage = 'No internet connection and no cached weather data available';
      this.errorSubject.next(errorMessage);
      return throwError(() => new Error(errorMessage));
    }
  }

  /**
   * Handle rate limiting errors
   */
  private handleRateLimitError(): Observable<WeatherInfo> {
    const cachedData = this.getCachedWeatherData();
    if (cachedData) {
      this.weatherDataSubject.next(cachedData);
      this.errorSubject.next('Rate limit reached - using cached data');
      return of(cachedData);
    } else {
      const errorMessage = 'Weather API rate limit exceeded. Please try again later.';
      this.errorSubject.next(errorMessage);
      return throwError(() => new Error(errorMessage));
    }
  }

  /**
   * Handle server errors (5xx) - schedule retry
   */
  private handleServerError(latitude: number, longitude: number, city: string): Observable<WeatherInfo> {
    const cachedData = this.getCachedWeatherData();
    if (cachedData) {
      this.weatherDataSubject.next(cachedData);
      this.errorSubject.next('Weather service temporarily unavailable - using cached data');
      
      // Schedule a retry in 5 minutes
      this.scheduleRetry(latitude, longitude, city, 5 * 60 * 1000);
      
      return of(cachedData);
    } else {
      const errorMessage = 'Weather service temporarily unavailable. Please try again later.';
      this.errorSubject.next(errorMessage);
      
      // Still schedule a retry even without cached data
      this.scheduleRetry(latitude, longitude, city, 5 * 60 * 1000);
      
      return throwError(() => new Error(errorMessage));
    }
  }

  /**
   * Handle client errors (4xx) - usually permanent
   */
  private handleClientError(error: any): Observable<WeatherInfo> {
    const errorMessage = 'Invalid weather request. Please check your location settings.';
    this.errorSubject.next(errorMessage);
    return throwError(() => new Error(errorMessage));
  }

  /**
   * Handle generic errors
   */
  private handleGenericError(error: any, latitude: number, longitude: number, city: string): Observable<WeatherInfo> {
    const cachedData = this.getCachedWeatherData();
    if (cachedData) {
      this.weatherDataSubject.next(cachedData);
      this.errorSubject.next('Weather update failed - using cached data');
      
      // Schedule a retry in 2 minutes for generic errors
      this.scheduleRetry(latitude, longitude, city, 2 * 60 * 1000);
      
      return of(cachedData);
    } else {
      const errorMessage = error.message || 'Failed to fetch weather data';
      this.errorSubject.next(errorMessage);
      return throwError(() => new Error(errorMessage));
    }
  }

  /**
   * Get cached weather data if available
   */
  private getCachedWeatherData(): WeatherInfo | null {
    if (!this.configService) return null;
    
    const currentConfig = this.configService.currentConfig;
    return this.createWeatherInfoFromCache(currentConfig);
  }

  /**
   * Schedule a retry attempt after a delay
   */
  private scheduleRetry(latitude: number, longitude: number, city: string, delayMs: number): void {
    console.log(`⏰ Scheduling weather retry in ${delayMs / 1000} seconds`);
    
    const timeout = setTimeout(() => {
      this.retryTimeouts.delete(timeout);
      
      // Only retry if we're online and not rate limited
      if (this.isOnline && !this.isRateLimited(this.configService?.currentConfig?.user?.weatherWidget?.rateLimitedUntil)) {
        console.log('🔄 Attempting scheduled weather retry');
        this.getWeatherWithCaching(latitude, longitude, city);
      }
    }, delayMs);
    
    this.retryTimeouts.add(timeout);
  }

  /**
   * Handle geocoding API errors
   */
  private handleGeocodingApiError(error: any): Observable<GeocodeResult> {
    this.isLoadingSubject.next(false);
    
    // Check if we're offline
    if (!this.isOnline || error.status === 0) {
      const errorMessage = 'No internet connection. Please check your network and try again.';
      this.errorSubject.next(errorMessage);
      return throwError(() => new Error(errorMessage));
    }
    
    // Handle specific HTTP status codes
    switch (error.status) {
      case 429:
        console.warn('🚫 Geocoding API rate limit exceeded (429) - setting rate limit timeout');
        this.setRateLimit();
        const rateLimitMessage = 'Geocoding API rate limit exceeded. Please try again later.';
        this.errorSubject.next(rateLimitMessage);
        return throwError(() => new Error(rateLimitMessage));
        
      case 500:
      case 502:
      case 503:
      case 504:
        const serverErrorMessage = 'Location service temporarily unavailable. Please try again later.';
        this.errorSubject.next(serverErrorMessage);
        return throwError(() => new Error(serverErrorMessage));
        
      case 400:
      case 404:
        const notFoundMessage = 'Location not found. Please check your zip code and try again.';
        this.errorSubject.next(notFoundMessage);
        return throwError(() => new Error(notFoundMessage));
        
      default:
        const genericMessage = error.message || 'Failed to find location';
        this.errorSubject.next(genericMessage);
        return throwError(() => new Error(genericMessage));
    }
  }

  /**
   * Create WeatherInfo from cached config data
   */
  private createWeatherInfoFromCache(config: any): WeatherInfo | null {
    const weather = config.user?.weatherWidget;
    if (!weather || !weather.cachedTemperature) return null;

    return {
      temperature: weather.cachedTemperature,
      temperatureUnit: '°F',
      weatherCode: weather.cachedWeatherCode || 0,
      weatherDescription: weather.cachedWeatherDescription || 'Unknown',
      windSpeed: weather.cachedWindSpeed || 0,
      windSpeedUnit: 'mph',
      windDirection: weather.cachedWindDirection || 0,
      isDay: weather.cachedIsDay !== undefined ? weather.cachedIsDay : true,
      city: weather.city || '',
      lastUpdated: new Date(weather.lastWeatherUpdate || new Date())
    };
  }

  /**
   * Save weather data to config cache
   */
  private saveWeatherToCache(weatherInfo: WeatherInfo): void {
    if (!this.configService) return;

    console.log('💾 Saving weather data to cache (debounced):', weatherInfo);
    
    // Use debounced update to prevent rapid API calls to helmseek
    this.configService.updateWeatherWidgetDebounced({
      cachedTemperature: weatherInfo.temperature,
      cachedWeatherCode: weatherInfo.weatherCode,
      cachedWeatherDescription: weatherInfo.weatherDescription,
      cachedWindSpeed: weatherInfo.windSpeed,
      cachedWindDirection: weatherInfo.windDirection,
      cachedIsDay: weatherInfo.isDay,
      lastWeatherUpdate: new Date().toISOString()
    });
  }

  /**
   * Get geocoding information from zip code
   */
  getLocationFromZipCode(zipCode: string): Observable<GeocodeResult> {
    // If there's already an ongoing request for this zip code, return it
    if (this.ongoingGeocodingRequest) {
      console.log('🔄 Reusing ongoing geocoding request to prevent duplicate API calls');
      return this.ongoingGeocodingRequest;
    }

    console.log('🌍 Starting new geocoding API request for zip code:', zipCode);
    this.isLoadingSubject.next(true);
    this.errorSubject.next(null);
    
    // Get multiple results to find US locations first
    const url = `${this.GEOCODING_API}?name=${encodeURIComponent(zipCode)}&count=10`;
    
    // Create and cache the request
    this.ongoingGeocodingRequest = this.http.get<{ results?: GeocodeResult[] }>(url).pipe(
      map(response => {
        if (!response.results || response.results.length === 0) {
          throw new Error(`No location found for zip code: ${zipCode}`);
        }
        
        // If the zip code looks like a US zip code (5 digits or 5+4), prioritize US results
        const isUSZipCode = /^\d{5}(-\d{4})?$/.test(zipCode);
        
        if (isUSZipCode) {
          // Look for US results first (country_code = 'US')
          const usResult = response.results.find(result => 
            result.country_code === 'US'
          );
          
          if (usResult) {
            console.log('🇺🇸 Found US location for zip code:', usResult);
            return usResult;
          }
          
          console.log('⚠️ No US location found for zip code, using first result:', response.results[0]);
        }
        
        // Return the first result if not a US zip code or no US result found
        return response.results[0];
      }),
      retry(1), // Only retry once as requested
      catchError(error => {
        console.error('Geocoding error:', error);
        
        return this.handleGeocodingApiError(error);
      }),
      finalize(() => {
        // Clear the ongoing request when it completes (success or error)
        console.log('✅ Geocoding API request completed, clearing ongoing request cache');
        this.ongoingGeocodingRequest = null;
      }),
      share() // Share the observable among multiple subscribers
    );

    return this.ongoingGeocodingRequest;
  }

  /**
   * Get current weather data from coordinates
   */
  getCurrentWeather(latitude: number, longitude: number, city: string): Observable<WeatherInfo> {
    // Create a unique key for this request
    const requestKey = `${latitude}-${longitude}-${city}`;
    
    // If there's already an ongoing request for this location, return it
    if (this.ongoingWeatherRequest) {
      console.log('🔄 Reusing ongoing weather request to prevent duplicate API calls');
      return this.ongoingWeatherRequest;
    }

    console.log('🌐 Starting new weather API request for:', requestKey);
    this.isLoadingSubject.next(true);
    this.errorSubject.next(null);
    
    const url = `${this.WEATHER_API}?latitude=${latitude}&longitude=${longitude}&current_weather=true&temperature_unit=fahrenheit&wind_speed_unit=mph&precipitation_unit=inch`;
    
    // Create and cache the request
    this.ongoingWeatherRequest = this.http.get<WeatherData>(url).pipe(
      map(response => {
        if (!response.current_weather) {
          throw new Error('Invalid weather data received');
        }
        
        const weather = response.current_weather;
        return {
          temperature: Math.round(weather.temperature),
          temperatureUnit: response.current_weather_units?.temperature || '°F',
          weatherCode: weather.weathercode,
          weatherDescription: this.getWeatherDescription(weather.weathercode),
          windSpeed: weather.windspeed,
          windSpeedUnit: response.current_weather_units?.windspeed || 'mph',
          windDirection: weather.winddirection,
          isDay: weather.is_day === 1,
          city: city,
          lastUpdated: new Date()
        };
      }),
      retry(1), // Only retry once as requested
      catchError(error => {
        console.error('Weather API error:', error);
        
        return this.handleWeatherApiError(error, latitude, longitude, city);
      }),
      finalize(() => {
        // Clear the ongoing request when it completes (success or error)
        console.log('✅ Weather API request completed, clearing ongoing request cache');
        this.ongoingWeatherRequest = null;
      }),
      share() // Share the observable among multiple subscribers
    );

    return this.ongoingWeatherRequest;
  }

  /**
   * Get weather data by zip code (combines geocoding and weather fetch)
   */
  getWeatherByZipCode(zipCode: string): Observable<{ locationInfo: GeocodeResult; weatherInfo: WeatherInfo }> {
    return this.getLocationFromZipCode(zipCode).pipe(
      switchMap(locationInfo => 
        this.getCurrentWeather(locationInfo.latitude, locationInfo.longitude, locationInfo.name).pipe(
          map(weatherInfo => ({ locationInfo, weatherInfo }))
        )
      ),
      catchError(error => {
        this.isLoadingSubject.next(false);
        return throwError(() => error);
      })
    );
  }

    /**
   * Get weather data with smart caching - only calls API if cache is older than 15 minutes
   */
  getWeatherWithCaching(latitude: number, longitude: number, city: string): void {
    if (!this.configService) {
      console.error('⚠️ ConfigService not available for weather caching');
      this.getCurrentWeather(latitude, longitude, city).subscribe({
        next: (weatherInfo) => {
          this.weatherDataSubject.next(weatherInfo);
          this.isLoadingSubject.next(false);
          this.errorSubject.next(null);
        },
        error: (error) => {
          console.error('Weather API error:', error);
          this.errorSubject.next(error.message || 'Failed to fetch weather data');
          this.isLoadingSubject.next(false);
        }
      });
      return;
    }

    const currentConfig = this.configService.currentConfig;
    const weatherConfig = currentConfig?.user?.weatherWidget;

    // Check if we're currently rate limited
    if (this.isRateLimited(weatherConfig?.rateLimitedUntil)) {
      console.log('🚫 API calls blocked due to rate limiting, using cached data');
      const cachedWeatherInfo = this.createWeatherInfoFromCache(currentConfig);
      if (cachedWeatherInfo) {
        this.weatherDataSubject.next(cachedWeatherInfo);
        this.isLoadingSubject.next(false);
        this.errorSubject.next('Weather API temporarily unavailable due to rate limiting');
        return;
      }
      // If no cached data available, show error
      this.errorSubject.next('Weather API temporarily unavailable due to rate limiting');
      this.isLoadingSubject.next(false);
      return;
    }

    // Check if a weather request is already in progress
    if (this.isWeatherRequestInProgress) {
      console.log('⏳ Weather request already in progress, ignoring duplicate request');
      // Use cached data if available, otherwise just show loading state
      const cachedWeatherInfo = this.createWeatherInfoFromCache(currentConfig);
      if (cachedWeatherInfo) {
        this.weatherDataSubject.next(cachedWeatherInfo);
        this.errorSubject.next(null);
      }
      return;
    }

    // Check if we have valid cached data
    if (this.isCacheValid(weatherConfig?.lastWeatherUpdate)) {
      console.log('✅ Using cached weather data (cache is valid)');
      const cachedWeatherInfo = this.createWeatherInfoFromCache(currentConfig);
      if (cachedWeatherInfo) {
        this.weatherDataSubject.next(cachedWeatherInfo);
        this.isLoadingSubject.next(false);
        this.errorSubject.next(null);
        return;
      }
    }

    // Cache is invalid or doesn't exist, fetch fresh data
    console.log('🌐 Cache expired or missing, fetching fresh weather data...');
    this.isLoadingSubject.next(true);
    this.errorSubject.next(null);
    
    // Set the global progress flag to prevent duplicate requests
    this.isWeatherRequestInProgress = true;

    this.getCurrentWeather(latitude, longitude, city).subscribe({
      next: (weatherInfo) => {
        console.log('🌤️ Fresh weather data received:', weatherInfo);
        this.saveWeatherToCache(weatherInfo);
        this.weatherDataSubject.next(weatherInfo);
        this.isLoadingSubject.next(false);
        this.errorSubject.next(null);
        this.isWeatherRequestInProgress = false; // Clear progress flag
      },
      error: (error) => {
        console.error('Weather API error:', error);
        this.errorSubject.next(error.message || 'Failed to fetch weather data');
        this.isLoadingSubject.next(false);
        this.isWeatherRequestInProgress = false; // Clear progress flag
        
        // Try to fall back to cached data even if expired
        const cachedWeatherInfo = this.createWeatherInfoFromCache(currentConfig);
        if (cachedWeatherInfo) {
          console.log('📱 Using expired cached data as fallback');
          this.weatherDataSubject.next(cachedWeatherInfo);
        }
      }
    });
  }

  /**
   * Update weather data and emit to subscribers (DEPRECATED - use getWeatherWithCaching)
   */
  updateWeatherData(zipCode: string): void {
    console.warn('⚠️ updateWeatherData is deprecated, use getWeatherWithCaching instead');
    if (!zipCode.trim()) {
      this.errorSubject.next('Zip code is required');
      return;
    }

    this.getWeatherByZipCode(zipCode).subscribe({
      next: (result) => {
        this.weatherDataSubject.next(result.weatherInfo);
        this.isLoadingSubject.next(false);
        this.errorSubject.next(null);
      },
      error: (error) => {
        console.error('Weather update error:', error);
        this.errorSubject.next(error.message || 'Failed to update weather');
        this.isLoadingSubject.next(false);
      }
    });
  }

  /**
   * Start automatic weather refresh (DEPRECATED - caching handles this now)
   */
  startWeatherRefresh(zipCode: string, intervalMinutes: number = 30): void {
    console.warn('⚠️ startWeatherRefresh is deprecated, weather caching handles refresh automatically');
    // For backward compatibility, just fetch once
    this.updateWeatherData(zipCode);
  }

  /**
   * Stop automatic weather refresh (DEPRECATED - no longer needed)
   */
  stopWeatherRefresh(): void {
    console.log('ℹ️ stopWeatherRefresh called but no longer needed with caching system');
  }

    /**
   * Clear weather data
   */
  clearWeatherData(): void {
    this.weatherDataSubject.next(null);
    this.errorSubject.next(null);
    this.isLoadingSubject.next(false);
  }

  /**
   * Clear weather cache - forces fresh API call on next request
   */
  clearWeatherCache(): void {
    if (!this.configService) {
      console.warn('ConfigService not set, cannot clear weather cache');
      return;
    }

    console.log('🗑️ Clearing weather cache, rate limiting, and ongoing requests - next request will fetch fresh data');
    
    // Clear any ongoing requests and progress flags
    this.clearOngoingRequests();
    
    // Clear cached weather data and rate limiting from config
    const currentConfig = this.configService.currentConfig;
    if (currentConfig?.user?.weatherWidget) {
      // Use debounced update for cache clearing to prevent rapid API calls
      this.configService.updateWeatherWidgetDebounced({
        lastWeatherUpdate: undefined,
        cachedTemperature: undefined,
        cachedWeatherCode: undefined,
        cachedWeatherDescription: undefined,
        cachedWindSpeed: undefined,
        cachedWindDirection: undefined,
        cachedCity: undefined,
        cachedIsDay: undefined,
        rateLimitedUntil: undefined // Clear rate limiting status
      });
    }
  }

  /**
   * Clear ongoing requests and progress flags without updating config
   */
  clearOngoingRequests(): void {
    this.ongoingWeatherRequest = null;
    this.ongoingGeocodingRequest = null;
    this.isWeatherRequestInProgress = false;
    this.isGeocodingRequestInProgress = false;
    // Reset loading state to prevent stuck loading indicators
    this.isLoadingSubject.next(false);
    console.log('🧹 Cleared ongoing requests, progress flags, and reset loading state');
  }

  /**
   * Get weather description from weather code
   * Based on WMO weather codes: https://open-meteo.com/en/docs
   */
  private getWeatherDescription(code: number): string {
    const weatherCodes: { [key: number]: string } = {
      0: 'Clear sky',
      1: 'Mainly clear',
      2: 'Partly cloudy',
      3: 'Overcast',
      45: 'Fog',
      48: 'Depositing rime fog',
      51: 'Light drizzle',
      53: 'Moderate drizzle',
      55: 'Dense drizzle',
      56: 'Light freezing drizzle',
      57: 'Dense freezing drizzle',
      61: 'Slight rain',
      63: 'Moderate rain',
      65: 'Heavy rain',
      66: 'Light freezing rain',
      67: 'Heavy freezing rain',
      71: 'Slight snow fall',
      73: 'Moderate snow fall',
      75: 'Heavy snow fall',
      77: 'Snow grains',
      80: 'Slight rain showers',
      81: 'Moderate rain showers',
      82: 'Violent rain showers',
      85: 'Slight snow showers',
      86: 'Heavy snow showers',
      95: 'Thunderstorm',
      96: 'Thunderstorm with slight hail',
      99: 'Thunderstorm with heavy hail'
    };
    
    return weatherCodes[code] || 'Unknown';
  }

  /**
   * Get weather icon class based on weather code and time of day
   */
  getWeatherIcon(weatherCode: number, isDay: boolean): string {
    // Basic icon mapping - you can enhance this based on your icon library
    const iconMap: { [key: number]: { day: string; night: string } } = {
      0: { day: 'bi-sun', night: 'bi-moon' },
      1: { day: 'bi-sun', night: 'bi-moon' },
      2: { day: 'bi-cloud-sun', night: 'bi-cloud-moon' },
      3: { day: 'bi-cloud', night: 'bi-cloud' },
      45: { day: 'bi-cloud-fog', night: 'bi-cloud-fog' },
      48: { day: 'bi-cloud-fog', night: 'bi-cloud-fog' },
      51: { day: 'bi-cloud-drizzle', night: 'bi-cloud-drizzle' },
      53: { day: 'bi-cloud-drizzle', night: 'bi-cloud-drizzle' },
      55: { day: 'bi-cloud-rain', night: 'bi-cloud-rain' },
      56: { day: 'bi-cloud-snow', night: 'bi-cloud-snow' },
      57: { day: 'bi-cloud-snow', night: 'bi-cloud-snow' },
      61: { day: 'bi-cloud-rain', night: 'bi-cloud-rain' },
      63: { day: 'bi-cloud-rain-heavy', night: 'bi-cloud-rain-heavy' },
      65: { day: 'bi-cloud-rain-heavy', night: 'bi-cloud-rain-heavy' },
      66: { day: 'bi-cloud-snow', night: 'bi-cloud-snow' },
      67: { day: 'bi-cloud-snow', night: 'bi-cloud-snow' },
      71: { day: 'bi-cloud-snow', night: 'bi-cloud-snow' },
      73: { day: 'bi-cloud-snow', night: 'bi-cloud-snow' },
      75: { day: 'bi-cloud-snow', night: 'bi-cloud-snow' },
      77: { day: 'bi-cloud-snow', night: 'bi-cloud-snow' },
      80: { day: 'bi-cloud-rain', night: 'bi-cloud-rain' },
      81: { day: 'bi-cloud-rain-heavy', night: 'bi-cloud-rain-heavy' },
      82: { day: 'bi-cloud-rain-heavy', night: 'bi-cloud-rain-heavy' },
      85: { day: 'bi-cloud-snow', night: 'bi-cloud-snow' },
      86: { day: 'bi-cloud-snow', night: 'bi-cloud-snow' },
      95: { day: 'bi-cloud-lightning', night: 'bi-cloud-lightning' },
      96: { day: 'bi-cloud-lightning-rain', night: 'bi-cloud-lightning-rain' },
      99: { day: 'bi-cloud-lightning-rain', night: 'bi-cloud-lightning-rain' }
    };
    
    const icons = iconMap[weatherCode];
    if (icons) {
      return isDay ? icons.day : icons.night;
    }
    
    // Default icon
    return isDay ? 'bi-question-circle' : 'bi-question-circle';
  }

  /**
   * Get current weather data
   */
  getCurrentWeatherData(): WeatherInfo | null {
    return this.weatherDataSubject.value;
  }

  /**
   * Get current error
   */
  getCurrentError(): string | null {
    return this.errorSubject.value;
  }

  /**
   * Get loading state
   */
  getIsLoading(): boolean {
    return this.isLoadingSubject.value;
  }
}