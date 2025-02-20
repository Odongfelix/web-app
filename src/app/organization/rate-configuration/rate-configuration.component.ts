import { Component, OnInit, ViewChild } from '@angular/core';
import { UntypedFormBuilder, UntypedFormGroup, Validators } from '@angular/forms';
import { MatDialog } from '@angular/material/dialog';
import { MatPaginator } from '@angular/material/paginator';
import { MatSort } from '@angular/material/sort';
import { MatTableDataSource } from '@angular/material/table';
import { ActivatedRoute, Router } from '@angular/router';
import { OrganizationService } from '../organization.service';
import { SettingsService } from 'app/settings/settings.service';
import { Dates } from 'app/core/utils/dates';
import { Observable } from 'rxjs';

@Component({
  selector: 'mifosx-rate-configuration',
  templateUrl: './rate-configuration.component.html',
  styleUrls: ['./rate-configuration.component.scss']
})
export class RateConfigurationComponent implements OnInit {

  /** Minimum date allowed. */
  minDate = new Date(2000, 0, 1);
  /** Maximum date allowed. */
  maxDate = new Date();
  /** Rate Configuration form. */
  rateConfigurationForm: UntypedFormGroup;
  /** Rate Configuration data. */
  rateConfigurationData: any = [];
  /** Columns to be displayed in rates table. */
  displayedColumns: string[] = ['name', 'sourceCurrency', 'targetCurrency', 'value', 'effectiveDate', 'active', 'actions'];
  /** Data source for rates table. */
  dataSource: MatTableDataSource<any>;
  /** Available currencies */
  currencies: any[] = [];

  /** Paginator for rates table. */
  @ViewChild(MatPaginator, { static: true }) paginator: MatPaginator;
  /** Sorter for rates table. */
  @ViewChild(MatSort, { static: true }) sort: MatSort;

  /**
   * @param {FormBuilder} formBuilder Form Builder.
   * @param {OrganizationService} organizationService Organization Service.
   * @param {ActivatedRoute} route Activated Route.
   * @param {Router} router Router for navigation.
   * @param {MatDialog} dialog Dialog reference.
   * @param {SettingsService} settingsService Settings Service.
   * @param {Dates} dateUtils Date Utils.
   */
  constructor(private formBuilder: UntypedFormBuilder,
              private organizationService: OrganizationService,
              private route: ActivatedRoute,
              private router: Router,
              private dialog: MatDialog,
              private settingsService: SettingsService,
              private dateUtils: Dates) {
    this.createRateConfigurationForm();
  }

  ngOnInit() {
    this.maxDate = this.settingsService.businessDate;
    this.loadCurrencies();
    this.getRates();
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
      'active': [true],
      'effectiveDate': ['', Validators.required]
    });
  }

  /**
   * Updates the rate name based on selected currencies
   */
  private updateRateName() {
    const sourceCurrency = this.rateConfigurationForm.get('sourceCurrency').value;
    const targetCurrency = this.rateConfigurationForm.get('targetCurrency').value;

    if (sourceCurrency && targetCurrency) {
      const rateName = `${sourceCurrency}_${targetCurrency}_RATE`;
      this.rateConfigurationForm.patchValue({
        name: rateName
      }, { emitEvent: false });
    }
  }

  /**
   * Loads currencies from the API
   */
  private loadCurrencies() {
    this.organizationService.getCurrencies().subscribe((currencies: any) => {
      this.currencies = currencies.selectedCurrencyOptions;
    });
  }

  /**
   * Gets all rate configurations.
   */
  getRates() {
    // TODO: Implement API call to get rates
    this.dataSource = new MatTableDataSource(this.rateConfigurationData);
    this.dataSource.paginator = this.paginator;
    this.dataSource.sort = this.sort;
  }

  /**
   * Adds a new rate configuration
   */
  addRate() {
    if (this.rateConfigurationForm.valid) {
      const formData = this.rateConfigurationForm.value;

      // Format the data for the API
      const rateData = {
        ...formData,
        effectiveDate: this.dateUtils.formatDate(formData.effectiveDate, this.settingsService.dateFormat)
      };

      this.organizationService.createRate(rateData)
        .subscribe((response: any) => {
          // Handle success
          this.getRates(); // Refresh the rates list
          this.rateConfigurationForm.reset();
          this.rateConfigurationForm.patchValue({
            targetCurrency: 'UGX',
            active: true
          });
        });
    }
  }

  /**
   * Deletes the rate configuration.
   * @param {any} rate Rate configuration to be deleted.
   */
  deleteRate(rate: any) {
    // TODO: Implement API call to delete rate
    this.rateConfigurationData.splice(this.rateConfigurationData.indexOf(rate), 1);
    this.dataSource.connect().next(this.rateConfigurationData);
  }

  /**
   * Toggles the active status of a rate.
   * @param {any} rate Rate configuration to toggle.
   */
  toggleRateStatus(rate: any) {
    rate.active = !rate.active;
    // TODO: Implement API call to update rate status
  }

  /**
   * Converts an amount from source currency to target currency
   * @param amount Amount to convert
   * @param sourceCurrency Source currency code
   * @param targetCurrency Target currency code
   * @returns Observable of converted amount
   */
  convertCurrency(amount: number, sourceCurrency: string, targetCurrency: string): Observable<any> {
    return this.organizationService.convertCurrency(amount, sourceCurrency, targetCurrency);
  }

  /**
   * Submits the rate configuration form.
   */
  submit() {
    const rateConfiguration = this.rateConfigurationForm.value;
    const effectiveDate = this.rateConfigurationForm.get('effectiveDate').value;

    if (effectiveDate instanceof Date) {
      rateConfiguration.effectiveDate = this.dateUtils.formatDate(effectiveDate, this.settingsService.dateFormat);
    }

    // TODO: Add your service call here to save the rate configuration
    console.log('Rate Configuration:', rateConfiguration);
  }

}
