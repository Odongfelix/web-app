import { Component, OnInit, ViewChild } from '@angular/core';
import { UntypedFormBuilder, UntypedFormGroup, Validators } from '@angular/forms';
import { MatTableDataSource } from '@angular/material/table';
import { MatPaginator } from '@angular/material/paginator';
import { MatSort } from '@angular/material/sort';

@Component({
  selector: 'mifosx-rate-configuration',
  templateUrl: './rate-configuration.component.html',
  styleUrls: ['./rate-configuration.component.scss']
})
export class RateConfigurationComponent implements OnInit {

  /** Rate Configuration Form */
  rateConfigurationForm: UntypedFormGroup;

  /** Minimum Date allowed. */
  minDate = new Date(2000, 0, 1);
  /** Maximum Date allowed. */
  maxDate = new Date();

  /** Data source for rates table. */
  dataSource: MatTableDataSource<any>;

  /** Columns to be displayed in rates table. */
  displayedColumns: string[] = ['name', 'sourceCurrency', 'targetCurrency', 'value', 'effectiveDate', 'active', 'actions'];

  /** Paginator for rates table. */
  @ViewChild(MatPaginator) paginator: MatPaginator;
  /** Sorter for rates table. */
  @ViewChild(MatSort) sort: MatSort;

  /** Sample currencies */
  currencies = [
    { code: 'USD', name: 'US Dollar' },
    { code: 'EUR', name: 'Euro' },
    { code: 'GBP', name: 'British Pound' },
    { code: 'UGX', name: 'Ugandan Shilling' }
  ];

  /** Rates data */
  rates: any[] = [];

  constructor(private formBuilder: UntypedFormBuilder) {
    this.createRateConfigurationForm();
  }

  ngOnInit() {
    this.dataSource = new MatTableDataSource(this.rates);
    this.dataSource.paginator = this.paginator;
    this.dataSource.sort = this.sort;
  }

  /**
   * Creates the rate configuration form.
   */
  createRateConfigurationForm() {
    this.rateConfigurationForm = this.formBuilder.group({
      'name': ['', Validators.required],
      'sourceCurrency': ['', Validators.required],
      'targetCurrency': ['UGX', Validators.required],
      'value': ['', [Validators.required, Validators.min(0)]],
      'effectiveDate': ['', Validators.required],
      'active': [true]
    });
  }

  /**
   * Adds a new rate configuration
   */
  addRate() {
    if (this.rateConfigurationForm.valid) {
      const formData = this.rateConfigurationForm.value;
      this.rates.push(formData);
      this.dataSource.data = this.rates;
      
      // Reset form
      this.rateConfigurationForm.reset();
      this.rateConfigurationForm.patchValue({
        targetCurrency: 'UGX',
        active: true
      });
    }
  }

  /**
   * Deletes a rate
   */
  deleteRate(rate: any) {
    const index = this.rates.indexOf(rate);
    if (index > -1) {
      this.rates.splice(index, 1);
      this.dataSource.data = this.rates;
    }
  }

  /**
   * Toggles rate status
   */
  toggleRateStatus(rate: any) {
    rate.active = !rate.active;
  }
} 