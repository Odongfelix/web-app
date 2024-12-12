import { Component, OnInit, TemplateRef, ElementRef, ViewChild, AfterViewInit } from '@angular/core';
import { UntypedFormGroup, UntypedFormBuilder, Validators, UntypedFormArray } from '@angular/forms';
import { Router, ActivatedRoute } from '@angular/router';
import { MatDialog } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';
import { catchError, tap, finalize } from 'rxjs/operators';
import { throwError, forkJoin } from 'rxjs';

/** Custom Services */
import { McurrencyService } from '../mcurrency.service';
import { SettingsService } from 'app/settings/settings.service';
import { Dates } from 'app/core/utils/dates';

/** Currency Interface */
interface Currency {
  code: string;
  id?: number;
  name?: string;
  decimalPlaces?: number;
  displaySymbol?: string;
  nameCode?: string;
  displayLabel?: string;
}

/** GL Entry Interface */
interface GLEntry {
  glAccountId: number;
  amount: number;
}

/** Journal Entry Interface */
interface JournalEntry {
  officeId: number;
  currencyCode: string;
  debits: GLEntry[];
  credits: GLEntry[];
  transactionDate: string;
  referenceNumber?: string;
  paymentTypeId?: number;
  accountNumber?: string;
  checkNumber?: string;
  routingCode?: string;
  receiptNumber?: string;
  bankNumber?: string;
  comments?: string;
  dateFormat: string;
  locale: string;
}

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
  currencyData: Currency[] = [];
  paymentTypeData: any[] = [];
  glAccountData: any[] = [];

  // Selected properties
  selectedOffice: any;
  selectedCurrency: Currency | null = null;

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
    private dialog: MatDialog,
    private snackBar: MatSnackBar
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

        // Type-safe filtering of currencies
        const allCurrencies: Currency[] = results.currencies.selectedCurrencyOptions || results.currencies || [];
        this.currencyData = allCurrencies.filter((currency: Currency) => currency.code === 'USD');

        this.paymentTypeData = results.paymentTypes || [];
        this.glAccountData = results.glAccounts || [];

        // Set default selections if available
        if (this.officeData.length > 0) {
          this.entryForm.get('officeId').setValue(this.officeData[0].id);
        }

        // Set USD as the default currency
        if (this.currencyData.length > 0) {
          this.entryForm.get('currencyCode').setValue('USD');
        } else {
          console.warn('No USD currency found in the available currencies');
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
    this.selectedCurrency = this.currencyData.find((currency: Currency) => currency.code === currencyCode) || null;
  }

  /**
   * Create entry form with validation
   */
  createEntryForm(): void {
    this.entryForm = this.formBuilder.group({
      'officeId': ['', Validators.required],
      'currencyCode': ['USD', Validators.required],
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
   * Submit form method with navigation to view transaction
   */
  submit(): void {
    // Check if the form is valid
    if (this.entryForm.valid) {
      // Prepare journal entry data
      const formattedDate = this.dateUtils.formatDate(
        this.entryForm.get('transactionDate').value,
        this.settingsService.dateFormat
      );

      // Prepare journal entry object with type safety
      const journalEntry: JournalEntry = {
        officeId: this.selectedOffice.id,
        currencyCode: this.selectedCurrency?.code || 'USD',
        transactionDate: formattedDate,
        debits: this.entryForm.get('debits').value.map((debit: {glAccountId: number, amount: number}) => ({
          glAccountId: debit.glAccountId,
          amount: debit.amount
        })),
        credits: this.entryForm.get('credits').value.map((credit: {glAccountId: number, amount: number}) => ({
          glAccountId: credit.glAccountId,
          amount: credit.amount
        })),
        referenceNumber: this.entryForm.get('referenceNumber').value,
        paymentTypeId: this.entryForm.get('paymentTypeId').value,
        accountNumber: this.entryForm.get('accountNumber').value,
        checkNumber: this.entryForm.get('checkNumber').value,
        routingCode: this.entryForm.get('routingCode').value,
        receiptNumber: this.entryForm.get('receiptNumber').value,
        bankNumber: this.entryForm.get('bankNumber').value,
        comments: this.entryForm.get('comments').value,
        dateFormat: this.settingsService.dateFormat,
        locale: this.settingsService.language.code
      };

      // Create journal entry
      this.mcurrencyService.createJournalEntry(journalEntry)
        .pipe(
          tap(response => {
            // Check if the response contains a resource ID
            if (response && response.resourceId) {
              // Show success notification
              this.snackBar.open('Journal Entry Created Successfully', 'Close', {
                duration: 3000,
                horizontalPosition: 'end',
                verticalPosition: 'top'
              });

              // Navigate to the view transaction page
              this.router.navigate(['../transactions/view', response.transactionId])
                .catch(navError => {
                  console.error('Navigation error', navError);
                  this.snackBar.open('Created, but unable to navigate to transaction view', 'Close', {
                    duration: 3000,
                    horizontalPosition: 'end',
                    verticalPosition: 'top'
                  });
                });

              // Reset form to initial state
              this.resetForm();
            } else {
              // Handle unexpected response
              this.snackBar.open('Journal Entry Created, but no transaction ID returned', 'Close', {
                duration: 3000,
                horizontalPosition: 'end',
                verticalPosition: 'top'
              });
            }
          }),
          catchError(error => {
            console.error('Failed to create journal entry', error);

            // Show error notification
            this.snackBar.open('Failed to Create Journal Entry', 'Close', {
              duration: 3000,
              horizontalPosition: 'end',
              verticalPosition: 'top'
            });

            // Mark form fields as touched to show validation errors
            Object.keys(this.entryForm.controls).forEach(key => {
              const control = this.entryForm.get(key);
              control.markAsTouched();
            });

            return throwError(error);
          })
        ).subscribe();
    } else {
      // Mark all form controls as touched to show validation errors
      Object.keys(this.entryForm.controls).forEach(key => {
        const control = this.entryForm.get(key);
        control.markAsTouched();
      });

      // Show form validation error notification
      this.snackBar.open('Please fill in all required fields', 'Close', {
        duration: 3000,
        horizontalPosition: 'end',
        verticalPosition: 'top'
      });
    }
  }

  /**
   * Reset form to initial state
   */
  private resetForm(): void {
    // Reset form
    this.entryForm.reset();

    // Reset to default values
    if (this.officeData.length > 0) {
      this.entryForm.get('officeId').setValue(this.officeData[0].id);
    }
    this.entryForm.get('currencyCode').setValue('USD');

    // Reset form arrays
    this.entryForm.setControl('debits', this.formBuilder.array([this.createAffectedGLEntryForm()]));
    this.entryForm.setControl('credits', this.formBuilder.array([this.createAffectedGLEntryForm()]));
  }

  ngAfterViewInit(): void {
    if (this.entryFormRef) {
      this.entryFormRef.nativeElement.scrollIntoView({ behavior: 'smooth' });
    }
  }
}
