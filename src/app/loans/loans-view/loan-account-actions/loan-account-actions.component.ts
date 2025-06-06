/** Angular Imports. */
import { Component } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';

/**
 * Loan Account Actions component.
 */
@Component({
  selector: 'mifosx-loan-account-actions',
  templateUrl: './loan-account-actions.component.html',
  styleUrls: ['./loan-account-actions.component.scss']
})
export class LoanAccountActionsComponent {

  /** Loan Details Data */
  navigationData: any;

  /** flag object to store possible actions and render appropriate UI to the user */
  actions: {
    'Close': boolean,
    'Undo Approval': boolean,
    'Write Off': boolean,
    'Add Collateral': boolean,
    'Assign Loan Officer': boolean,
    'Foreclosure': boolean,
    'Prepay Loan': boolean,
    'Reject': boolean,
    'Disburse to Savings': boolean,
    'Make Repayment': boolean,
    'Waive Interest': boolean,
    'Close (as Rescheduled)': boolean,
    'Reschedule': boolean,
    'Recovery Payment': boolean,
    'View Guarantors': boolean,
    'Create Guarantor': boolean,
    'Disburse': boolean,
    'Withdrawn by Client': boolean,
    'Undo Disbursal': boolean,
    'Undo Last Disbursal': boolean,
    'Loan Screen Reports': boolean,
    'Approve': boolean,
    'Add Loan Charge': boolean,
    'Goodwill Credit': boolean,
    'Merchant Issued Refund': boolean,
    'Payout Refund': boolean,
    'Credit Balance Refund': boolean,
    'Edit Repayment Schedule': boolean,
    'Charge-Off': boolean,
    'Sell Loan': boolean,
    'Buy Back Loan': boolean,
    'Re-Age': boolean,
    'Re-Amortize': boolean,
    'Interest Payment Waiver': boolean,
    'Add Interest Pause': boolean
  } = {
      'Close': false,
      'Undo Approval': false,
      'Write Off': false,
      'Add Collateral': false,
      'Assign Loan Officer': false,
      'Foreclosure': false,
      'Prepay Loan': false,
      'Reject': false,
      'Disburse to Savings': false,
      'Make Repayment': false,
      'Waive Interest': false,
      'Close (as Rescheduled)': false,
      'Reschedule': false,
      'Recovery Payment': false,
      'View Guarantors': false,
      'Create Guarantor': false,
      'Disburse': false,
      'Withdrawn by Client': false,
      'Undo Disbursal': false,
      'Undo Last Disbursal': false,
      'Loan Screen Reports': false,
      'Approve': false,
      'Add Loan Charge': false,
      'Goodwill Credit': false,
      'Merchant Issued Refund': false,
      'Payout Refund': false,
      'Credit Balance Refund': false,
      'Edit Repayment Schedule': false,
      'Charge-Off': false,
      'Sell Loan': false,
      'Buy Back Loan': false,
      'Re-Age': false,
      'Re-Amortize': false,
      'Interest Payment Waiver': false,
      'Add Interest Pause': false
    };

  actionButtonData: any;
  actionName: any;

  /**
   * @param route Activated Route.
   */
  constructor(private route: ActivatedRoute,
    private router: Router
  ) {
    const navigation = this.router.getCurrentNavigation();
    this.navigationData = navigation?.extras?.state?.data;

    this.route.data.subscribe((data: { actionButtonData: any }) => {
      this.actionButtonData = data.actionButtonData;
    });

    this.route.params.subscribe(params => {
      this.actionName = params['action'];
      if (this.actionName === 'Change Loan Officer') {
        this.actionName = 'Assign Loan Officer';
      }
      for (const key of Object.keys(this.actions)) {
        this.actions[key] = false;
      }
      this.actions[this.actionName] = true;
    });
  }

}
