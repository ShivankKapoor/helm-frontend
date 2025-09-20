import { Injectable, signal, Inject, forwardRef } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, BehaviorSubject, of } from 'rxjs';
import { catchError, tap } from 'rxjs/operators';
import { AppConfig, DEFAULT_GUEST_CONFIG, DEFAULT_USER_CONFIG, UserConfig, QuickLinkConfig, QuickLinksConfig } from '../models/config.model';

@Injectable({
  providedIn: 'root'
})
export class ConfigService {
  private readonly GUEST_CONFIG_KEY = 'helm_guest_config';
  private readonly OLD_CONFIG_KEY = 'helm_app_config'; // Legacy key
  private readonly CONFIG_FILE_PATH = '/assets/config.json';
  
  private configSubject = new BehaviorSubject<AppConfig>(DEFAULT_GUEST_CONFIG);
  private isInitialized = signal(false);
  
  public config$ = this.configSubject.asObservable();
  private accountService: any; // Will be set after construction to avoid circular dependency

  constructor(private http: HttpClient) {
    this.loadConfig();
    this.setupStorageListener();
  }

  /**
   * Check if user has an existing session and restore authenticated state
   */
  async checkExistingSession(): Promise<void> {
    if (!this.accountService) {
      console.warn('AccountService not available for session check');
      return;
    }

    try {
      // Check if there's a session token
      const hasToken = this.accountService.isAuthenticated();
      console.log('Checking existing session - has token:', hasToken);
      
      if (hasToken) {
        // Try to get user data to verify session is still valid
        const response = await this.accountService.getUserData().toPromise();
        console.log('Session validation response:', response);
        
        if (response?.success && response.userId) {
          console.log('Valid session found, restoring user state and syncing config for userId:', response.userId);
          // Set user as authenticated locally
          this.setUserAuthenticated(response.userId);
          
          // Automatically sync config from server on session restore
          try {
            const syncSuccess = await this.syncFromServer();
            if (syncSuccess) {
              console.log('Successfully synced config from server during session restore');
            } else {
              console.warn('Failed to sync config from server during session restore');
            }
          } catch (syncError) {
            console.warn('Error syncing config from server during session restore:', syncError);
          }
        } else {
          console.warn('Invalid session, clearing tokens');
          this.accountService.forceLogout();
        }
      }
    } catch (error) {
      console.error('Error checking existing session:', error);
      // If there's an error, clear any invalid tokens
      this.accountService.forceLogout();
    }
  }

  /**
   * Set AccountService reference after injection to avoid circular dependency
   */
  setAccountService(accountService: any): void {
    this.accountService = accountService;
    // Check for existing session after AccountService is available
    this.checkExistingSession();
  }

  /**
   * Transform backend Key-Value array format to proper JSON object
   */
  private transformBackendData(data: any): any {
    if (!data) return null;
    
    // If it's already a proper object, return as-is
    if (typeof data === 'object' && !Array.isArray(data) && !data.Key) {
      return data;
    }
    
    // If it's a Key-Value array, transform it
    if (Array.isArray(data)) {
      // Special case: if this is a double-wrapped array (like quickLinks.links)
      // where the outer array contains a single inner array of Key-Value objects
      if (data.length === 1 && Array.isArray(data[0])) {
        console.log('Detected double-wrapped array structure');
        // Check if the inner array contains Key-Value objects that represent a single item
        if (data[0].length > 0 && data[0][0].Key !== undefined) {
          console.log('Inner array contains Key-Value objects, transforming to single array item...');
          // Transform the Key-Value pairs into a single object, then wrap in array
          const transformedItem = this.transformBackendData(data[0]);
          return [transformedItem];  // Return as array with one item
        } else {
          console.log('Inner array contains regular objects, unwrapping...');
          return data[0];
        }
      }
      
      // Check if this is an array of Key-Value objects (normal case)
      if (data.length > 0 && data[0].Key !== undefined) {
        const result: any = {};
        for (const item of data) {
          if (item.Key && item.Value !== undefined) {
            // Recursively transform nested structures
            result[item.Key] = this.transformBackendData(item.Value);
          }
        }
        return result;
      }
      
      // If it's an array of regular objects, transform each one
      return data.map(item => this.transformBackendData(item));
    }
    
    // If it's a single Key-Value object, extract the Value
    if (data.Key && data.Value !== undefined) {
      return this.transformBackendData(data.Value);
    }
    
    // Return primitive values as-is
    return data;
  }

  /**
   * Set up listener for localStorage changes (for dev tools editing)
   */
  private setupStorageListener(): void {
    if (typeof window !== 'undefined') {
      // Listen for storage events from other tabs/windows
      window.addEventListener('storage', (event) => {
        if (event.key === this.GUEST_CONFIG_KEY || event.key === this.OLD_CONFIG_KEY) {
          console.log('Configuration changed externally, reloading...');
          this.reloadConfig();
        }
      });

      // Add periodic checking for localStorage changes (for same-window changes)
      setInterval(() => {
        this.checkForExternalChanges();
      }, 1000);

      // Expose reload method globally for easy dev tools access
      (window as any).reloadConfig = () => this.reloadConfig();
      (window as any).debugConfig = () => this.debugLocalStorage();
    }
  }

  /**
   * Check if localStorage has been modified externally
   */
  private lastKnownConfigHash?: string;
  
  private checkForExternalChanges(): void {
    try {
      const currentConfigStr = localStorage.getItem(this.GUEST_CONFIG_KEY) || 
                               localStorage.getItem(this.OLD_CONFIG_KEY);
      
      if (currentConfigStr) {
        const currentHash = this.simpleHash(currentConfigStr);
        if (this.lastKnownConfigHash && this.lastKnownConfigHash !== currentHash) {
          console.log('LocalStorage configuration changed, reloading...');
          this.reloadConfig();
        }
        this.lastKnownConfigHash = currentHash;
      }
    } catch (error) {
      // Ignore errors in periodic check
    }
  }

  /**
   * Simple hash function for change detection
   */
  private simpleHash(str: string): string {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32bit integer
    }
    return hash.toString();
  }

  /**
   * Reload configuration from storage
   */
  reloadConfig(): void {
    try {
      const guestConfig = this.loadGuestConfig();
      this.configSubject.next(guestConfig);
      
      // Update the hash to prevent immediate re-trigger
      const configStr = localStorage.getItem(this.GUEST_CONFIG_KEY) || 
                       localStorage.getItem(this.OLD_CONFIG_KEY);
      if (configStr) {
        this.lastKnownConfigHash = this.simpleHash(configStr);
      }
      
      console.log('Configuration reloaded:', guestConfig);
    } catch (error) {
      console.error('Error reloading config:', error);
    }
  }

  get isReady(): boolean {
    return this.isInitialized();
  }

  get currentConfig(): AppConfig {
    return this.configSubject.value;
  }

  /**
   * Load configuration - starts with guest configuration
   */
  private loadConfig(): void {
    try {
      // Load guest configuration from localStorage or defaults
      const guestConfig = this.loadGuestConfig();
      this.configSubject.next(guestConfig);
      this.isInitialized.set(true);
      
      // Initialize hash for change detection
      const configStr = localStorage.getItem(this.GUEST_CONFIG_KEY) || 
                       localStorage.getItem(this.OLD_CONFIG_KEY);
      if (configStr) {
        this.lastKnownConfigHash = this.simpleHash(configStr);
      }
    } catch (error) {
      console.warn('Failed to load config, using defaults:', error);
      this.configSubject.next(DEFAULT_GUEST_CONFIG);
      this.isInitialized.set(true);
    }
  }

  /**
   * Load guest configuration from localStorage
   */
  private loadGuestConfig(): AppConfig {
    try {
      // First try the new key
      let savedConfig = localStorage.getItem(this.GUEST_CONFIG_KEY);
      
      // If not found, try the legacy key and migrate
      if (!savedConfig) {
        savedConfig = localStorage.getItem(this.OLD_CONFIG_KEY);
        if (savedConfig) {
          console.log('Migrating configuration from legacy key');
          // Migrate to new key
          const parsed = JSON.parse(savedConfig);
          const migratedConfig = this.mergeWithDefaults(parsed, DEFAULT_GUEST_CONFIG);
          this.saveGuestConfig(migratedConfig);
          // Remove old key
          localStorage.removeItem(this.OLD_CONFIG_KEY);
          return migratedConfig;
        }
      }
      
      if (savedConfig) {
        const parsed = JSON.parse(savedConfig);
        // Merge with defaults to ensure all properties exist
        return this.mergeWithDefaults(parsed, DEFAULT_GUEST_CONFIG);
      }
    } catch (error) {
      console.warn('Failed to parse guest config from localStorage:', error);
    }
    return DEFAULT_GUEST_CONFIG;
  }

  /**
   * Save guest configuration to localStorage
   */
  private saveGuestConfig(config: AppConfig): void {
    try {
      const guestConfig = { ...config, isGuest: true, userId: undefined };
      localStorage.setItem(this.GUEST_CONFIG_KEY, JSON.stringify(guestConfig));
    } catch (error) {
      console.error('Failed to save guest config to localStorage:', error);
    }
  }

  /**
   * Load user configuration from API
   */
  private async loadUserConfig(userId: string): Promise<AppConfig> {
    try {
      // Load from API using AccountService
      const response = await this.accountService.getUserData().toPromise();
      if (response?.success && response.data) {
        // Transform backend Key-Value format to proper JSON
        const transformedData = this.transformBackendData(response.data);
        console.log('Loaded user config from API (transformed):', transformedData);
        
        const mergedConfig = this.mergeWithDefaults(transformedData, { ...DEFAULT_USER_CONFIG, userId, isGuest: false });
        return mergedConfig;
      }
    } catch (error) {
      console.error('Error loading user config from API:', error);
      
      // Fallback to localStorage
      try {
        const userConfigKey = `helm_user_config_${userId}`;
        const savedConfig = localStorage.getItem(userConfigKey);
        if (savedConfig) {
          const parsed = JSON.parse(savedConfig);
          return this.mergeWithDefaults(parsed, { ...DEFAULT_USER_CONFIG, userId, isGuest: false });
        }
      } catch (localError) {
        console.error('Error loading user config from localStorage:', localError);
      }
    }
    return { ...DEFAULT_USER_CONFIG, userId, isGuest: false };
  }

  /**
   * Save user configuration to API
   */
  private async saveUserConfig(config: AppConfig): Promise<void> {
    try {
      if (!config.userId) return;
      
      // Prepare payload for API - send only the data structure, not meta fields
      const payload = {
        user: config.user,
        version: config.version,
        lastUpdated: config.lastUpdated,
        isGuest: false
      };
      
      console.log('Saving user config to API with payload:', payload);
      
      // Save to API using AccountService
      await this.accountService.updateUserData(payload).toPromise();
      
      // For authenticated users, we DON'T save to the guest config localStorage key
      // Instead, save to user-specific key as backup
      const userConfigKey = `helm_user_config_${config.userId}`;
      const userConfig = { ...config, isGuest: false };
      localStorage.setItem(userConfigKey, JSON.stringify(userConfig));
      
      console.log('User config saved to API and localStorage backup:', userConfigKey);
    } catch (error) {
      console.error('Error saving user config to API:', error);
      
      // Fallback to localStorage only
      try {
        if (config.userId) {
          const userConfigKey = `helm_user_config_${config.userId}`;
          const userConfig = { ...config, isGuest: false };
          localStorage.setItem(userConfigKey, JSON.stringify(userConfig));
          console.log('User config saved to localStorage fallback:', userConfigKey);
        }
      } catch (localError) {
        console.error('Error saving user config to localStorage:', localError);
      }
    }
  }

  /**
   * Called when user signs in - load their config and merge with guest preferences
   */
  async onUserSignIn(userId: string): Promise<void> {
    try {
      console.log('onUserSignIn called with userId:', userId);
      const currentGuestConfig = this.currentConfig;
      console.log('Current guest config before sign in:', currentGuestConfig);
      
      const userConfig = await this.loadUserConfig(userId);
      console.log('Loaded user config:', userConfig);
      
      // Merge guest preferences with user config (guest preferences take precedence for this session)
      const mergedConfig: AppConfig = {
        ...userConfig,
        user: {
          ...userConfig.user,
          theme: currentGuestConfig.user.theme, // Keep current theme preference
          color: currentGuestConfig.user.color, // Keep current color preference
        },
        userId,
        isGuest: false,
        lastUpdated: new Date().toISOString()
      };

      console.log('Final merged config after sign in:', mergedConfig);
      this.configSubject.next(mergedConfig);
      await this.saveUserConfig(mergedConfig);
      console.log('User sign in completed. Current config is now:', this.currentConfig);
    } catch (error) {
      console.error('Error handling user sign in:', error);
    }
  }

  /**
   * Called when user signs out - save current config to user account and revert to guest mode
   */
  async onUserSignOut(): Promise<void> {
    try {
      // No syncing to server on logout - just switch to guest mode
      console.log('User signing out - switching to guest mode');

      // Load guest configuration
      const guestConfig = this.loadGuestConfig();
      this.configSubject.next(guestConfig);
    } catch (error) {
      console.error('Error handling user sign out:', error);
      this.configSubject.next(DEFAULT_GUEST_CONFIG);
    }
  }

  /**
   * Merge configuration with defaults to ensure all required properties exist
   */
  private mergeWithDefaults(config: Partial<AppConfig>, defaults: AppConfig): AppConfig {
    const merged = {
      ...defaults,
      ...config,
      user: {
        ...defaults.user,
        ...config.user,
        theme: {
          ...defaults.user.theme,
          ...config.user?.theme
        },
        color: {
          ...defaults.user.color,
          ...config.user?.color
        },
        quickLinks: {
          ...defaults.user.quickLinks,
          ...config.user?.quickLinks,
          links: Array.isArray(config.user?.quickLinks?.links) 
            ? config.user.quickLinks.links 
            : defaults.user.quickLinks.links
        }
      }
    };

    // Migrate any bottom-right links to top-right (reserved for settings)
    if (merged.user.quickLinks.links.length > 0) {
      merged.user.quickLinks.links = merged.user.quickLinks.links.map(link => {
        if ((link.corner as string) === 'bottom-right') {
          console.log(`Migrating quick link "${link.text}" from bottom-right to top-right (reserved for settings)`);
          return { ...link, corner: 'top-right' as const };
        }
        return link;
      });
    }

    return merged;
  }

  /**
   * Update user configuration
   */
  updateUserConfig(updates: Partial<UserConfig>): void {
    const currentConfig = this.currentConfig;
    const updatedConfig: AppConfig = {
      ...currentConfig,
      user: {
        ...currentConfig.user,
        ...updates,
      },
      lastUpdated: new Date().toISOString()
    };

    this.configSubject.next(updatedConfig);
    this.saveConfig(updatedConfig);
    
    // Update hash for change detection
    const configStr = localStorage.getItem(this.GUEST_CONFIG_KEY) || 
                     localStorage.getItem(`helm_user_config_${updatedConfig.userId}`);
    if (configStr) {
      this.lastKnownConfigHash = this.simpleHash(configStr);
    }
  }

  /**
   * Update theme configuration
   */
  updateTheme(mode: 'light' | 'dark'): void {
    this.updateUserConfig({
      theme: { mode }
    });
  }

  /**
   * Update color configuration
   */
  updateColor(selectedColor: string): void {
    this.updateUserConfig({
      color: { selectedColor }
    });
  }

  /**
   * Update quick links configuration
   */
  updateQuickLinks(quickLinks: QuickLinksConfig): void {
    this.updateUserConfig({
      quickLinks
    });
  }

  /**
   * Add a new quick link
   */
  addQuickLink(linkData: Omit<QuickLinkConfig, 'id' | 'order'>): void {
    const currentConfig = this.currentConfig;
    const currentLinks = currentConfig.user.quickLinks.links;
    
    // Check if we've reached the maximum
    if (currentLinks.length >= currentConfig.user.quickLinks.maxLinks) {
      console.warn(`Cannot add more quick links. Maximum of ${currentConfig.user.quickLinks.maxLinks} reached.`);
      return;
    }

    // Prevent bottom-right placement (reserved for settings)
    if ((linkData.corner as string) === 'bottom-right') {
      console.warn('Bottom-right corner is reserved for settings. Defaulting to top-right.');
      linkData = { ...linkData, corner: 'top-right' };
    }

    // Generate unique ID
    const id = 'ql_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
    
    // Calculate order (for positioning multiple links in same corner)
    const sameCornerLinks = currentLinks.filter(link => link.corner === linkData.corner);
    const order = sameCornerLinks.length;

    const newLink: QuickLinkConfig = {
      ...linkData,
      id,
      order
    };

    const updatedQuickLinks: QuickLinksConfig = {
      ...currentConfig.user.quickLinks,
      links: [...currentLinks, newLink]
    };

    this.updateQuickLinks(updatedQuickLinks);
  }

  /**
   * Update an existing quick link
   */
  updateQuickLink(id: string, updates: Partial<Omit<QuickLinkConfig, 'id'>>): void {
    const currentConfig = this.currentConfig;
    const currentLinks = currentConfig.user.quickLinks.links;
    
    const linkIndex = currentLinks.findIndex(link => link.id === id);
    if (linkIndex === -1) {
      console.warn(`Quick link with id ${id} not found`);
      return;
    }

    const updatedLinks = [...currentLinks];
    updatedLinks[linkIndex] = { ...updatedLinks[linkIndex], ...updates };

    // If corner changed, recalculate order for the new corner
    if (updates.corner && updates.corner !== currentLinks[linkIndex].corner) {
      const sameCornerLinks = updatedLinks.filter(link => 
        link.corner === updates.corner && link.id !== id
      );
      updatedLinks[linkIndex].order = sameCornerLinks.length;
    }

    const updatedQuickLinks: QuickLinksConfig = {
      ...currentConfig.user.quickLinks,
      links: updatedLinks
    };

    this.updateQuickLinks(updatedQuickLinks);
  }

  /**
   * Remove a quick link
   */
  removeQuickLink(id: string): void {
    const currentConfig = this.currentConfig;
    const currentLinks = currentConfig.user.quickLinks.links;
    
    const linkToRemove = currentLinks.find(link => link.id === id);
    if (!linkToRemove) {
      console.warn(`Quick link with id ${id} not found`);
      return;
    }

    // Filter out the link and reorder remaining links in the same corner
    const updatedLinks = currentLinks
      .filter(link => link.id !== id)
      .map(link => {
        if (link.corner === linkToRemove.corner && link.order > linkToRemove.order) {
          return { ...link, order: link.order - 1 };
        }
        return link;
      });

    const updatedQuickLinks: QuickLinksConfig = {
      ...currentConfig.user.quickLinks,
      links: updatedLinks
    };

    this.updateQuickLinks(updatedQuickLinks);
  }

  /**
   * Toggle quick links enabled state
   */
  toggleQuickLinks(enabled: boolean): void {
    const currentConfig = this.currentConfig;
    const updatedQuickLinks: QuickLinksConfig = {
      ...currentConfig.user.quickLinks,
      enabled
    };
    this.updateQuickLinks(updatedQuickLinks);
  }

  /**
   * Get quick links for a specific corner, sorted by order
   */
  getQuickLinksForCorner(corner: QuickLinkConfig['corner']): QuickLinkConfig[] {
    const currentConfig = this.currentConfig;
    return currentConfig.user.quickLinks.links
      .filter(link => link.corner === corner && link.enabled)
      .sort((a, b) => a.order - b.order);
  }

  /**
   * Save configuration based on user state
   */
  private saveConfig(config: AppConfig): void {
    if (config.isGuest) {
      this.saveGuestConfig(config);
    } else if (config.userId) {
      this.saveUserConfig(config);
    }
  }

  /**
   * Save config to localStorage only (no API call)
   */
  private saveConfigLocalOnly(config: AppConfig): void {
    if (config.isGuest) {
      this.saveGuestConfig(config);
    } else if (config.userId) {
      // Save to localStorage only, do not call API
      const userConfigKey = `helm_user_config_${config.userId}`;
      localStorage.setItem(userConfigKey, JSON.stringify(config));
      console.log('User config saved to localStorage only:', userConfigKey);
    }
  }

  /**
   * Reset configuration to defaults
   */
  resetToDefaults(): void {
    const defaultConfig = this.currentConfig.isGuest ? DEFAULT_GUEST_CONFIG : DEFAULT_USER_CONFIG;
    const resetConfig = {
      ...defaultConfig,
      userId: this.currentConfig.userId,
      isGuest: this.currentConfig.isGuest,
      lastUpdated: new Date().toISOString()
    };
    
    this.configSubject.next(resetConfig);
    this.saveConfig(resetConfig);
  }

  /**
   * Export current configuration as JSON string
   */
  exportConfig(): string {
    return JSON.stringify(this.currentConfig, null, 2);
  }

  /**
   * Import configuration from JSON string
   */
  importConfig(configJson: string): boolean {
    try {
      const config = JSON.parse(configJson);
      const mergedConfig = this.mergeWithDefaults(config, this.currentConfig);
      this.configSubject.next(mergedConfig);
      this.saveConfig(mergedConfig);
      return true;
    } catch (error) {
      console.error('Failed to import config:', error);
      return false;
    }
  }

  /**
   * Clear all stored configuration (useful for development/testing)
   */
  clearStoredConfig(): void {
    localStorage.removeItem(this.GUEST_CONFIG_KEY);
    localStorage.removeItem(this.OLD_CONFIG_KEY); // Also clear legacy key
    // Note: User configs are preserved in localStorage for now
    this.configSubject.next(DEFAULT_GUEST_CONFIG);
  }

  /**
   * Force reload configuration from localStorage (useful for debugging)
   */
  forceReload(): void {
    console.log('Force reloading configuration...');
    this.reloadConfig();
  }

  /**
   * Sync current configuration to the server
   */
  async syncToServer(): Promise<boolean> {
    try {
      console.log('syncToServer: Overwriting server config with local config');
      
      if (!this.accountService || !this.accountService.isAuthenticated()) {
        console.warn('Cannot sync: No valid session token found');
        return false;
      }

      const currentConfig = this.currentConfig;
      console.log('Overwriting server with local config:', currentConfig);

      // Prepare payload - send only the data structure, not the meta fields
      const payload = {
        user: currentConfig.user,
        version: currentConfig.version,
        lastUpdated: new Date().toISOString(),
        isGuest: false
      };

      console.log('Overwriting server config with payload:', payload);
      await this.accountService.updateUserData(payload).toPromise();
      console.log('Server config overwritten successfully');
      return true;
    } catch (error) {
      console.error('Failed to overwrite server configuration:', error);
      return false;
    }
  }

  /**
   * Load configuration from the server and apply it locally
   */
  async syncFromServer(): Promise<boolean> {
    try {
      console.log('syncFromServer: Overwriting local config with server config');
      
      if (!this.accountService || !this.accountService.isAuthenticated()) {
        console.warn('Cannot sync: No valid session token found');
        return false;
      }

      const response = await this.accountService.getUserData().toPromise();
      console.log('Raw response from server:', response);
      
      if (response?.success && response.data) {
        console.log('Server data received (raw):', response.data);
        
        // Transform the backend Key-Value array format to proper JSON
        console.log('=== TRANSFORMATION DEBUG START ===');
        console.log('Raw server data:', JSON.stringify(response.data, null, 2));
        
        const transformedData = this.transformBackendData(response.data);
        console.log('Server data after transformation:', JSON.stringify(transformedData, null, 2));
        console.log('QuickLinks data specifically:', transformedData.user?.quickLinks);
        console.log('QuickLinks links array:', transformedData.user?.quickLinks?.links);
        console.log('QuickLinks links type:', typeof transformedData.user?.quickLinks?.links);
        console.log('QuickLinks links isArray:', Array.isArray(transformedData.user?.quickLinks?.links));
        console.log('=== TRANSFORMATION DEBUG END ===');
        
        // Create clean server config - overwrite everything
        const serverConfig = {
          user: transformedData.user || {
            theme: { mode: 'light' },
            color: { selectedColor: '#1a73e8,#155ab6' },
            quickLinks: { enabled: false, links: [], maxLinks: 5 }
          },
          version: transformedData.version || '1.0.0',
          lastUpdated: new Date().toISOString(),
          userId: response.userId || 'unknown',
          isGuest: false
        };
        
        console.log('=== SERVER CONFIG DEBUG ===');
        console.log('Server config before merging:', JSON.stringify(serverConfig, null, 2));
        console.log('Server config quickLinks:', serverConfig.user?.quickLinks);
        
        // Ensure proper structure with defaults for missing properties
        const finalConfig = this.mergeWithDefaults(serverConfig, {
          user: {
            theme: { mode: 'light' },
            color: { selectedColor: '#1a73e8,#155ab6' },
            quickLinks: { enabled: false, links: [], maxLinks: 5 }
          },
          version: '1.0.0',
          lastUpdated: new Date().toISOString(),
          userId: response.userId || 'unknown',
          isGuest: false
        });
        
        // Overwrite local config completely
        console.log('=== FINAL CONFIG DEBUG ===');
        console.log('Final config after merging:', JSON.stringify(finalConfig, null, 2));
        console.log('Final config quickLinks:', finalConfig.user?.quickLinks);
        console.log('Final config quickLinks links:', finalConfig.user?.quickLinks?.links);
        
        this.configSubject.next(finalConfig);
        this.saveConfigLocalOnly(finalConfig);  // Only save to localStorage, no API call
        
        console.log('Config saved to localStorage with key:', `helm_user_config_${finalConfig.userId}`);
        console.log('Saved config in localStorage:', localStorage.getItem(`helm_user_config_${finalConfig.userId}`));
        
        // Update hash for change detection
        const configStr = JSON.stringify(finalConfig);
        this.lastKnownConfigHash = this.simpleHash(configStr);
        
        console.log('Local config overwritten with server config successfully');
        return true;
      } else {
        console.warn('No configuration data found on server. Response:', response);
        return false;
      }
    } catch (error) {
      console.error('Failed to overwrite local config with server config:', error);
      return false;
    }
  }



  /**
   * Debug method to log current localStorage state
   */
  debugLocalStorage(): void {
    console.log('=== Configuration Debug Info ===');
    console.log('Current config:', this.currentConfig);
    console.log('Is Guest:', this.currentConfig.isGuest);
    console.log('User ID:', this.currentConfig.userId);
    console.log('Guest config in localStorage:', localStorage.getItem(this.GUEST_CONFIG_KEY));
    console.log('Legacy config in localStorage:', localStorage.getItem(this.OLD_CONFIG_KEY));
    
    if (this.currentConfig.userId) {
      const userConfigKey = `helm_user_config_${this.currentConfig.userId}`;
      console.log(`User config (${userConfigKey}) in localStorage:`, localStorage.getItem(userConfigKey));
    }
    
    console.log('All localStorage keys containing "helm":', 
      Object.keys(localStorage).filter(key => key.includes('helm')));
    console.log('Config subject current value:', this.configSubject.value);
    console.log('Last known hash:', this.lastKnownConfigHash);
  }

  /**
   * Test the backend data transformation
   */
  testTransformation(): void {
    const testBackendData = [
      {"Key":"version","Value":"1.0.0"},
      {"Key":"lastUpdated","Value":"2025-09-20T19:51:25.332Z"},
      {"Key":"isGuest","Value":false},
      {"Key":"user","Value":[
        {"Key":"color","Value":[{"Key":"selectedColor","Value":"#34a853,#2e7d32"}]},
        {"Key":"quickLinks","Value":[
          {"Key":"enabled","Value":false},
          {"Key":"links","Value":[]},
          {"Key":"maxLinks","Value":5}
        ]},
        {"Key":"theme","Value":[{"Key":"mode","Value":"light"}]}
      ]}
    ];
    
    console.log('Test backend data:', testBackendData);
    const transformed = this.transformBackendData(testBackendData);
    console.log('Transformed data:', transformed);
    return transformed;
  }

  /**
   * Debug authentication state - call this from console to check auth status
   */
  debugAuthState(): void {
    console.log('=== Authentication Debug Info ===');
    console.log('Current config:', this.currentConfig);
    console.log('Is Guest:', this.currentConfig.isGuest);
    console.log('User ID:', this.currentConfig.userId);
    console.log('Has AccountService:', !!this.accountService);
    
    if (this.accountService) {
      console.log('AccountService isAuthenticated():', this.accountService.isAuthenticated?.());
      console.log('AccountService session token:', this.accountService.getSessionToken?.() || 'No method available');
    }
    
    console.log('Config subject value:', this.configSubject.value);
    console.log('Can sync to server:', !this.currentConfig.isGuest && !!this.currentConfig.userId);
  }

  /**
   * Manually restore session - call this from console if session is lost
   */
  async restoreSession(): Promise<boolean> {
    console.log('Manually restoring session...');
    await this.checkExistingSession();
    return !this.currentConfig.isGuest && !!this.currentConfig.userId;
  }

  /**
   * Set user as authenticated with default config (without syncing to server)
   */
  setUserAuthenticated(userId: string): void {
    const currentConfig = this.currentConfig;
    const authenticatedConfig: AppConfig = {
      ...currentConfig,
      userId,
      isGuest: false,
      lastUpdated: new Date().toISOString()
    };
    
    console.log('Setting user as authenticated with userId:', userId);
    this.configSubject.next(authenticatedConfig);
    this.saveConfigLocalOnly(authenticatedConfig);  // Only save to localStorage, no API call
  }
}