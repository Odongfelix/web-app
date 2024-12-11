import { Component, OnInit, ViewChild, ElementRef } from '@angular/core';
import { Observable, of, from } from 'rxjs';
import { catchError } from 'rxjs/operators';

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
  canSaveManualRate: boolean = true;
  isFetchingLiveRate: boolean = false;
  fetchError: string | null = null;

  // Added ViewChild to get reference to manual rate input
  @ViewChild('manualRateInput') manualRateInput!: ElementRef;

  constructor() {}

  ngOnInit(): void {
    this.initializeComponent();
  }

  saveLiveRate(): void {
    if (!this.liveRate) return;
    const payload = { rate: this.liveRate, date: new Date().toISOString() };
    localStorage.setItem('savedExchangeRate', JSON.stringify(payload));
    this.savedRate = this.liveRate;
    this.lastUpdated = payload.date;
    this.canSaveRate = false;
    this.canSaveManualRate = true; // Allow manual saving if live rate is saved
  }

  saveManualRate(): void {
    if (!this.manualRate) return;
    const payload = { rate: this.manualRate, date: new Date().toISOString() };
    localStorage.setItem('savedExchangeRate', JSON.stringify(payload));
    this.savedRate = this.manualRate;
    this.lastUpdated = payload.date;
    this.canSaveManualRate = false;
    this.canSaveRate = true; // Allow live saving if manual rate is saved
  }

  updateManualRate(): void {
    console.log('Manual rate updated:', this.manualRate);
    // Update logic can be implemented here
  }

  refreshLiveRate(): void {
    this.isFetchingLiveRate = true;
    this.fetchError = null;

    // Clear the manual rate input if in manual rate mode
    if (!this.useLiveRates && this.manualRateInput) {
      this.manualRateInput.nativeElement.value = '';
      this.manualRate = null;
    }

    localStorage.removeItem('exchangeRateCache');
    this.fetchLiveRate().subscribe({
      next: (rate) => {
        if (rate) {
          this.liveRate = rate;
          this.isFetchingLiveRate = false;
          this.canSaveRate = true;

          // Reset manual rate save ability when refreshing in live rate mode
          if (this.useLiveRates) {
            this.canSaveManualRate = true;
          }
        }
      },
      error: (error) => {
        this.handleLiveRateFetchError(error);
        this.isFetchingLiveRate = false;
      }
    });
  }

  fetchLiveRate(): Observable<number | null> {
    const cachedRate = localStorage.getItem('exchangeRateCache');
    if (cachedRate) {
      const parsed = JSON.parse(cachedRate);
      if (Date.now() - parsed.timestamp < 3600000) {
        this.liveRate = parsed.rate;
        this.lastUpdated = new Date(parsed.timestamp).toISOString();
        return of(this.liveRate);
      }
    }

    return from(
      fetch('https://api.exchangerate-api.com/v4/latest/USD')
        .then((response) => {
          if (!response.ok) throw new Error('Network error');
          return response.json();
        })
        .then((data) => {
          if (data?.rates?.UGX) {
            this.liveRate = data.rates.UGX;
            localStorage.setItem('exchangeRateCache', JSON.stringify({ rate: this.liveRate, timestamp: Date.now() }));
            this.lastUpdated = new Date().toISOString();
            return this.liveRate;
          }
          throw new Error('Invalid data');
        })
    ).pipe(catchError((error) => of(null)));
  }

  toggleRateMode(): void {
    this.useLiveRates = !this.useLiveRates;
    if (this.useLiveRates) {
      this.manualRate = null;
    } else {
      this.liveRate = null;
    }
  }

  validateNumberInput(event: Event): void {
    const inputElement = event.target as HTMLInputElement;
    const sanitizedValue = inputElement.value.replace(/[^0-9.]/g, '');
    const parts = sanitizedValue.split('.');
    inputElement.value = parts.length > 2 ? `${parts[0]}.${parts[1]}` : sanitizedValue;
  }

  private initializeComponent(): void {
    this.fetchSavedRate();
    if (this.useLiveRates) {
      this.fetchLiveRate();
    }
  }

  private fetchSavedRate(): void {
    const savedRateData = localStorage.getItem('savedExchangeRate');
    if (savedRateData) {
      const parsed = JSON.parse(savedRateData);
      this.savedRate = parsed.rate;
      this.lastUpdated = parsed.lastUpdated;
    }
  }

  private handleLiveRateFetchError(error: any): void {
    this.fetchError = 'Failed to fetch live rate. Try again later.';
    console.error('Error fetching live rate:', error);
  }
}
