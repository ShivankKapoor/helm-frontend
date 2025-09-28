export interface ColorOption {
  name: string;
  value: string;
  bg: string;
  hover: string;
}

export interface ThemeConfig {
  mode: 'light' | 'dark';
}

export interface ColorConfig {
  selectedColor: string; // This will store the color value (e.g., '#1a73e8,#155ab6')
}

export interface QuickLinkConfig {
  id: string; // Unique identifier for each quick link
  enabled: boolean;
  text: string;
  url: string;
  corner: 'top-left' | 'top-right' | 'bottom-left'; // bottom-right reserved for settings
  order: number; // For positioning multiple links in the same corner
}

export interface QuickLinksConfig {
  enabled: boolean; // Global enable/disable for all quick links
  links: QuickLinkConfig[]; // Array of quick links
  maxLinks: number; // Maximum number of links allowed
}

export interface HeroWidgetConfig {
  enabled: boolean; // Global enable/disable for hero widget
  mode: 'clock' | 'greeting' | 'disabled'; // Widget display mode
  clockFormat: '12h' | '24h'; // Clock format preference
  showSeconds: boolean; // Show seconds in clock
  greetingName: string; // Custom name for greeting (empty = use username)
}

export interface UserConfig {
  theme: ThemeConfig;
  color: ColorConfig;
  quickLinks: QuickLinksConfig; // Changed from quickLink to quickLinks
  heroWidget: HeroWidgetConfig; // Hero area widget configuration
  // Future user preferences can go here
  preferences?: {
    language?: string;
    timezone?: string;
    notifications?: boolean;
  };
}

export interface AppConfig {
  user: UserConfig;
  version: string;
  lastUpdated: string;
  userId?: string; // Add userId to track which user this config belongs to
  isGuest: boolean; // Track if this is a guest or authenticated user config
}

// Default color options
export const DEFAULT_COLOR_OPTIONS: ColorOption[] = [
  { name: 'Blue', value: '#1a73e8,#155ab6', bg: '#1a73e8', hover: '#155ab6' },
  { name: 'Yellow', value: '#fbbc05,#c69000', bg: '#fbbc05', hover: '#c69000' },
  { name: 'Green', value: '#34a853,#2e7d32', bg: '#34a853', hover: '#2e7d32' },
  { name: 'Red', value: '#ea4335,#b03a2e', bg: '#ea4335', hover: '#b03a2e' },
  { name: 'Purple', value: '#9B59B6,#6B3F87', bg: '#9B59B6', hover: '#6B3F87' },
  { name: 'Teal', value: '#3B7F70,#0A5F50', bg: '#3B7F70', hover: '#0A5F50' },
  { name: 'Orange', value: '#FF6720,#CC4F00', bg: '#FF6720', hover: '#CC4F00' }
];

// Default configurations
export const DEFAULT_GUEST_CONFIG: AppConfig = {
  user: {
    theme: { mode: 'light' },
    color: { selectedColor: DEFAULT_COLOR_OPTIONS[0].value },
    quickLinks: {
      enabled: false,
      links: [],
      maxLinks: 5
    },
    heroWidget: {
      enabled: true,
      mode: 'greeting',
      clockFormat: '12h',
      showSeconds: false,
      greetingName: ''
    }
  },
  version: '1.0.0',
  lastUpdated: new Date().toISOString(),
  isGuest: true
};

export const DEFAULT_USER_CONFIG: AppConfig = {
  user: {
    theme: { mode: 'light' },
    color: { selectedColor: DEFAULT_COLOR_OPTIONS[0].value },
    quickLinks: {
      enabled: false,
      links: [],
      maxLinks: 5
    },
    heroWidget: {
      enabled: true,
      mode: 'greeting',
      clockFormat: '12h',
      showSeconds: false,
      greetingName: ''
    }
  },
  version: '1.0.0',
  lastUpdated: new Date().toISOString(),
  isGuest: false
};