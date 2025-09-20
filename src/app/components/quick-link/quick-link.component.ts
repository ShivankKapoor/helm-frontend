import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Subscription } from 'rxjs';
import { ConfigService } from '../../services/config.service';
import { QuickLinkConfig, QuickLinksConfig } from '../../models/config.model';

@Component({
  selector: 'app-quick-link',
  standalone: true,
  imports: [CommonModule],
  template: `
    <!-- Top Left Corner -->
    <div class="quick-links-corner top-left">
      @for (link of getLinksForCorner('top-left'); track link.id) {
        <a 
          [href]="link.url"
          [class]="'quick-link quick-link-top-left'"
          target="_blank"
          rel="noopener noreferrer"
          [title]="link.url"
        >
          {{ link.text }}
        </a>
      }
    </div>

    <!-- Top Right Corner -->
    <div class="quick-links-corner top-right">
      @for (link of getLinksForCorner('top-right'); track link.id) {
        <a 
          [href]="link.url"
          [class]="'quick-link quick-link-top-right'"
          target="_blank"
          rel="noopener noreferrer"
          [title]="link.url"
        >
          {{ link.text }}
        </a>
      }
    </div>

    <!-- Bottom Left Corner -->
    <div class="quick-links-corner bottom-left">
      @for (link of getLinksForCorner('bottom-left'); track link.id) {
        <a 
          [href]="link.url"
          [class]="'quick-link quick-link-bottom-left'"
          target="_blank"
          rel="noopener noreferrer"
          [title]="link.url"
        >
          {{ link.text }}
        </a>
      }
    </div>

    <!-- Bottom Right Corner: Reserved for Settings & Account -->
  `,
  styles: [`
    .quick-links-corner {
      position: fixed;
      z-index: 1000;
      display: flex;
      flex-direction: row;
      gap: 8px;
      flex-wrap: wrap;
    }
    
    .quick-links-corner.top-left {
      top: 20px;
      left: 20px;
    }
    
    .quick-links-corner.top-right {
      top: 20px;
      right: 20px;
    }
    
    .quick-links-corner.bottom-left {
      bottom: 20px;
      left: 20px;
    }
    
    .quick-links-corner.bottom-right {
      bottom: 20px;
      right: 20px;
    }
    
    .quick-link {
      padding: 4px 6px;
      background: transparent;
      color: var(--text-color, #000);
      text-decoration: none;
      font-size: 15px;
      font-weight: 400;
      font-family: 'Fira Code', 'SF Mono', Monaco, Inconsolata, 'Roboto Mono', Consolas, 'Courier New', monospace;
      transition: all 0.2s ease;
      border-radius: 2px;
      display: block;
    }
    
    .quick-link:hover {
      color: var(--text-color, #000);
      text-decoration: underline;
      background: rgba(0, 0, 0, 0.04);
    }
    
    .quick-link:active {
      background: rgba(0, 0, 0, 0.08);
    }
    
    /* Responsive adjustments */
    @media (max-width: 768px) {
      .quick-links-corner.top-left,
      .quick-links-corner.top-right {
        top: 15px;
      }
      
      .quick-links-corner.top-left,
      .quick-links-corner.bottom-left {
        left: 15px;
      }
      
      .quick-links-corner.top-right,
      .quick-links-corner.bottom-right {
        right: 15px;
      }
      
      .quick-links-corner.bottom-left,
      .quick-links-corner.bottom-right {
        bottom: 15px;
      }
      
      .quick-link {
        font-size: 13px;
        padding: 3px 5px;
      }
    }
    
    /* Dark mode adjustments - white text like Google */
    :host-context(.dark) .quick-link {
      color: #fff;
    }
    
    :host-context(.dark) .quick-link:hover {
      color: #fff;
      text-decoration: underline;
      background: rgba(255, 255, 255, 0.08);
    }
    
    :host-context(.dark) .quick-link:active {
      background: rgba(255, 255, 255, 0.12);
    }
  `]
})
export class QuickLinkComponent implements OnInit, OnDestroy {
  quickLinksConfig: QuickLinksConfig = {
    enabled: false,
    links: [],
    maxLinks: 5
  };
  
  private subscription?: Subscription;

  constructor(private configService: ConfigService) {}

  ngOnInit(): void {
    // Subscribe to configuration changes
    this.subscription = this.configService.config$.subscribe(config => {
      console.log('QuickLink component received config update:', config);
      if (config?.user?.quickLinks) {
        console.log('QuickLinks config received:', config.user.quickLinks);
        console.log('QuickLinks links:', config.user.quickLinks.links);
        console.log('QuickLinks links type:', typeof config.user.quickLinks.links);
        console.log('QuickLinks links isArray:', Array.isArray(config.user.quickLinks.links));
        
        this.quickLinksConfig = { 
          ...config.user.quickLinks,
          links: Array.isArray(config.user.quickLinks.links) 
            ? config.user.quickLinks.links 
            : []
        };
        
        console.log('Final quickLinksConfig set:', this.quickLinksConfig);
      }
    });
  }

  ngOnDestroy(): void {
    if (this.subscription) {
      this.subscription.unsubscribe();
    }
  }

  /**
   * Get quick links for a specific corner
   */
  getLinksForCorner(corner: QuickLinkConfig['corner']): QuickLinkConfig[] {
    if (!this.quickLinksConfig.enabled) {
      return [];
    }
    
    // Ensure links is always an array
    if (!Array.isArray(this.quickLinksConfig.links)) {
      console.warn('quickLinksConfig.links is not an array, returning empty array');
      return [];
    }
    
    return this.quickLinksConfig.links
      .filter(link => link.corner === corner && link.enabled)
      .sort((a, b) => a.order - b.order);
  }
}