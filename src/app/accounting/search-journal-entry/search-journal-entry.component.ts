/** Angular Imports */
import { Component, OnInit, ViewChild, AfterViewInit } from '@angular/core';
import { MatPaginator } from '@angular/material/paginator';
import { MatSort } from '@angular/material/sort';
import { UntypedFormControl } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';

/** rxjs Imports */
import { merge } from 'rxjs';
import { tap, startWith, map, distinctUntilChanged, debounceTime } from 'rxjs/operators';

/** Custom Services */
import { AccountingService } from '../accounting.service';
import { SettingsService } from 'app/settings/settings.service';
/** Custom Data Source */
import { JournalEntriesDataSource } from './journal-entry.datasource';
import { Dates } from 'app/core/utils/dates';

/**
 * Search journal entry component.
 */
@Component({
  selector: 'mifosx-search-journal-entry',
  templateUrl: './search-journal-entry.component.html',
  styleUrls: ['./search-journal-entry.component.scss']
})
export class SearchJournalEntryComponent implements OnInit, AfterViewInit {

  /** Storage key for filters */
  private readonly FILTERS_STORAGE_KEY = 'mifosXJournalEntryFilters';
  /** Storage key for GL account data */
  private readonly GL_ACCOUNT_STORAGE_KEY = 'mifosXJournalEntryGLAccount';

  /** Minimum transaction date allowed. */
  minDate = new Date(2000, 0, 1);
  /** Maximum transaction date allowed. */
  maxDate = new Date();
  /** Office name filter form control.  */
  officeName = new UntypedFormControl();
  /** Office data. */
  officeData: any;
  /** Filtered office data for autocomplete. */
  filteredOfficeData: any;
  /** Gl Account filter form control. */
  glAccount = new UntypedFormControl();
  /** Gl Account data. */
  glAccountData: any;
  /** Filtered gl account data. */
  filteredGLAccountData: any;
  /** Entry type filter form control. */
  entryTypeFilter = new UntypedFormControl('');
  /** Entry type filter data. */
  entryTypeFilterData = [
    {
      option: 'All',
      value: ''
    },
    {
      option: 'Manual Entries',
      value: true
    },
    {
      option: 'System Entries',
      value: false  // Bug: unable to implement from server side
    }
  ];
  /** Transaction date from form control. */
  transactionDateFrom = new UntypedFormControl(new Date(new Date().setMonth(new Date().getMonth() - 1)));
  /** Transaction date to form control. */
  transactionDateTo = new UntypedFormControl(new Date());
  /** Transaction ID form control. */
  transactionId = new UntypedFormControl();
  /** Submitted on date from form control. */
  submittedOnDateFrom = new UntypedFormControl();
  /** Submitted on date to form control. */
  submittedOnDateTo = new UntypedFormControl();
  /** Columns to be displayed in journal entries table. */
  displayedColumns: string[] = ['id', 'officeName', 'transactionId', 'transactionDate', 'glAccountType', 'createdByUserName', 'submittedOnDate', 'glAccountCode', 'glAccountName', 'currency', 'debit', 'credit'];
  /** Data source for journal entries table. */
  dataSource: JournalEntriesDataSource;
  /** Journal entries filter. */
  filterJournalEntriesBy = [
    {
      type: 'officeId',
      value: ''
    },
    {
      type: 'glAccountId',
      value: ''
    },
    {
      type: 'manualEntriesOnly',
      value: ''
    },
    {
      type: 'transactionId',
      value: ''
    },
    {
      type: 'fromDate',
      value: this.dateUtils.formatDate(new Date(new Date().setMonth(new Date().getMonth() - 1)), this.settingsService.dateFormat)
    },
    {
      type: 'toDate',
      value: this.dateUtils.formatDate(new Date(), this.settingsService.dateFormat)
    },
    {
      type: 'submittedOnDateFrom',
      value: ''
    },
    {
      type: 'submittedOnDateTo',
      value: ''
    },
    {
      type: 'dateFormat',
      value: this.settingsService.dateFormat
    },
    {
      type: 'locale',
      value: this.settingsService.language.code
    },
    {
      type: 'currency',
      value: ''
    }
  ];

  /** Paginator for journal entries table. */
  @ViewChild(MatPaginator, { static: true }) paginator: MatPaginator;
  /** Sorter for journal entries table. */
  @ViewChild(MatSort, { static: true }) sort: MatSort;

  /** Currency filter form control */
  currencyFilter = new UntypedFormControl('');
  /** Currency data */
  currencyData: any[] = [];
  /** Filter data object */
  filterData: any = {
    currency: ''
  };

  /**
   * Retrieves the offices and gl accounts data from `resolve`.
   * @param {AccountingService} accountingService Accounting Service.
   * @param {ActivatedRoute} route Activated Route.
   * @param {SettingsService} settingsService Settings Service.
   */
  constructor(private accountingService: AccountingService,
              private settingsService: SettingsService,
              private dateUtils: Dates,
              private route: ActivatedRoute) {
    this.route.data.subscribe((data: {
      offices: any,
      glAccounts: any
    }) => {
      this.officeData = data.offices;
      this.glAccountData = data.glAccounts;
    });
  }

  /**
   * Sets filtered offices and gl accounts for autocomplete and journal entries table.
   */
  ngOnInit() {
    this.maxDate = this.settingsService.businessDate;
    
    // Initialize the data source first
    this.dataSource = new JournalEntriesDataSource(this.accountingService);
    
    // Set up autocomplete
    this.setFilteredOffices();
    this.setFilteredGlAccounts();
    
    // Restore filters (this will trigger data loading)
    this.restoreFilters();

    // Get currencies with logging
    this.accountingService.getCurrencies().subscribe(
      (response: any) => {
        console.log('Currencies from backend:', response);
        this.currencyData = response.selectedCurrencyOptions || [];
        console.log('Formatted currency data:', this.currencyData);
        
        // After loading currencies, restore the currency filter if it exists
        const savedFilters = this.getSavedFilters();
        if (savedFilters?.currency) {
          this.currencyFilter.setValue(savedFilters.currency, { emitEvent: false });
          const index = this.filterJournalEntriesBy.findIndex(f => f.type === 'currency');
          if (index !== -1) {
            this.filterJournalEntriesBy[index].value = savedFilters.currency;
            this.loadJournalEntriesPage();
          }
        }
      },
      error => {
        console.error('Error fetching currencies:', error);
      }
    );

    // Add subscription for currency changes
    this.currencyFilter.valueChanges
      .pipe(
        debounceTime(500),
        distinctUntilChanged(),
        tap((filterValue) => {
          console.log('Currency changed to:', filterValue);
          this.applyFilter(filterValue, 'currency');
        })
      )
      .subscribe();
  }

  /**
   * Subscribes to all search filters and saves them when they change
   */
  ngAfterViewInit() {
    this.officeName.valueChanges
      .pipe(
        map(value => value.id ? value.id : ''),
        debounceTime(500),
        distinctUntilChanged(),
        tap((filterValue) => {
          this.applyFilter(filterValue, 'officeId');
          this.saveFilters();
        })
      )
      .subscribe();

    this.glAccount.valueChanges
      .pipe(
        map(value => value ? value : ''),
        debounceTime(500),
        distinctUntilChanged(),
        tap((filterValue) => {
          this.applyFilter(filterValue, 'glAccountId');
          this.saveFilters();
        })
      )
      .subscribe();

    this.transactionId.valueChanges
      .pipe(
        debounceTime(500),
        distinctUntilChanged(),
        tap((filterValue) => {
          this.applyFilter(filterValue, 'transactionId');
          this.saveFilters();
        })
      )
      .subscribe();

    this.transactionDateFrom.valueChanges
      .pipe(
        debounceTime(500),
        distinctUntilChanged(),
        tap((filterValue) => {
          this.applyFilter(this.dateUtils.formatDate(filterValue, this.settingsService.dateFormat), 'fromDate');
          this.saveFilters();
        })
      )
      .subscribe();

    this.transactionDateTo.valueChanges
      .pipe(
        debounceTime(500),
        distinctUntilChanged(),
        tap((filterValue) => {
          this.applyFilter(this.dateUtils.formatDate(filterValue, this.settingsService.dateFormat), 'toDate');
          this.saveFilters();
        })
      )
      .subscribe();

    this.submittedOnDateFrom.valueChanges
      .pipe(
        debounceTime(500),
        distinctUntilChanged(),
        tap((filterValue) => {
          this.applyFilter(this.dateUtils.formatDate(filterValue, this.settingsService.dateFormat), 'submittedOnDateFrom');
          this.saveFilters();
        })
      )
      .subscribe();

    this.submittedOnDateTo.valueChanges
      .pipe(
        debounceTime(500),
        distinctUntilChanged(),
        tap((filterValue) => {
          this.applyFilter(this.dateUtils.formatDate(filterValue, this.settingsService.dateFormat), 'submittedOnDateTo');
          this.saveFilters();
        })
      )
      .subscribe();

    this.currencyFilter.valueChanges
      .pipe(
        debounceTime(500),
        distinctUntilChanged(),
        tap((filterValue) => {
          console.log('felix', filterValue);
          this.applyFilter(filterValue, 'currency');
        })
      )
      .subscribe();

    this.sort.sortChange.subscribe(() => this.paginator.pageIndex = 0);

    merge(this.sort.sortChange, this.paginator.page)
      .pipe(
        tap(() => this.loadJournalEntriesPage())
      )
      .subscribe();
  }

  /**
   * Loads a page of journal entries.
   */
  loadJournalEntriesPage() {
    if (!this.sort.direction) {
      delete this.sort.active;
    }
    this.dataSource.getJournalEntries(this.filterJournalEntriesBy, this.sort.active, this.sort.direction, this.paginator.pageIndex, this.paginator.pageSize);
  }

  /**
   * Filters data in journal entries table based on passed value and property.
   * @param {string} filterValue Value to filter data.
   * @param {string} property Property to filter data by.
   */
  applyFilter(filterValue: string, property: string) {
    this.paginator.pageIndex = 0;
    const findIndex = this.filterJournalEntriesBy.findIndex(filter => filter.type === property);

    if (findIndex === -1) {
      this.filterJournalEntriesBy.push({
        type: property,
        value: filterValue
      });
    } else {
      this.filterJournalEntriesBy[findIndex].value = filterValue;
    }

    // For debugging
    console.log('Applied filter:', property, filterValue);
    console.log('Current filters:', this.filterJournalEntriesBy);

    // Save filters after applying them
    this.saveFilters();

    // Reset the table data and load with new filter
    this.loadJournalEntriesPage();
  }

  /**
   * Displays office name in form control input.
   * @param {any} office Office data.
   * @returns {string} Office name if valid otherwise undefined.
   */
  displayOfficeName(office?: any): string | undefined {
    return office ? office.name : undefined;
  }

  /**
   * Sets filtered offices for autocomplete.
   */
  setFilteredOffices() {
    this.filteredOfficeData = this.officeName.valueChanges
      .pipe(
        startWith(''),
        map((office: any) => typeof office === 'string' ? office : office.name),
        map((officeName: string) => officeName ? this.filterOfficeAutocompleteData(officeName) : this.officeData)
      );
  }

  /**
   * Sets filtered gl accounts for autocomplete.
   */
  setFilteredGlAccounts() {
    this.filteredGLAccountData = this.glAccount.valueChanges
      .pipe(
        startWith(''),
        map((glAccount: any) => typeof glAccount === 'string' ? glAccount : glAccount.name + ' (' + glAccount.glCode + ')'),
        map((glAccount: string) => glAccount ? this.filterGLAccountAutocompleteData(glAccount) : this.glAccountData)
      );
  }

  /**
   * Filters offices.
   * @param {string} officeName Office name to filter office by.
   * @returns {any} Filtered offices.
   */
  private filterOfficeAutocompleteData(officeName: string): any {
    return this.officeData.filter((office: any) => office.name.toLowerCase().includes(officeName.toLowerCase()));
  }

  /**
   * Filters gl accounts.
   * @param {string} glAccount Gl Account name to filter gl account by.
   * @returns {any} Filtered gl accounts.
   */
  private filterGLAccountAutocompleteData(glAccount: string): any {
    return this.glAccountData.filter((option: any) => (option.name + ' (' + option.glCode + ')').toLowerCase().includes(glAccount.toLowerCase()));
  }

  /**
   * Initializes the data source for journal entries table and loads the first page.
   */
  getJournalEntries() {
    this.dataSource = new JournalEntriesDataSource(this.accountingService);
    this.dataSource.getJournalEntries(this.filterJournalEntriesBy, this.sort.active, this.sort.direction, this.paginator.pageIndex, this.paginator.pageSize);
  }

  /**
   * Saves current filter values to localStorage
   */
  private saveFilters(): void {
    const filters = {
      officeId: this.officeName.value?.id || '',
      glAccountId: this.glAccount.value?.id || '',
      transactionId: this.transactionId.value || '',
      fromDate: this.transactionDateFrom.value ? this.dateUtils.formatDate(this.transactionDateFrom.value, this.settingsService.dateFormat) : '',
      toDate: this.transactionDateTo.value ? this.dateUtils.formatDate(this.transactionDateTo.value, this.settingsService.dateFormat) : '',
      submittedOnDateFrom: this.submittedOnDateFrom.value ? this.dateUtils.formatDate(this.submittedOnDateFrom.value, this.settingsService.dateFormat) : '',
      submittedOnDateTo: this.submittedOnDateTo.value ? this.dateUtils.formatDate(this.submittedOnDateTo.value, this.settingsService.dateFormat) : '',
      currency: this.currencyFilter.value || '',
      manualEntriesOnly: this.entryTypeFilter.value || ''
    };
    localStorage.setItem(this.FILTERS_STORAGE_KEY, JSON.stringify(filters));
  }

  /**
   * Saves GL account data to localStorage for persistence
   */
  private saveGLAccountData(): void {
    if (this.glAccountData) {
      localStorage.setItem(this.GL_ACCOUNT_STORAGE_KEY, JSON.stringify(this.glAccountData));
    }
  }

  /**
   * Gets saved filters from localStorage
   */
  private getSavedFilters(): any {
    const savedFilters = localStorage.getItem(this.FILTERS_STORAGE_KEY);
    return savedFilters ? JSON.parse(savedFilters) : null;
  }

  /**
   * Gets saved GL account data from localStorage
   */
  private getSavedGLAccountData(): any {
    const savedGLData = localStorage.getItem(this.GL_ACCOUNT_STORAGE_KEY);
    return savedGLData ? JSON.parse(savedGLData) : null;
  }

  /**
   * Restores saved filters from localStorage
   */
  private restoreFilters(): void {
    const savedFilters = this.getSavedFilters();
    if (savedFilters) {
      // Reset filterJournalEntriesBy to default values
      this.filterJournalEntriesBy = [
        { type: 'officeId', value: '' },
        { type: 'glAccountId', value: '' },
        { type: 'manualEntriesOnly', value: '' },
        { type: 'transactionId', value: '' },
        { type: 'fromDate', value: this.dateUtils.formatDate(new Date(new Date().setMonth(new Date().getMonth() - 1)), this.settingsService.dateFormat) },
        { type: 'toDate', value: this.dateUtils.formatDate(new Date(), this.settingsService.dateFormat) },
        { type: 'submittedOnDateFrom', value: '' },
        { type: 'submittedOnDateTo', value: '' },
        { type: 'dateFormat', value: this.settingsService.dateFormat },
        { type: 'locale', value: this.settingsService.language.code },
        { type: 'currency', value: '' }
      ];

      // Restore office filter
      if (savedFilters.officeId) {
        const office = this.officeData.find((o: any) => o.id === savedFilters.officeId);
        if (office) {
          this.officeName.setValue(office, { emitEvent: false });
          const index = this.filterJournalEntriesBy.findIndex(f => f.type === 'officeId');
          if (index !== -1) {
            this.filterJournalEntriesBy[index].value = office.id;
          }
        }
      }

      // Restore GL account filter
      if (savedFilters.glAccountId) {
        const glAccount = this.glAccountData.find((gl: any) => gl.id === savedFilters.glAccountId);
        if (glAccount) {
          this.glAccount.setValue(glAccount, { emitEvent: false });
          const index = this.filterJournalEntriesBy.findIndex(f => f.type === 'glAccountId');
          if (index !== -1) {
            this.filterJournalEntriesBy[index].value = glAccount.id;
          }
        }
      }

      // Restore date filters
      if (savedFilters.fromDate) {
        const fromDate = this.dateUtils.convertToDate(savedFilters.fromDate, this.settingsService.dateFormat);
        this.transactionDateFrom.setValue(fromDate, { emitEvent: false });
        const index = this.filterJournalEntriesBy.findIndex(f => f.type === 'fromDate');
        if (index !== -1) {
          this.filterJournalEntriesBy[index].value = savedFilters.fromDate;
        }
      }

      if (savedFilters.toDate) {
        const toDate = this.dateUtils.convertToDate(savedFilters.toDate, this.settingsService.dateFormat);
        this.transactionDateTo.setValue(toDate, { emitEvent: false });
        const index = this.filterJournalEntriesBy.findIndex(f => f.type === 'toDate');
        if (index !== -1) {
          this.filterJournalEntriesBy[index].value = savedFilters.toDate;
        }
      }

      if (savedFilters.submittedOnDateFrom) {
        const submittedFromDate = this.dateUtils.convertToDate(savedFilters.submittedOnDateFrom, this.settingsService.dateFormat);
        this.submittedOnDateFrom.setValue(submittedFromDate, { emitEvent: false });
        const index = this.filterJournalEntriesBy.findIndex(f => f.type === 'submittedOnDateFrom');
        if (index !== -1) {
          this.filterJournalEntriesBy[index].value = savedFilters.submittedOnDateFrom;
        }
      }

      if (savedFilters.submittedOnDateTo) {
        const submittedToDate = this.dateUtils.convertToDate(savedFilters.submittedOnDateTo, this.settingsService.dateFormat);
        this.submittedOnDateTo.setValue(submittedToDate, { emitEvent: false });
        const index = this.filterJournalEntriesBy.findIndex(f => f.type === 'submittedOnDateTo');
        if (index !== -1) {
          this.filterJournalEntriesBy[index].value = savedFilters.submittedOnDateTo;
        }
      }

      // Restore other filters
      if (savedFilters.transactionId) {
        this.transactionId.setValue(savedFilters.transactionId, { emitEvent: false });
        const index = this.filterJournalEntriesBy.findIndex(f => f.type === 'transactionId');
        if (index !== -1) {
          this.filterJournalEntriesBy[index].value = savedFilters.transactionId;
        }
      }

      if (savedFilters.manualEntriesOnly) {
        this.entryTypeFilter.setValue(savedFilters.manualEntriesOnly, { emitEvent: false });
        const index = this.filterJournalEntriesBy.findIndex(f => f.type === 'manualEntriesOnly');
        if (index !== -1) {
          this.filterJournalEntriesBy[index].value = savedFilters.manualEntriesOnly;
        }
      }

      if (savedFilters.currency) {
        this.currencyFilter.setValue(savedFilters.currency, { emitEvent: false });
        const index = this.filterJournalEntriesBy.findIndex(f => f.type === 'currency');
        if (index !== -1) {
          this.filterJournalEntriesBy[index].value = savedFilters.currency;
        }
      }

      // Load the journal entries with restored filters
      this.loadJournalEntriesPage();
    }
  }
}
