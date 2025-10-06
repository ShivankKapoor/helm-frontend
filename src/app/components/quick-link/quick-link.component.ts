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
          [title]="link.url"
          (mousemove)="onMouseMove($event)"
          (mouseleave)="onMouseLeave($event)"
        >
          <span class="link-text">{{ link.text }}</span>
          <div class="shine-effect"></div>
        </a>
      }
    </div>

    <!-- Top Right Corner -->
    <div class="quick-links-corner top-right">
      @for (link of getLinksForCorner('top-right'); track link.id) {
        <a 
          [href]="link.url"
          [class]="'quick-link quick-link-top-right'"
          [title]="link.url"
          (mousemove)="onMouseMove($event)"
          (mouseleave)="onMouseLeave($event)"
        >
          <span class="link-text">{{ link.text }}</span>
          <div class="shine-effect"></div>
        </a>
      }
    </div>

    <!-- Bottom Left Corner -->
    <div class="quick-links-corner bottom-left">
      @for (link of getLinksForCorner('bottom-left'); track link.id) {
        <a 
          [href]="link.url"
          [class]="'quick-link quick-link-bottom-left'"
          [title]="link.url"
          (mousemove)="onMouseMove($event)"
          (mouseleave)="onMouseLeave($event)"
        >
          <span class="link-text">{{ link.text }}</span>
          <div class="shine-effect"></div>
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
      transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
      border-radius: 6px;
      display: block;
      position: relative;
      overflow: hidden;
      border: 1px solid transparent;
      transform: translateY(0) scale(1);
      box-shadow: 0 0 0 rgba(0, 0, 0, 0);
    }
    
    .link-text {
      position: relative;
      z-index: 2;
      display: block;
    }
    
    .shine-effect {
      position: absolute;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      background: radial-gradient(
        circle 30px at var(--mouse-x, 50%) var(--mouse-y, 50%),
        rgba(var(--button-bg-rgb, 26, 115, 232), 0.4) 0%,
        rgba(var(--button-bg-rgb, 26, 115, 232), 0.2) 30%,
        transparent 70%
      );
      opacity: 0;
      transition: opacity 0.3s ease;
      pointer-events: none;
      z-index: 1;
    }
    
    .quick-link::before {
      content: '';
      position: absolute;
      top: 0;
      left: -100%;
      width: 100%;
      height: 100%;
      background: linear-gradient(90deg, transparent, rgba(var(--button-bg-rgb, 26, 115, 232), 0.1), transparent);
      opacity: 0;
      transition: all 0.6s ease;
      z-index: 0;
    }
    
    .quick-link:hover {
      color: var(--button-bg, #1a73e8);
      text-decoration: none;
      background: rgba(var(--button-bg-rgb, 26, 115, 232), 0.1);
      border-color: var(--button-bg, #1a73e8);
      transform: translateY(-2px) scale(1.05);
      box-shadow: 
        0 4px 12px rgba(var(--button-bg-rgb, 26, 115, 232), 0.25),
        0 0 20px rgba(var(--button-bg-rgb, 26, 115, 232), 0.15);
      font-weight: 500;
    }
    
    .quick-link:hover::before {
      left: 100%;
      opacity: 0.8;
    }
    
    .quick-link:active {
      transform: translateY(0) scale(0.98);
      box-shadow: 
        0 2px 6px rgba(var(--button-bg-rgb, 26, 115, 232), 0.3),
        0 0 10px rgba(var(--button-bg-rgb, 26, 115, 232), 0.2);
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
    
    /* Dark mode adjustments */
    :host-context(.dark) .quick-link {
      color: #fff;
    }
    
    :host-context(.dark) .quick-link:hover {
      color: var(--button-bg, #1a73e8);
      background: rgba(var(--button-bg-rgb, 26, 115, 232), 0.15);
      border-color: var(--button-bg, #1a73e8);
      box-shadow: 
        0 4px 12px rgba(var(--button-bg-rgb, 26, 115, 232), 0.3),
        0 0 20px rgba(var(--button-bg-rgb, 26, 115, 232), 0.2);
    }
    
    :host-context(.dark) .quick-link:active {
      box-shadow: 
        0 2px 6px rgba(var(--button-bg-rgb, 26, 115, 232), 0.35),
        0 0 10px rgba(var(--button-bg-rgb, 26, 115, 232), 0.25);
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

  /**
   * Handle mouse move for responsive shine effect
   */
  onMouseMove(event: MouseEvent): void {
    const target = event.currentTarget as HTMLElement;
    const rect = target.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;
    
    const shineEffect = target.querySelector('.shine-effect') as HTMLElement;
    if (shineEffect) {
      shineEffect.style.setProperty('--mouse-x', `${x}px`);
      shineEffect.style.setProperty('--mouse-y', `${y}px`);
      shineEffect.style.opacity = '1';
    }
  }

  /**
   * Handle mouse leave to fade out shine effect
   */
  onMouseLeave(event: MouseEvent): void {
    const target = event.currentTarget as HTMLElement;
    const shineEffect = target.querySelector('.shine-effect') as HTMLElement;
    if (shineEffect) {
      shineEffect.style.opacity = '0';
    }
  }
}