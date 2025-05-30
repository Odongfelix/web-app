/** Angular Imports */
import { Component, OnInit, OnDestroy } from '@angular/core';
import { Router } from '@angular/router';
import { trigger, transition, style, animate, state } from '@angular/animations';

/** rxjs Imports */
import { Subscription, interval } from 'rxjs';

/** Custom Models */
import { Alert } from '../core/alert/alert.model';

/** Custom Services */
import { AlertService } from '../core/alert/alert.service';

/** Environment Imports */
import { environment } from '../../environments/environment';
import { SettingsService } from 'app/settings/settings.service';

interface Event {
  title: string;
  description: string;
  date: string;
  image?: string;
}

/**
 * Login component.
 */
@Component({
  selector: 'mifosx-login',
  templateUrl: './login.component.html',
  styleUrls: ['./login.component.scss'],
  animations: [
    trigger('slideAnimation', [
      state('void', style({
        opacity: 0,
        transform: 'scale(0.9)'
      })),
      state('*', style({
        opacity: 1,
        transform: 'scale(1)'
      })),
      transition(':enter', [
        animate('600ms ease-out')
      ]),
      transition(':leave', [
        animate('300ms ease-in')
      ]),
      transition('* => *', [
        style({ opacity: 0, transform: 'scale(0.9) translateY(10px)' }),
        animate('600ms ease-out', style({ opacity: 1, transform: 'scale(1) translateY(0)' }))
      ])
    ])
  ]
})
export class LoginComponent implements OnInit, OnDestroy {

  public environment = environment;
  public currentDate = new Date();
  public dateUpdateSubscription: Subscription;

  /** True if password requires a reset. */
  resetPassword = false;
  /** True if user requires two factor authentication. */
  twoFactorAuthenticationRequired = false;
  /** Subscription to alerts. */
  alert$: Subscription;
  /** Subscription for slider interval */
  sliderSubscription: Subscription;

  /** Events data */
  events: Event[] = [
    {
      title: 'Welcome to RL JAIN',
      description: 'Your trusted Microfinance Institution in Kampala since 2016',
      date: '2024-03-20',
      image: 'assets/images/jain test'
    },
    {
      title: 'Microfinance Services',
      description: 'Offering accessible financial solutions to empower local businesses',
      date: '2024-03-25',
      image: 'assets/images/jain test'
    },
    {
      title: 'UMRA Regulated Institution',
      description: 'Regulated by Uganda Microfinance Regulatory Authority for your security',
      date: '2024-03-30',
      image: 'assets/images/jain test'
    }
  ];

  /** Current event index */
  currentEventIndex = 0;

  /**
   * @param {AlertService} alertService Alert Service.
   * @param {Router} router Router for navigation.
   */
  constructor(private alertService: AlertService,
      private settingsService: SettingsService,
      private router: Router) { }

  /**
   * Subscribes to alert event of alert service and initializes the event slider.
   */
  ngOnInit() {
    this.alert$ = this.alertService.alertEvent.subscribe((alertEvent: Alert) => {
      const alertType = alertEvent.type;
      if (alertType === 'Password Expired') {
        this.twoFactorAuthenticationRequired = false;
        this.resetPassword = true;
      } else if (alertType === 'Two Factor Authentication Required') {
        this.resetPassword = false;
        this.twoFactorAuthenticationRequired = true;
      } else if (alertType === 'Authentication Success') {
        this.resetPassword = false;
        this.twoFactorAuthenticationRequired = false;
        this.router.navigate(['/'], { replaceUrl: true });
      }
    });

    // Initialize event slider
    this.startEventSlider();

    // Update current date every minute
    this.dateUpdateSubscription = interval(60000).subscribe(() => {
      this.currentDate = new Date();
    });
  }

  /**
   * Starts the event slider interval
   */
  private startEventSlider(): void {
    this.sliderSubscription = interval(60000).subscribe(() => {
      this.currentEventIndex = (this.currentEventIndex + 1) % this.events.length;
    });
  }

  /**
   * Gets the current event to display
   */
  getCurrentEvent(): Event {
    return this.events[this.currentEventIndex];
  }

  /**
   * Manually change to a specific slide
   */
  goToSlide(index: number): void {
    this.currentEventIndex = index;
  }

  /**
   * Unsubscribes from alerts and slider interval.
   */
  ngOnDestroy() {
    this.alert$.unsubscribe();
    if (this.sliderSubscription) {
      this.sliderSubscription.unsubscribe();
    }
    if (this.dateUpdateSubscription) {
      this.dateUpdateSubscription.unsubscribe();
    }
  }

  reloadSettings(): void {
    this.settingsService.setTenantIdentifier('');
    this.settingsService.setTenantIdentifier(environment.fineractPlatformTenantId || 'default');
    this.settingsService.setTenantIdentifiers(environment.fineractPlatformTenantIds.split(','));
    this.settingsService.setServers(environment.baseApiUrls.split(','));
    window.location.reload();
  }

  displayTenantSelector(): boolean {
    return environment.displayTenantSelector === 'false' ? false : true;
  }

}
