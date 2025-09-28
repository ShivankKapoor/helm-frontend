import { Injectable, inject } from '@angular/core';
import { Meta, Title } from '@angular/platform-browser';

@Injectable({
  providedIn: 'root'
})
export class SeoService {
  private meta = inject(Meta);
  private titleService = inject(Title);

  updateTitle(title: string) {
    this.titleService.setTitle(title);
  }

  updateMetaDescription(description: string) {
    this.meta.updateTag({ name: 'description', content: description });
  }

  updateMetaKeywords(keywords: string) {
    this.meta.updateTag({ name: 'keywords', content: keywords });
  }

  updateOgTags(data: {
    title?: string;
    description?: string;
    image?: string;
    url?: string;
    type?: string;
  }) {
    if (data.title) {
      this.meta.updateTag({ property: 'og:title', content: data.title });
      this.meta.updateTag({ property: 'twitter:title', content: data.title });
    }
    
    if (data.description) {
      this.meta.updateTag({ property: 'og:description', content: data.description });
      this.meta.updateTag({ property: 'twitter:description', content: data.description });
    }
    
    if (data.image) {
      this.meta.updateTag({ property: 'og:image', content: data.image });
      this.meta.updateTag({ property: 'twitter:image', content: data.image });
    }
    
    if (data.url) {
      this.meta.updateTag({ property: 'og:url', content: data.url });
      this.meta.updateTag({ property: 'twitter:url', content: data.url });
    }
    
    if (data.type) {
      this.meta.updateTag({ property: 'og:type', content: data.type });
    }
  }

  updateCanonicalUrl(url: string) {
    // Remove existing canonical link
    const existingLink = document.querySelector('link[rel="canonical"]');
    if (existingLink) {
      existingLink.remove();
    }
    
    // Add new canonical link
    const link = document.createElement('link');
    link.rel = 'canonical';
    link.href = url;
    document.head.appendChild(link);
  }

  addJsonLd(data: any) {
    const script = document.createElement('script');
    script.type = 'application/ld+json';
    script.text = JSON.stringify(data);
    document.head.appendChild(script);
  }

  setThemeColor(color: string) {
    this.meta.updateTag({ name: 'theme-color', content: color });
    this.meta.updateTag({ name: 'msapplication-navbutton-color', content: color });
    this.meta.updateTag({ name: 'apple-mobile-web-app-status-bar-style', content: color });
  }

  // Method to update SEO based on current state
  updateSeoForCurrentState(config?: any) {
    const baseTitle = 'HelmSeek';
    const baseDescription = 'Helm is a powerful, customizable search dashboard with quick links, theme switching, and cloud sync. Streamline your browsing experience with personalized shortcuts and beautiful themes.';
    
    // Update title - keep it simple as "HelmSeek"
    this.updateTitle(baseTitle);
    this.updateMetaDescription(baseDescription);
    
    // Update theme color based on current theme
    const currentTheme = document.documentElement.style.getPropertyValue('--button-bg') || '#1a73e8';
    this.setThemeColor(currentTheme);
  }
}