import { Component, OnInit } from '@angular/core';
import { Observable, of, from } from 'rxjs';
import { catchError } from 'rxjs/operators';

interface ExchangeRateResponse {
  rates: {
    UGX: number
  };
}

interface SavedRateResponse {
  rate: number;
  lastUpdated: string;
}

@Component({
  selector: 'mifosx-mconfiguration',
  templateUrl: './mconfiguration.component.html',
  styleUrls: ['./mconfiguration.component.scss']
})
export class MconfigurationComponent implements OnInit {
  // Rate configuration flags and values
  useLiveRates: boolean = true;
  manualRate: number | null = null;
  savedRate: number | null = null;
  liveRate: number | null = null;

  // Metadata and state tracking
  lastUpdated: string | null = null;
  canSaveRate: boolean = true;
  isFetchingLiveRate: boolean = false;
  fetchError: string | null = null;

  /**
   * Saves the current live exchange rate
   */
  saveLiveRate(): void {
    // Check if there's a valid live rate to save
    if (!this.liveRate) {
      console.error('No live rate available to save');
      return;
    }

    // Prepare payload for saving
    const payload = {
      rate: this.liveRate,
      date: new Date().toISOString()
    };

    // Save to localStorage
    localStorage.setItem('savedExchangeRate', JSON.stringify({
      rate: this.liveRate,
      lastUpdated: payload.date
    }));

    // Update component state
    this.savedRate = this.liveRate;
    this.lastUpdated = payload.date;
    this.canSaveRate = false;

    // Optional: Add any additional backend API call if required
    // this.saveRateToBackend(payload);
  }

  /**
   * Refreshes the live exchange rate
   */
  refreshLiveRate(): void {
    // Reset any previous fetch error
    this.fetchError = null;

    // Force fetch of new live rate, bypassing cache
    this.isFetchingLiveRate = true;

    // Clear existing cached rate to force fresh fetch
    localStorage.removeItem('exchangeRateCache');

    // Call fetchLiveRate method to get new rate
    this.fetchLiveRate().subscribe({
      next: (rate) => {
        if (rate) {
          this.liveRate = rate;
          this.isFetchingLiveRate = false;
          // Reset save rate capability if it's a new rate
          this.canSaveRate = true;
        }
      },
      error: (error) => {
        this.handleLiveRateFetchError(error);
        this.isFetchingLiveRate = false;
      }
    });
  }


  // Configuration constants
  private readonly CACHE_DURATION = 1 * 60 * 60 * 1000; // 1 hour cache
  private readonly RATE_FETCH_TIMEOUT = 5000; // 5 seconds timeout

  // API endpoints
  private apiUrl = '/api/mcurrency';
  private liveRateApiUrl = 'https://api.exchangerate-api.com/v4/latest/USD';

  constructor() {}

  ngOnInit(): void {
    this.initializeComponent();
  }


  /**
   * Initialize component by fetching saved rates and live rates
   */
  private initializeComponent(): void {
    this.fetchSavedRate();
    if (this.useLiveRates) {
      this.fetchLiveRate();
    }
  }

  /**
   * Fetches the live exchange rate with comprehensive caching and error handling
   */
  fetchLiveRate(): Observable<number | null> {
    // Check localStorage first for cached rate
    const cachedRate = localStorage.getItem('exchangeRateCache');
    if (cachedRate) {
      const parsed = JSON.parse(cachedRate);
      if (Date.now() - parsed.timestamp < this.CACHE_DURATION) {
        this.liveRate = parsed.rate;
        this.lastUpdated = new Date(parsed.timestamp).toISOString();
        return of(this.liveRate);
      }
    }



    this.isFetchingLiveRate = true;
    this.fetchError = null;

    return from(
      fetch(this.liveRateApiUrl)
        .then(response => {
          if (!response.ok) {
            throw new Error('Network response was not ok');
          }
          return response.json();
        })
        .then(data => {
          if (data && data.rates && data.rates.UGX) {
            this.liveRate = data.rates.UGX;

            // Cache in localStorage
            localStorage.setItem('exchangeRateCache', JSON.stringify({
              rate: this.liveRate,
              timestamp: Date.now()
            }));

            this.lastUpdated = new Date().toISOString();
            this.isFetchingLiveRate = false;
            return this.liveRate;
          }
          throw new Error('Invalid rate response');
        })
    ).pipe(
      catchError(error => {
        this.handleLiveRateFetchError(error);
        return of(null);
      })
    );
  }

  /**
   * Handles errors during live rate fetching with more granular error handling
   */
  private handleLiveRateFetchError(error: any): void {
    // More detailed error messaging
    if (error.name === 'AbortError') {
      this.fetchError = 'Rate fetch timed out. Check your internet connection.';
    } else if (!navigator.onLine) {
      this.fetchError = 'No internet connection. Please check your network.';
    } else {
      this.fetchError = 'Unable to fetch live rate. Please try again later.';
    }

    this.isFetchingLiveRate = false;
    console.error('Live rate fetch error:', error);
  }

  /**
   * Fetches the saved rate from the backend
   */
  fetchSavedRate(): void {
    // Simulate fetch or use localStorage as a fallback
    const savedRateData = localStorage.getItem('savedExchangeRate');
    if (savedRateData) {
      const parsedData = JSON.parse(savedRateData);
      this.savedRate = parsedData.rate;
      this.lastUpdated = parsedData.lastUpdated;
      this.canSaveRate = this.isNewDay(this.lastUpdated);
    }
  }

  /**
   * Toggles between live and manual rate modes with optimized switching
   */
  toggleRateMode(): void {
    this.useLiveRates = !this.useLiveRates;

    if (this.useLiveRates) {
      // Check localStorage for cached live rate
      const cachedRate = localStorage.getItem('exchangeRateCache');
      if (cachedRate) {
        const parsed = JSON.parse(cachedRate);
        this.liveRate = parsed.rate;
        this.lastUpdated = new Date(parsed.timestamp).toISOString();
      } else {
        // Fetch live rate if no cache exists
        this.fetchLiveRate();
      }
      this.manualRate = null;
    } else {
      this.liveRate = null;
    }
  }

  /**
   * Saves a manually entered exchange rate
   */
  saveManualRate(): void {
    if (!this.manualRate) return;

    const payload = {
      rate: this.manualRate,
      date: new Date().toISOString()
    };

    // Use localStorage for saving manual rate
    localStorage.setItem('savedExchangeRate', JSON.stringify({
      rate: this.manualRate,
      lastUpdated: payload.date
    }));

    this.savedRate = this.manualRate;
    this.lastUpdated = payload.date;
    this.canSaveRate = false;
  }

  /**
   * Checks if the last updated date is different from today
   */
  private isNewDay(lastUpdated: string): boolean {
    const lastUpdateDate = new Date(lastUpdated).toDateString();
    const todayDate = new Date().toDateString();
    return lastUpdateDate !== todayDate;
  }

  /**
   * Returns the current active rate based on mode
   */
  getCurrentRate(): number | null {
    return this.useLiveRates ? this.liveRate : this.manualRate;
  }

  /**
   * Validates the manual rate input to allow only numbers and decimals
   */
  validateNumberInput(event: Event): void {
    const inputElement = event.target as HTMLInputElement;
    const sanitizedValue = inputElement.value.replace(/[^0-9.]/g, ''); // Allow digits and decimal points
    const parts = sanitizedValue.split('.');

    // Ensure only one decimal point is allowed
    if (parts.length > 2) {
      inputElement.value = `${parts[0]}.${parts[1]}`;
    } else {
      inputElement.value = sanitizedValue;
    }
}
}
