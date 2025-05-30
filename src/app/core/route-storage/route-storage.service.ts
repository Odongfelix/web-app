import { Injectable } from '@angular/core';
import { Router, NavigationEnd } from '@angular/router';
import { filter } from 'rxjs/operators';
import { AuthenticationService } from '../authentication/authentication.service';

@Injectable({
  providedIn: 'root'
})
export class RouteStorageService {
  private readonly STORAGE_KEY = 'mifosXLastRoute';

  constructor(private router: Router) {
    // Subscribe to router events to store the last route
    this.router.events.pipe(
      filter(event => event instanceof NavigationEnd)
    ).subscribe((event: NavigationEnd) => {
      // Don't store login or logout routes
      if (!event.url.includes('/login') && !event.url.includes('/logout')) {
        this.storeCurrentRoute(event.url);
      }
    });
  }

  /**
   * Stores the current route
   */
  storeCurrentRoute(route?: string): void {
    const currentRoute = route || this.router.url;
    if (currentRoute && !currentRoute.includes('/login') && !currentRoute.includes('/logout')) {
      // Use sessionStorage instead of localStorage to ensure routes don't persist across sessions
      sessionStorage.setItem(this.STORAGE_KEY, currentRoute);
    }
  }

  /**
   * Gets the last stored route
   * @returns {string} The last route before session timeout
   */
  getLastRoute(): string {
    return sessionStorage.getItem(this.STORAGE_KEY) || '/';
  }

  /**
   * Clears the stored route
   */
  clearLastRoute(): void {
    sessionStorage.removeItem(this.STORAGE_KEY);
    localStorage.removeItem(this.STORAGE_KEY); // Also clear from localStorage for backward compatibility
  }
} 