import { Component, OnInit } from '@angular/core';
import { UntypedFormBuilder, UntypedFormGroup, Validators } from '@angular/forms';
import { MatDialogRef } from '@angular/material/dialog';

interface GLAccount {
  id: number;
  name: string;
  glCode: string;
}

@Component({
  selector: 'mifosx-add-cost-dialog',
  templateUrl: './add-cost-dialog.component.html',
  styleUrls: ['./add-cost-dialog.component.scss']
})
export class AddCostDialogComponent implements OnInit {
  costForm: UntypedFormGroup;

  categories = [
    'Legal',
    'Administrative',
    'Insurance',
    'Valuation',
    'Penalty',
    'Other'
  ];

  // Mock GL accounts data (replace with actual GL accounts from your service)
  glAccounts: GLAccount[] = [
    { id: 1, name: 'Legal Expenses', glCode: '10001' },
    { id: 2, name: 'Processing Fees', glCode: '10002' },
    { id: 3, name: 'Insurance Charges', glCode: '10003' },
    { id: 4, name: 'Documentation Fees', glCode: '10004' },
    { id: 5, name: 'Valuation Fees', glCode: '10005' }
  ];

  constructor(
    private formBuilder: UntypedFormBuilder,
    public dialogRef: MatDialogRef<AddCostDialogComponent>
  ) {
    this.costForm = this.formBuilder.group({
      'date': ['', Validators.required],
      'description': ['', Validators.required],
      'amount': ['', [Validators.required, Validators.min(0)]],
      'category': ['', Validators.required],
      'glAccount': ['', Validators.required],
      'notes': ['']
    });
  }

  ngOnInit() {
  }

  submit() {
    if (this.costForm.valid) {
      this.dialogRef.close(this.costForm.value);
    }
  }

  onCancel() {
    this.dialogRef.close();
  }
} 