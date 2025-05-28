/** Angular Imports */
import { Component, OnInit, TemplateRef, ElementRef, ViewChild, AfterViewInit } from '@angular/core';
import { UntypedFormGroup, UntypedFormBuilder, Validators, UntypedFormArray } from '@angular/forms';
import { Router, ActivatedRoute } from '@angular/router';
import { MatDialog } from '@angular/material/dialog';

/** Custom Services */
import { AccountingService } from '../accounting.service';
import { SettingsService } from 'app/settings/settings.service';
import { Dates } from 'app/core/utils/dates';
import { PopoverService } from '../../configuration-wizard/popover/popover.service';
import { ConfigurationWizardService } from '../../configuration-wizard/configuration-wizard.service';
import { Currency } from 'app/shared/models/general.model';
import { environment } from 'environments/environment';

/** Custom Dialog Component */
import { NextStepDialogComponent } from '../../configuration-wizard/next-step-dialog/next-step-dialog.component';

/**
 * Create Journal Entry component.
 */
@Component({
  selector: 'mifosx-create-journal-entry',
  templateUrl: './create-journal-entry.component.html',
  styleUrls: ['./create-journal-entry.component.scss']
})
export class CreateJournalEntryComponent implements OnInit, AfterViewInit {
  /** Minimum transaction date allowed. */
  minDate = new Date(2000, 0, 1);
  /** Maximum transaction date allowed. */
  maxDate = new Date();
  /** Journal entry form. */
  journalEntryForm: UntypedFormGroup;
  /** Office data. */
  officeData: any;
  /** Currency data. */
  currencyData: Currency[];
  /** Payment type data. */
  paymentTypeData: any;
  /** Gl Account data. */
  glAccountData: any;
  /** Selected currency */
  selectedCurrency: Currency;
  /** Show currency rate field */
  showCurrencyRate = false;
  /** Default currency code */
  defaultCurrency = 'UGX';
  /** Total debit amount */
  totalDebitAmount = 0;

  /* Reference of create journal form */
  @ViewChild('createJournalFormRef') createJournalFormRef: ElementRef<any>;
  /* Template for popover on create journal form */
  @ViewChild('templateCreateJournalFormRef') templateCreateJournalFormRef: TemplateRef<any>;

  /**
   * Retrieves the offices, currencies, payment types and gl accounts data from `resolve`.
   * @param {FormBuilder} formBuilder Form Builder.
   * @param {AccountingService} accountingService Accounting Service.
   * @param {SettingsService} settingsService Settings Service.
   * @param {ActivatedRoute} route Activated Route.
   * @param {Router} router Router for navigation.
   * @param {ConfigurationWizardService} configurationWizardService ConfigurationWizard Service.
   * @param {PopoverService} popoverService PopoverService.
   */
  constructor(private formBuilder: UntypedFormBuilder,
              private accountingService: AccountingService,
              private settingsService: SettingsService,
              private dateUtils: Dates,
              private route: ActivatedRoute,
              private router: Router,
              private dialog: MatDialog,
              private configurationWizardService: ConfigurationWizardService,
              private popoverService: PopoverService) {
    this.route.data.subscribe((data: {
      offices: any,
      currencies: any,
      paymentTypes: any,
      glAccounts: any
    }) => {
      this.officeData = data.offices;
      this.currencyData = data.currencies.selectedCurrencyOptions;
      this.paymentTypeData = data.paymentTypes;
      this.glAccountData = data.glAccounts;
    });
  }

  /**
   * Creates the affected gl entry form.
   * @returns {FormGroup} Affected gl entry form.
   */
  createAffectedGLEntryForm(): UntypedFormGroup {
    return this.formBuilder.group({
      'glAccountId': ['', Validators.required],
      'amount': ['', Validators.required]
    });
  }

  /**
   * Creates the journal entry form.
   */
  ngOnInit() {
    this.maxDate = this.settingsService.businessDate;
    this.createJournalEntryForm();
  }

  /**
   * Creates the journal entry form.
   */
  createJournalEntryForm() {
    this.journalEntryForm = this.formBuilder.group({
      'officeId': ['', Validators.required],
      'currencyCode': ['', Validators.required],
      'currencyRate': [''],
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

    // Subscribe to currency changes
    this.journalEntryForm.get('currencyCode').valueChanges.subscribe(currencyCode => {
      this.selectedCurrency = this.currencyData.find((currency: Currency) => currency.code === currencyCode);
      this.showCurrencyRate = this.selectedCurrency && this.selectedCurrency.code !== this.defaultCurrency;

      if (this.showCurrencyRate) {
        this.journalEntryForm.get('currencyRate').enable();
        this.journalEntryForm.get('currencyRate').setValidators([Validators.required]);
      } else {
        this.journalEntryForm.get('currencyRate').disable();
        this.journalEntryForm.get('currencyRate').clearValidators();
        this.journalEntryForm.get('currencyRate').setValue('');
        this.journalEntryForm.get('comments').setValue('');
      }
      this.journalEntryForm.get('currencyRate').updateValueAndValidity();
    });

    // Subscribe to currency rate changes
    this.journalEntryForm.get('currencyRate').valueChanges.subscribe(rate => {
      if (this.showCurrencyRate && rate) {
        this.updateDescriptionWithRate(rate);
      }
    });

    // Subscribe to debit amount changes
    this.debits.valueChanges.subscribe(() => {
      this.calculateTotalDebitAmount();
      if (this.showCurrencyRate && this.journalEntryForm.get('currencyRate').value) {
        this.updateDescriptionWithRate(this.journalEntryForm.get('currencyRate').value);
      }
    });
  }

  /**
   * Calculates the total debit amount
   */
  calculateTotalDebitAmount() {
    this.totalDebitAmount = this.debits.controls.reduce((total, control) => {
      return total + (Number(control.get('amount').value) || 0);
    }, 0);
  }

  /**
   * Updates the description with the amount and rate information
   * @param rate The currency rate
   */
  updateDescriptionWithRate(rate: number) {
    if (this.totalDebitAmount > 0) {
      const description = `$${this.totalDebitAmount} at the rate ${rate}`;
      this.journalEntryForm.get('comments').setValue(description);
    }
  }

  /**
   * Gets the affected gl entry (debits) form array.
   * @returns {FormArray} Debits form array.
   */
  get debits(): UntypedFormArray {
    return this.journalEntryForm.get('debits') as UntypedFormArray;
  }

  /**
   * Gets the affected gl entry (credits) form array.
   * @returns {FormArray} Credits form array.
   */
  get credits(): UntypedFormArray {
    return this.journalEntryForm.get('credits') as UntypedFormArray;
  }

  /**
   * Adds the affected gl entry form to given affected gl entry form array.
   * @param {FormArray} affectedGLEntryFormArray Given affected gl entry form array (debit/credit).
   */
  addAffectedGLEntry(affectedGLEntryFormArray: UntypedFormArray) {
    affectedGLEntryFormArray.push(this.createAffectedGLEntryForm());
  }

  /**
   * Removes the affected gl entry form from given affected gl entry form array at given index.
   * @param {FormArray} affectedGLEntryFormArray Given affected gl entry form array (debit/credit).
   * @param {number} index Array index from where affected gl entry form needs to be removed.
   */
  removeAffectedGLEntry(affectedGLEntryFormArray: UntypedFormArray, index: number) {
    affectedGLEntryFormArray.removeAt(index);
  }

  /**
   * Submits the journal entries form and creates journal entry,
   * if successful redirects to view created transaction.
   */
  submit() {
    const journalEntry = this.journalEntryForm.value;

    if (journalEntry.transactionDate instanceof Date) {
      journalEntry.transactionDate = this.dateUtils.formatDate(journalEntry.transactionDate, this.settingsService.dateFormat);
    }

    // Only include currency rate if it's enabled and has a value
    if (!this.showCurrencyRate || !journalEntry.currencyRate) {
      delete journalEntry.currencyRate;
    }

    journalEntry.locale = this.settingsService.language.code;
    journalEntry.dateFormat = this.settingsService.dateFormat;

    this.accountingService.createJournalEntry(journalEntry).subscribe((response: any) => {
      this.router.navigate(['/accounting/journal-entries/transactions/view', response.transactionId]);
    });
  }

  /**
   * Popover function
   * @param template TemplateRef<any>.
   * @param target HTMLElement | ElementRef<any>.
   * @param position String.
   * @param backdrop Boolean.
   */
  showPopover(template: TemplateRef<any>, target: HTMLElement | ElementRef<any>, position: string, backdrop: boolean): void {
    setTimeout(() => this.popoverService.open(template, target, position, backdrop, {}), 200);
  }

  /**
   * To show popover.
   */
  ngAfterViewInit() {
    if (this.configurationWizardService.showCreateJournalEntries === true) {
      setTimeout(() => {
        this.showPopover(this.templateCreateJournalFormRef, this.createJournalFormRef.nativeElement, 'top', true);
      });
    }
  }

  /**
   * opens dialog for next step Configuration Wizard.
   */
  nextStep() {
    this.configurationWizardService.showCreateJournalEntries = false;
    this.openNextStepDialog();
  }

  /**
   * Previous Step (Create journal entry Accounting Page) Configuration Wizard.
   */
  previousStep() {
    this.router.navigate(['/accounting']);
  }

  /**
   * Next Step (Products) Dialog Configuration Wizard.
   */
  openNextStepDialog() {
    const nextStepDialogRef = this.dialog.open(NextStepDialogComponent, {
      data: {
        nextStepName: 'Setup Products',
        previousStepName: 'Accounting',
        stepPercentage: 74
      }
    });
    nextStepDialogRef.afterClosed().subscribe((response: { nextStep: boolean }) => {
      if (response.nextStep) {
        this.configurationWizardService.showCreateJournalEntries = false;
        this.configurationWizardService.showCharges = true;
        this.router.navigate(['/products']);
      } else {
        this.configurationWizardService.showCreateJournalEntries = false;
        this.router.navigate(['/home']);
      }
    });
  }
}
