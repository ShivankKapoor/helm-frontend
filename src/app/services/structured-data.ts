export interface StructuredData {
  '@context': string;
  '@type': string;
  [key: string]: any;
}

export const STRUCTURED_DATA = {
  WEBSITE: {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    'name': 'Helm Dashboard',
    'description': 'A powerful, customizable search dashboard with quick links, theme switching, and cloud sync',
    'url': 'https://helmseek.com',
    'potentialAction': {
      '@type': 'SearchAction',
      'target': 'https://www.google.com/search?q={search_term_string}',
      'query-input': 'required name=search_term_string'
    }
  },

  WEB_APPLICATION: {
    '@context': 'https://schema.org',
    '@type': 'WebApplication',
    'name': 'Helm Dashboard',
    'description': 'A powerful, customizable search dashboard with quick links, theme switching, and cloud sync',
    'url': 'https://helmseek.com',
    'applicationCategory': 'ProductivityApplication',
    'operatingSystem': 'Web Browser',
    'browserRequirements': 'Requires JavaScript',
    'author': {
      '@type': 'Organization',
      'name': 'Helm Dashboard'
    },
    'offers': {
      '@type': 'Offer',
      'price': '0',
      'priceCurrency': 'USD'
    },
    'featureList': [
      'Customizable search interface',
      'Quick links management',
      'Theme switching (Light/Dark)',
      'Cloud configuration sync',
      'Responsive design',
      'Keyboard shortcuts'
    ]
  },

  ORGANIZATION: {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    'name': 'Helm Dashboard',
    'description': 'Creators of the Helm search dashboard application',
    'url': 'https://helmseek.com',
    'logo': 'https://helmseek.com/assets/logo.png',
    'sameAs': [
      'https://github.com/ShivankKapoor/helm-frontend'
    ]
  }
} as const;