/** Angular Imports */
import { Component, OnInit, Input } from '@angular/core';
import { UntypedFormGroup, UntypedFormBuilder, Validators, UntypedFormControl } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';

/** Custom Services */
import { LoansService } from 'app/loans/loans.service';
import { SettingsService } from 'app/settings/settings.service';
import { Dates } from 'app/core/utils/dates';
import { Currency } from 'app/shared/models/general.model';

/**
 * Loan Make Repayment Component
 */
@Component({
  selector: 'mifosx-make-repayment',
  templateUrl: './make-repayment.component.html',
  styleUrls: ['./make-repayment.component.scss']
})
export class MakeRepaymentComponent implements OnInit {

  @Input() dataObject: any;
  /** Loan Id */
  loanId: string;
  /** Payment Type Options */
  paymentTypes: any;
  /** Show payment details */
  showPaymentDetails = false;
  /** Minimum Date allowed. */
  minDate = new Date(2000, 0, 1);
  /** Maximum Date allowed. */
  maxDate = new Date();
  /** Repayment Loan Form */
  repaymentLoanForm: UntypedFormGroup;
  currency: Currency | null = null;

  /**
   * @param {FormBuilder} formBuilder Form Builder.
   * @param {LoansService} loanService Loan Service.
   * @param {ActivatedRoute} route Activated Route.
   * @param {Router} router Router for navigation.
   * @param {SettingsService} settingsService Settings Service
   */
  constructor(private formBuilder: UntypedFormBuilder,
    private loanService: LoansService,
    private route: ActivatedRoute,
    private router: Router,
    private dateUtils: Dates,
    private settingsService: SettingsService) {
      this.loanId = this.route.snapshot.params['loanId'];
    }

  /**
   * Creates the repayment loan form
   * and initialize with the required values
   */
  ngOnInit() {
    this.maxDate = this.settingsService.businessDate;
    this.createRepaymentLoanForm();
    this.setRepaymentLoanDetails();
    if (this.dataObject.currency) {
      this.currency = this.dataObject.currency;
    }
  }

  /**
   * Creates the create close form.
   */
  createRepaymentLoanForm() {
    this.repaymentLoanForm = this.formBuilder.group({
      'transactionDate': [this.settingsService.businessDate, Validators.required],
      'transactionAmount': ['', Validators.required],
      'externalId': '',
      'paymentTypeId': '',
      'note': '',
      currencyType: ['UGX'],
      usdAmount: [''],
      exchangeRate: ['']
    });

    // Add validation logic to calculate UGX amount when USD and exchange rate are entered
    this.repaymentLoanForm.get('usdAmount').valueChanges.subscribe(value => {
      if (this.repaymentLoanForm.get('currencyType').value === 'USD') {
        const exchangeRate = this.repaymentLoanForm.get('exchangeRate').value;
        if (value && exchangeRate) {
          const ugxAmount = value * exchangeRate;
          this.repaymentLoanForm.patchValue({
            transactionAmount: ugxAmount
          }, {emitEvent: false});
        }
      }
    });
  }

  setRepaymentLoanDetails() {
    this.paymentTypes = this.dataObject.paymentTypeOptions;
    
    // Find the "Notes and Coins" payment type
    const notesAndCoinsPaymentType = this.paymentTypes.find((type: any) => 
      type.name.toLowerCase().includes('notes') && type.name.toLowerCase().includes('coins')
    );
    
    // Set the default payment type to "Notes and Coins" if found, otherwise use the first available option
    const defaultPaymentTypeId = notesAndCoinsPaymentType ? notesAndCoinsPaymentType.id : 
                                (this.paymentTypes.length > 0 ? this.paymentTypes[0].id : '');
    
    this.repaymentLoanForm.patchValue({
      transactionAmount: this.dataObject.amount,
      paymentTypeId: defaultPaymentTypeId
    });
  }

  /**
   * Add payment detail fields to the UI.
   */
  addPaymentDetails() {
    this.showPaymentDetails = !this.showPaymentDetails;
    if (this.showPaymentDetails) {
      this.repaymentLoanForm.addControl('accountNumber', new UntypedFormControl(''));
      this.repaymentLoanForm.addControl('checkNumber', new UntypedFormControl(''));
      this.repaymentLoanForm.addControl('routingCode', new UntypedFormControl(''));
      this.repaymentLoanForm.addControl('receiptNumber', new UntypedFormControl(''));
      this.repaymentLoanForm.addControl('bankNumber', new UntypedFormControl(''));
    } else {
      this.repaymentLoanForm.removeControl('accountNumber');
      this.repaymentLoanForm.removeControl('checkNumber');
      this.repaymentLoanForm.removeControl('routingCode');
      this.repaymentLoanForm.removeControl('receiptNumber');
      this.repaymentLoanForm.removeControl('bankNumber');
    }
  }

  /** Submits the repayment form */
  submit() {
    const formData = this.repaymentLoanForm.value;
    const locale = this.settingsService.language.code;
    const dateFormat = this.settingsService.dateFormat;

    // Destructure the form data, excluding currency-related fields
    const {
      currencyType,
      usdAmount,
      exchangeRate,
      transactionDate,
      transactionAmount,
      paymentTypeId,
      note,
      accountNumber,
      checkNumber,
      routingCode,
      receiptNumber,
      bankNumber,
      externalId,
      ...rest
    } = formData;

    const data = {
      transactionDate: this.dateUtils.formatDate(transactionDate, dateFormat),
      transactionAmount,
      paymentTypeId,
      note,
      accountNumber,
      checkNumber,
      routingCode,
      receiptNumber,
      bankNumber,
      externalId,
      dateFormat,
      locale
    };

    // Remove null or undefined values
    Object.keys(data).forEach(key => {
      if (data[key] === null || data[key] === undefined || data[key] === '') {
        delete data[key];
      }
    });

    this.loanService.submitLoanActionButton(this.loanId, data, 'repayment')
      .subscribe((response: any) => {
        this.router.navigate(['../../general'], { relativeTo: this.route });
    });
  }

}
