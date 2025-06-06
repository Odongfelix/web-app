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
 * Loan Prepay Loan Option
 */
@Component({
  selector: 'mifosx-prepay-loan',
  templateUrl: './prepay-loan.component.html',
  styleUrls: ['./prepay-loan.component.scss']
})
export class PrepayLoanComponent implements OnInit {

  @Input() dataObject: any;
  /** Loan Id */
  loanId: string;
  /** Payment Types */
  paymentTypes: any;
  /** Principal Portion */
  principalPortion: any;
  /** Interest Portion */
  interestPortion: any;
  /** Show Payment Details */
  showPaymentDetails = false;
  /** Minimum Date allowed. */
  minDate = new Date(2000, 0, 1);
  /** Maximum Date allowed. */
  maxDate = new Date();
  /** Prepay Loan form. */
  prepayLoanForm: UntypedFormGroup;

  prepayData: any;
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
   * Creates the prepay loan form
   * and initialize with the required values
   */
  ngOnInit() {
    this.maxDate = this.settingsService.businessDate;
    this.createPrepayLoanForm();
    this.setPrepayLoanDetails();
    this.prepayData = this.dataObject;
    if (this.dataObject.currency) {
      this.currency = this.dataObject.currency;
    }
  }

  /**
   * Creates the prepay loan form.
   */
  createPrepayLoanForm() {
    this.prepayLoanForm = this.formBuilder.group({
      'transactionDate': [this.settingsService.businessDate, Validators.required],
      'transactionAmount': ['', Validators.required],
      'externalId': '',
      'paymentTypeId': '',
      'note': '',
      'currencyType': ['UGX'],
      'usdAmount': [''],
      'exchangeRate': [''],
    });

    // Add validation logic to calculate UGX amount when USD and exchange rate are entered
    this.prepayLoanForm.get('usdAmount').valueChanges.subscribe(value => {
      if (this.prepayLoanForm.get('currencyType').value === 'USD') {
        const exchangeRate = this.prepayLoanForm.get('exchangeRate').value;
        if (value && exchangeRate) {
          const ugxAmount = value * exchangeRate;
          this.prepayLoanForm.patchValue({
            transactionAmount: ugxAmount
          }, {emitEvent: false});
        }
      }
    });

    // Add exchange rate value changes subscription
    this.prepayLoanForm.get('exchangeRate').valueChanges.subscribe(value => {
      if (this.prepayLoanForm.get('currencyType').value === 'USD') {
        const usdAmount = this.prepayLoanForm.get('usdAmount').value;
        if (usdAmount && value) {
          const ugxAmount = usdAmount * value;
          this.prepayLoanForm.patchValue({
            transactionAmount: ugxAmount
          }, {emitEvent: false});
        }
      }
    });

    // Reset USD fields when currency type changes
    this.prepayLoanForm.get('currencyType').valueChanges.subscribe(value => {
      if (value === 'UGX') {
        this.prepayLoanForm.patchValue({
          usdAmount: '',
          exchangeRate: ''
        });
      }
    });
  }

  /**
   * Sets the value in the prepay loan form
   */
  setPrepayLoanDetails() {
    this.paymentTypes = this.dataObject.paymentTypeOptions;
    this.prepayLoanForm.patchValue({
      transactionAmount: this.dataObject.amount
    });
    this.prepayLoanForm.get('transactionDate').valueChanges.subscribe((transactionDate: string) => {
      const prepayDate = this.dateUtils.formatDate(transactionDate, this.settingsService.dateFormat);

      this.loanService.getLoanPrepayLoanActionTemplate(this.loanId, prepayDate)
      .subscribe((response: any) => {
        this.prepayData = response;
        this.prepayLoanForm.patchValue({
          transactionAmount: this.prepayData.amount
        });
      });
    });
  }

  /**
   * Add payment detail fields to the UI.
   */
  addPaymentDetails() {
    this.showPaymentDetails = !this.showPaymentDetails;
    if (this.showPaymentDetails) {
      this.prepayLoanForm.addControl('accountNumber', new UntypedFormControl(''));
      this.prepayLoanForm.addControl('checkNumber', new UntypedFormControl(''));
      this.prepayLoanForm.addControl('routingCode', new UntypedFormControl(''));
      this.prepayLoanForm.addControl('receiptNumber', new UntypedFormControl(''));
      this.prepayLoanForm.addControl('bankNumber', new UntypedFormControl(''));
    } else {
      this.prepayLoanForm.removeControl('accountNumber');
      this.prepayLoanForm.removeControl('checkNumber');
      this.prepayLoanForm.removeControl('routingCode');
      this.prepayLoanForm.removeControl('receiptNumber');
      this.prepayLoanForm.removeControl('bankNumber');
    }
  }

  /**
   * Submits the prepay loan form
   */
  submit() {
    const prepayLoanFormData = this.prepayLoanForm.value;
    const locale = this.settingsService.language.code;
    const dateFormat = this.settingsService.dateFormat;
    
    if (prepayLoanFormData.transactionDate instanceof Date) {
      prepayLoanFormData.transactionDate = this.dateUtils.formatDate(prepayLoanFormData.transactionDate, dateFormat);
    }
    
    const data = {
      ...prepayLoanFormData,
      dateFormat,
      locale
    };
    
    // Ensure transaction amount is treated as a number
    data.transactionAmount = Number(data.transactionAmount);
    
    // Remove USD-related fields from final submission if not needed
    if (data.currencyType === 'UGX') {
      delete data.usdAmount;
      delete data.exchangeRate;
    }
    
    this.loanService.submitLoanActionButton(this.loanId, data, 'prepayLoan')
      .subscribe((response: any) => {
        this.router.navigate(['../../general'], { relativeTo: this.route });
      });
  }

}
