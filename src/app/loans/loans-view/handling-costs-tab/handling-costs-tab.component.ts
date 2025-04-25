import { Component, OnInit } from '@angular/core';
import { ActivatedRoute } from '@angular/router';

interface Charge {
  id: number;
  name: string;
  amount: number;
  chargeTimeType: {
    value: string;
  };
  paid: boolean;
}

interface HandlingCosts {
  administrative: Charge[];
  processing: Charge[];
  documentation: Charge[];
  other: Charge[];
}

@Component({
  selector: 'mifosx-handling-costs-tab',
  templateUrl: './handling-costs-tab.component.html',
  styleUrls: ['./handling-costs-tab.component.scss']
})
export class HandlingCostsTabComponent implements OnInit {
  loanId: string;
  // Test data
  handlingCosts: HandlingCosts = {
    administrative: [
      { id: 1, name: 'Administrative Fee', amount: 100, chargeTimeType: { value: 'Disbursement' }, paid: false },
      { id: 2, name: 'Admin Processing', amount: 50, chargeTimeType: { value: 'Specified Due Date' }, paid: true }
    ],
    processing: [
      { id: 3, name: 'Processing Fee', amount: 75, chargeTimeType: { value: 'Disbursement' }, paid: false },
      { id: 4, name: 'Processing Charge', amount: 25, chargeTimeType: { value: 'Specified Due Date' }, paid: true }
    ],
    documentation: [
      { id: 5, name: 'Documentation Fee', amount: 30, chargeTimeType: { value: 'Disbursement' }, paid: false }
    ],
    other: [
      { id: 6, name: 'Operational Cost', amount: 45, chargeTimeType: { value: 'Specified Due Date' }, paid: false },
      { id: 7, name: 'Miscellaneous Fee', amount: 20, chargeTimeType: { value: 'Disbursement' }, paid: true }
    ]
  };

  displayedColumns: string[] = ['name', 'amount', 'collectedOn', 'status', 'action'];

  constructor(private route: ActivatedRoute) {
    this.loanId = this.route.parent?.snapshot.paramMap.get('loanId') || '';
  }

  ngOnInit() {
    // No HTTP requests, just using test data
    console.log(`Displaying handling costs for loan ID: ${this.loanId}`);
  }

  addCharge(type: string) {
    console.log(`Adding ${type} charge for loan ${this.loanId}`);
  }

  viewCharge(chargeId: number) {
    console.log(`Viewing charge ${chargeId} for loan ${this.loanId}`);
  }

  editCharge(chargeId: number) {
    console.log(`Editing charge ${chargeId} for loan ${this.loanId}`);
  }

  deleteCharge(chargeId: number) {
    console.log(`Deleting charge ${chargeId} for loan ${this.loanId}`);
  }

  calculateTotal(charges: Charge[]): number {
    return charges.reduce((sum, charge) => sum + (charge.amount || 0), 0);
  }

  getOverallTotal(): number {
    return this.calculateTotal(this.handlingCosts.administrative) +
           this.calculateTotal(this.handlingCosts.processing) +
           this.calculateTotal(this.handlingCosts.documentation) +
           this.calculateTotal(this.handlingCosts.other);
  }
} 