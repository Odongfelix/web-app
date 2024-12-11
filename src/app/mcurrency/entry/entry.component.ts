import { Component, OnInit, TemplateRef, ElementRef, ViewChild, AfterViewInit } from '@angular/core';
import { UntypedFormGroup, UntypedFormBuilder, Validators, UntypedFormArray } from '@angular/forms';
import { Router, ActivatedRoute } from '@angular/router';
import { MatDialog } from '@angular/material/dialog';
import { catchError, tap, finalize } from 'rxjs/operators';
import { throwError, forkJoin } from 'rxjs';

/** Custom Services */
import { McurrencyService } from '../mcurrency.service';
import { SettingsService } from 'app/settings/settings.service';
import { Dates } from 'app/core/utils/dates';

@Component({
  selector: 'mifosx-entry',
  templateUrl: './entry.component.html',
  styleUrls: ['./entry.component.scss']
})
export class EntryComponent implements OnInit, AfterViewInit {
  // Date range for transaction
  minDate: Date = new Date(2000, 0, 1);
  maxDate: Date = new Date();

  // Form and data properties
  entryForm: UntypedFormGroup;
  officeData: any[] = [];
  currencyData: any[] = [];
  paymentTypeData: any[] = [];
  glAccountData: any[] = [];

  // Selected properties
  selectedOffice: any;
  selectedCurrency: any;

  // Error handling properties
  loadingData = true;
  dataLoadError: string | null = null;

  /*Reference to create journal form*/
  @ViewChild('entryFormRef') entryFormRef: ElementRef<any>;
  @ViewChild('templateEntryFormRef') templateEntryFormRef: TemplateRef<any>;

  constructor(
    private formBuilder: UntypedFormBuilder,
    private mcurrencyService: McurrencyService,
    private settingsService: SettingsService,
    private dateUtils: Dates,
    private route: ActivatedRoute,
    private router: Router,
    private dialog: MatDialog
  ) {}

  ngOnInit(): void {
    // Set max date to business date
    this.maxDate = this.settingsService.businessDate;

    // Fetch all required data
    this.fetchAllData();

    // Create the entry form
    this.createEntryForm();

    // Subscribe to office changes
    this.entryForm.get('officeId').valueChanges.subscribe(officeId => {
      this.updateSelectedOffice(officeId);
    });

    // Subscribe to currency code changes
    this.entryForm.get('currencyCode').valueChanges.subscribe(currencyCode => {
      this.updateSelectedCurrency(currencyCode);
    });
  }

  /**
   * Fetch all required data for the component
   */
  fetchAllData(): void {
    this.loadingData = true;
    this.dataLoadError = null;

    // Use forkJoin to handle multiple observables
    forkJoin({
      offices: this.mcurrencyService.getOffices(),
      currencies: this.mcurrencyService.getCurrencies(),
      paymentTypes: this.mcurrencyService.getPaymentTypes(),
      glAccounts: this.mcurrencyService.getGlAccounts()
    }).pipe(
      tap(results => {
        // Process each data set
        this.officeData = results.offices || [];
        this.currencyData = results.currencies.selectedCurrencyOptions || results.currencies || [];
        this.paymentTypeData = results.paymentTypes || [];
        this.glAccountData = results.glAccounts || [];

        // Set default selections if available
        if (this.officeData.length > 0) {
          this.entryForm.get('officeId').setValue(this.officeData[0].id);
        }

        if (this.currencyData.length > 0) {
          this.entryForm.get('currencyCode').setValue(this.currencyData[0].code);
        }
      }),
      catchError(error => {
        // Comprehensive error handling
        this.loadingData = false;
        this.dataLoadError = 'Failed to load required data. Please try again.';
        console.error('Data fetch comprehensive error:', error);
        return throwError(error);
      }),
      finalize(() => {
        // Ensure loading state is set to false
        this.loadingData = false;
      })
    ).subscribe();
  }

  /**
   * Update selected office based on office ID
   */
  updateSelectedOffice(officeId: number): void {
    this.selectedOffice = this.officeData.find(office => office.id === officeId);
  }

  /**
   * Update selected currency based on currency code
   */
  updateSelectedCurrency(currencyCode: string): void {
    this.selectedCurrency = this.currencyData.find(currency => currency.code === currencyCode);
  }

  /**
   * Create entry form with validation
   */
  createEntryForm(): void {
    this.entryForm = this.formBuilder.group({
      'officeId': ['', Validators.required],
      'currencyCode': ['', Validators.required],
      'debits': this.formBuilder.array([this.createAffectedGLEntryForm()]),
      'credits': this.formBuilder.array([this.createAffectedGLEntryForm()]),
      'referenceNumber': [''],
      'transactionDate': ['', Validators.required],
      'paymentTypeId': [''],
      'accountNumber': [''],
      'checkNumber': [''],
      'routingCode': [''],
      'receiptNumber': [''],
      'bankNumber': [''],
      'comments': ['']
    });
  }

  /**
   * Create form group for affected GL entry
   */
  createAffectedGLEntryForm(): UntypedFormGroup {
    return this.formBuilder.group({
      'glAccountId': ['', Validators.required],
      'amount': ['', [Validators.required, Validators.min(0)]]
    });
  }

  /**
   * Getter for debits form array
   */
  get debits(): UntypedFormArray {
    return this.entryForm.get('debits') as UntypedFormArray;
  }

  /**
   * Getter for credits form array
   */
  get credits(): UntypedFormArray {
    return this.entryForm.get('credits') as UntypedFormArray;
  }

  /**
   * Add a new affected GL entry to form array
   */
  addAffectedGLEntry(affectedGLEntryFormArray: UntypedFormArray) {
    affectedGLEntryFormArray.push(this.createAffectedGLEntryForm());
  }

  /**
   * Remove an affected GL entry from form array
   */
  removeAffectedGLEntry(affectedGLEntryFormArray: UntypedFormArray, index: number) {
    if (affectedGLEntryFormArray.length > 1) {
      affectedGLEntryFormArray.removeAt(index);
    }
  }

  /**
   * Submit form method
   */
  submit(): void {
    if (this.entryForm.valid) {
      // Prepare journal entry data
      const journalEntry = {
        ...this.entryForm.value,
        officeId: this.selectedOffice.id,
        currencyCode: this.selectedCurrency.code
      };

      // Create journal entry
      this.mcurrencyService.createJournalEntry(journalEntry)
        .pipe(
          tap(response => {
            // Perform success operations (e.g., reset form, show notification, or navigate)
            console.log('Journal entry successfully created', response);
            this.entryForm.reset();
            // Optionally, navigate to another page
            // this.router.navigate(['/desired-path']);
          }),
          catchError(error => {
            // Log the error and handle it (e.g., show a toast notification)
            console.error('Failed to create journal entry', error);
            return throwError(error);
          })
        ).subscribe();
    } else {
      console.warn('Form is invalid');
    }
  }

  ngAfterViewInit(): void {
    if (this.entryFormRef) {
      this.entryFormRef.nativeElement.scrollIntoView({ behavior: 'smooth' });
    }
  }
}
