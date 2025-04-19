/** Angular Imports */
import { Component, OnInit } from '@angular/core';
import { UntypedFormControl, FormControl, FormGroup } from '@angular/forms';
import { Router } from '@angular/router';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { activities } from '../activities';
import { OrganizationService } from '../../organization/organization.service';
import { ClientsService } from '../../clients/clients.service';
import { HttpParams } from '@angular/common/http';
import { HttpClient } from '@angular/common/http';
import { HomeService } from '../home.service';

// Only keep the DateRange interface
interface DateRange {
  startDate: Date;
  endDate: Date;
}

/**
 * Dashboard component.
 */
@Component({
  selector: 'mifosx-dashboard',
  templateUrl: './dashboard.component.html',
  styleUrls: ['./dashboard.component.scss']
})
export class DashboardComponent implements OnInit {

  /** Array of all user activities */
  userActivity: string[];
  /** Array of most recent user activities */
  recentActivities: string[];
  /** Array of most frequent user activities */
  frequentActivities: string[];
  /** Search Text. */
  searchText: UntypedFormControl = new UntypedFormControl();
  /** Filtered Activities. */
  filteredActivities: Observable<any[]>;
  /** All User Activities. */
  allActivities: any[] = activities;

  totalClients: number = 0;
  activeLoans: number = 0;
  totalCollections: string = '$0';
  /** Form Controls */
  timescale: FormControl = new FormControl('Week');

  // Add new property for active clients
  activeClients: number = 0;

  /** Date Filter Form */
  dateFilterForm = new FormGroup({
    startDate: new FormControl<Date | null>(null),
    endDate: new FormControl<Date | null>(null)
  });

  /** Min and Max dates for date picker */
  minDate = new Date(2000, 0, 1);
  maxDate = new Date();

  /** Currency Filter Control */
  currencyControl = new FormControl('');

  /** Loading state */
  isLoading = false;

  /** Error state */
  hasError = false;

  /** Available Currencies */
  currencies: any[] = [];

  /** Loading states for different data sections */
  isLoadingClients = false;
  isLoadingDisbursement = false;
  isLoadingCollection = false;

  /** Disbursement and collection data */
  disbursedAmount = 0;
  pendingAmount = 0;
  collectedAmount = 0;
  outstandingAmount = 0;

  /** Trend percentages */
  disbursedTrend = 0;
  pendingTrend = 0;
  collectedTrend = 0;
  outstandingTrend = 0;

  /**
   * Gets user activities from local storage.
   */
  constructor(
    private router: Router,
    private organizationService: OrganizationService,
    private clientsService: ClientsService,
    private homeService: HomeService,
    private http: HttpClient
  ) {
    this.userActivity = JSON.parse(localStorage.getItem('mifosXLocation') || '[]');
    
    // Set default date range to last 30 days
    const today = new Date();
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(today.getDate() - 30);
    
    this.dateFilterForm.patchValue({
      startDate: thirtyDaysAgo,
      endDate: today
    });
  }

  ngOnInit() {
    this.recentActivities = this.getRecentActivities();
    this.frequentActivities = this.getFrequentActivities();
    this.setFilteredActivities();
    this.setupDateFilterListener();
    this.loadCurrencies();
    this.loadClientData();
    this.loadDisbursementData();
    this.loadCollectionData();
    
    // Add currency change listener
    this.currencyControl.valueChanges.subscribe(currency => {
      if (currency) {
        // Get current date range
        const dateRange = this.dateFilterForm.value;
        if (dateRange.startDate && dateRange.endDate) {
          const validDateRange: DateRange = {
            startDate: new Date(dateRange.startDate),
            endDate: new Date(dateRange.endDate)
          };
          // Update all data with new currency
          this.updateDashboardData(validDateRange);
        }
      }
    });
  }

  /**
   * Returns top eight recent activities.
   */
  getRecentActivities() {
    const reverseActivities = this.userActivity.reverse();
    const uniqueActivities: string[] = [];
    reverseActivities.forEach((activity: string) => {
      if (!uniqueActivities.includes(activity)) {
        uniqueActivities.push(activity);
      }
    });
    const topEightRecentActivities =
      uniqueActivities
        .filter((activity: string) => !['/', '/login', '/home', '/dashboard'].includes(activity))
        .slice(0, 8);
    return topEightRecentActivities;
  }

  /**
   * Returns top eight frequent activities.
   */
  getFrequentActivities() {
    const frequencyCounts: any  = {};
    let index  = this.userActivity.length;
    while (index) {
      frequencyCounts[this.userActivity[--index]] = (frequencyCounts[this.userActivity[index]] || 0) + 1;
    }
    const frequencyCountsArray = Object.entries(frequencyCounts);
    const topEigthFrequentActivities =
      frequencyCountsArray
        .sort((a: any, b: any) => b[1] - a[1])
        .map((entry: any[]) => entry[0])
        .filter((activity: string) => !['/', '/login', '/home', '/dashboard'].includes(activity))
        .slice(0, 8);
    return topEigthFrequentActivities;
  }

  /**
   * Navigates to the activity
   */
  navigatetoActivity(activity: string) {
    this.router.navigateByUrl(activity);
  }

  /**
   * Sets filtered activities for autocomplete.
   */
  setFilteredActivities() {
    this.filteredActivities = this.searchText.valueChanges
    .pipe(
      map((activity: any) => typeof activity === 'string' ? activity : activity.activity),
      map((activityName: string) => activityName ? this.filterActivity(activityName) : this.allActivities));
  }

  /**
   * Filters activities.
   * @param activityName Activity name to filter activity by.
   * @returns {any} Filtered activities.
   */
  private filterActivity(activityName: string): any {
    const filterValue = activityName.toLowerCase();
    return this.allActivities.filter(activity => activity.activity.toLowerCase().indexOf(filterValue) === 0);
  }

  /**
   * Sets up listener for date filter changes
   */
  setupDateFilterListener() {
    this.dateFilterForm.valueChanges.subscribe(dateRange => {
      // Check if both dates are valid before updating
      if (dateRange.startDate && dateRange.endDate) {
        const validDateRange: DateRange = {
          startDate: new Date(dateRange.startDate),
          endDate: new Date(dateRange.endDate)
        };
        this.updateDashboardData(validDateRange);
      }
    });
  }

  /**
   * Loads currencies from the backend
   */
  private loadCurrencies() {
    this.isLoading = true;
    this.hasError = false;

    this.organizationService.getCurrencies()
      .subscribe({
        next: (response: any) => {
          this.currencies = response.selectedCurrencyOptions;
          // Set default currency if available
          if (this.currencies.length > 0) {
            this.currencyControl.setValue(this.currencies[0].code);
          }
          this.isLoading = false;
        },
        error: (error) => {
          console.error('Error loading currencies:', error);
          this.hasError = true;
          this.isLoading = false;
        }
      });
  }

  /**
   * Loads client statistics from the backend
   */
  private loadClientData(startDate?: string, endDate?: string) {
    this.isLoadingClients = true;
    
    // Add date filters if provided
    let params = new HttpParams()
      .set('offset', '0')
      .set('limit', '-1')
      .set('sortOrder', 'ASC')
      .set('orderBy', 'displayName');
    
    if (startDate) {
      params = params.set('fromDate', startDate);
    }
    if (endDate) {
      params = params.set('toDate', endDate);
    }
    
    // Get total clients (all statuses)
    this.http.get('/clients', { params })
      .subscribe({
        next: (response: any) => {
          this.totalClients = response.totalFilteredRecords || 0;
          
          // For active clients, add status filter
          params = params.set('status', 'active');
          
          this.http.get('/clients', { params })
            .subscribe({
              next: (activeResponse: any) => {
                this.activeClients = activeResponse.totalFilteredRecords || 0;
                this.isLoadingClients = false;
              },
              error: (err: Error) => {
                console.error('Error loading active clients:', err);
                this.isLoadingClients = false;
              }
            });
        },
        error: (err: Error) => {
          console.error('Error loading total clients:', err);
          this.isLoadingClients = false;
        }
      });
  }

  /**
   * Loads disbursement data from the backend
   */
  private loadDisbursementData(officeId: number = 1) {
    this.isLoadingDisbursement = true;
    
    this.homeService.getDisbursedAmount(officeId).subscribe({
      next: (response: any) => {
        if (response && response.length > 0) {
          // Parse data from response
          const data = Object.entries(response[0]).map(entry => entry[1]);
          // Explicitly cast to number
          this.disbursedAmount = Number(data[0]) || 0;
          this.pendingAmount = Number(data[1]) || 0;
          
          // Calculate trends with fixed values for now
          // In a real implementation, historical data would be needed
          this.disbursedTrend = 4.3;
          this.pendingTrend = -2.1;
        }
        this.isLoadingDisbursement = false;
      },
      error: (err: Error) => {
        console.error('Error loading disbursement data:', err);
        this.isLoadingDisbursement = false;
      }
    });
  }

  /**
   * Loads collection data from the backend
   */
  private loadCollectionData(officeId: number = 1) {
    this.isLoadingCollection = true;
    
    this.homeService.getCollectedAmount(officeId).subscribe({
      next: (response: any) => {
        if (response && response.length > 0) {
          // Parse data from response
          const data = Object.entries(response[0]).map(entry => entry[1]);
          // Explicitly cast to number
          this.collectedAmount = Number(data[0]) || 0;
          this.outstandingAmount = Number(data[1]) || 0;
          
          // Calculate trends with fixed values for now
          // In a real implementation, historical data would be needed
          this.collectedTrend = 6.8;
          this.outstandingTrend = -1.5;
        }
        this.isLoadingCollection = false;
      },
      error: (err: Error) => {
        console.error('Error loading collection data:', err);
        this.isLoadingCollection = false;
      }
    });
  }

  /**
   * Updates dashboard data based on selected date range and currency
   */
  updateDashboardData(dateRange: DateRange) {
    try {
      const startDate = this.formatDate(dateRange.startDate);
      const endDate = this.formatDate(dateRange.endDate);
      const currencyCode = this.currencyControl.value || '';
      
      console.log(`Fetching data for date range: ${startDate} to ${endDate}, currency: ${currencyCode}`);
      
      // Load client data with date filter - this appears to be working
      this.loadClientData(startDate, endDate);
      
      // Load disbursement and collection data - these don't currently use filters
      this.loadDisbursementData(1);
      this.loadCollectionData(1);
      
      // Try to load active loans with a more robust approach
      this.loadActiveLoans(startDate, endDate, currencyCode);
    } catch (error) {
      console.error('Error updating dashboard data:', error);
    }
  }

  /**
   * Helper method to format date for API requests
   */
  private formatDate(date: Date): string {
    return date.toISOString().split('T')[0]; // Format as YYYY-MM-DD
  }

  /**
   * Load active loans data with filters
   */
  private loadActiveLoans(startDate?: string, endDate?: string, currencyCode?: string) {
    // Build base parameters according to Fineract API specs
    let params = new HttpParams()
      .set('limit', '1000')  // Set a reasonable limit
      .set('offset', '0')
      .set('orderBy', 'id')
      .set('sortOrder', 'ASC');
    
    // Add loan status filter - use statusId instead of status text
    params = params.append('sqlSearch', 'l.loan_status_id=300'); // 300 is the status ID for active loans
    
    console.log('Loading active loans with base parameters');
    
    this.http.get('/loans', { params })
      .subscribe({
        next: (response: any) => {
          if (response && response.totalFilteredRecords !== undefined) {
            this.activeLoans = response.totalFilteredRecords;
            console.log('Successfully loaded active loans count:', this.activeLoans);
            
            // If base request succeeded and we have additional filters, try to apply them
            if (startDate && endDate) {
              this.tryLoadLoansWithDateFilter(startDate, endDate, currencyCode);
            }
          } else {
            console.warn('Unexpected response format:', response);
            this.activeLoans = 0;
          }
        },
        error: (err: Error) => {
          console.error('Error loading active loans with base filter:', err);
          this.activeLoans = 0;
        }
      });
  }

  /**
   * Try to load loans with date filter
   */
  private tryLoadLoansWithDateFilter(startDate: string, endDate: string, currencyCode?: string) {
    let params = new HttpParams()
      .set('limit', '1000')
      .set('offset', '0')
      .set('orderBy', 'id')
      .set('sortOrder', 'ASC')
      .set('sqlSearch', 'l.loan_status_id=300')
      .set('disbursementFromDate', startDate)
      .set('disbursementToDate', endDate);

    if (currencyCode) {
      params = params.set('currency', currencyCode);
    }

    console.log('Attempting to load loans with date filters:', {
      startDate,
      endDate,
      currencyCode,
      params: params.toString()
    });

    this.http.get('/loans', { params })
      .subscribe({
        next: (response: any) => {
          if (response && response.totalFilteredRecords !== undefined) {
            this.activeLoans = response.totalFilteredRecords;
            console.log('Successfully loaded filtered active loans count:', this.activeLoans);
          }
        },
        error: (err: Error) => {
          console.error('Error loading loans with filters:', err);
          // Keep the previous count from the base request
        }
      });
  }

  /**
   * Calculate trends for disbursement data by comparing with previous period
   * This is a placeholder function as we can't currently fetch historical data
   * In a real implementation, this would fetch data from previous period
   */
  private calculateDisbursementTrends() {
    // For now, we'll use fixed values
    this.disbursedTrend = 4.3;
    this.pendingTrend = -2.1;
  }

  /**
   * Calculate trends for collection data by comparing with previous period
   * This is a placeholder function as we can't currently fetch historical data
   * In a real implementation, this would fetch data from previous period
   */
  private calculateCollectionTrends() {
    // For now, we'll use fixed values
    this.collectedTrend = 6.8;
    this.outstandingTrend = -1.5;
  }

  /**
   * Handles office selection changes for disbursement card
   */
  onDisbursementOfficeChange(officeId: number) {
    this.loadDisbursementData(Number(officeId));
  }

  /**
   * Handles office selection changes for collection card
   */
  onCollectionOfficeChange(officeId: number) {
    this.loadCollectionData(Number(officeId));
  }

  /**
   * Get the symbol for the selected currency
   */
  getCurrencySymbol(): string {
    const selectedCurrency = this.currencies.find(c => c.code === this.currencyControl.value);
    return selectedCurrency ? selectedCurrency.symbol : '$';
  }

}

