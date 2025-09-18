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

  constructor(private http: HttpClient) {
    this.loadConfig();
    this.setupStorageListener();
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
   * Load user configuration (placeholder for future API integration)
   */
  private async loadUserConfig(userId: string): Promise<AppConfig> {
    try {
      // TODO: Replace with actual API call to load user config from MongoDB
      // For now, check localStorage for user-specific config
      const userConfigKey = `helm_user_config_${userId}`;
      const savedConfig = localStorage.getItem(userConfigKey);
      if (savedConfig) {
        const parsed = JSON.parse(savedConfig);
        return this.mergeWithDefaults(parsed, { ...DEFAULT_USER_CONFIG, userId, isGuest: false });
      }
    } catch (error) {
      console.error('Error loading user config:', error);
    }
    return { ...DEFAULT_USER_CONFIG, userId, isGuest: false };
  }

  /**
   * Save user configuration (placeholder for future API integration)
   */
  private async saveUserConfig(config: AppConfig): Promise<void> {
    try {
      if (!config.userId) return;
      
      // TODO: Replace with actual API call to save user config to MongoDB
      // For now, save to localStorage with user-specific key
      const userConfigKey = `helm_user_config_${config.userId}`;
      const userConfig = { ...config, isGuest: false };
      localStorage.setItem(userConfigKey, JSON.stringify(userConfig));
    } catch (error) {
      console.error('Error saving user config:', error);
    }
  }

  /**
   * Called when user signs in - load their config and merge with guest preferences
   */
  async onUserSignIn(userId: string): Promise<void> {
    try {
      const currentGuestConfig = this.currentConfig;
      const userConfig = await this.loadUserConfig(userId);
      
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

      this.configSubject.next(mergedConfig);
      await this.saveUserConfig(mergedConfig);
    } catch (error) {
      console.error('Error handling user sign in:', error);
    }
  }

  /**
   * Called when user signs out - save current config to user account and revert to guest mode
   */
  async onUserSignOut(): Promise<void> {
    try {
      const currentConfig = this.currentConfig;
      
      // Save current preferences to user account if they were authenticated
      if (!currentConfig.isGuest && currentConfig.userId) {
        await this.saveUserConfig(currentConfig);
      }

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
          links: config.user?.quickLinks?.links || defaults.user.quickLinks.links
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
   * Debug method to log current localStorage state
   */
  debugLocalStorage(): void {
    console.log('=== Configuration Debug Info ===');
    console.log('Current config:', this.currentConfig);
    console.log('Guest config in localStorage:', localStorage.getItem(this.GUEST_CONFIG_KEY));
    console.log('Legacy config in localStorage:', localStorage.getItem(this.OLD_CONFIG_KEY));
    console.log('All localStorage keys:', Object.keys(localStorage));
  }
}