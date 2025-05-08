/** Angular Imports */
import { Component, OnInit, OnDestroy } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { UntypedFormControl, UntypedFormGroup, Validators } from '@angular/forms';

/** rxjs Imports */
import { ReplaySubject, Subject } from 'rxjs';
import { takeUntil, debounceTime } from 'rxjs/operators';

/** Custom Services */
import { ReportsService } from '../reports.service';
import { SettingsService } from 'app/settings/settings.service';
import { AccountingService } from 'app/accounting/accounting.service';

/** Custom Models */
import { ReportParameter } from '../common-models/report-parameter.model';
import { SelectOption } from '../common-models/select-option.model';
import { Dates } from 'app/core/utils/dates';
import { GlobalConfiguration } from 'app/system/configurations/global-configurations-tab/configuration.model';
import { GLAccount } from 'app/shared/models/general.model';

import * as XLSX from 'xlsx';
import { AlertService } from 'app/core/alert/alert.service';

/**
 * Run report component.
 */
@Component({
  selector: 'mifosx-run-report',
  templateUrl: './run-report.component.html',
  styleUrls: ['./run-report.component.scss']
})
export class RunReportComponent implements OnInit, OnDestroy {

  /** Minimum date allowed. */
  minDate = new Date(2000, 0, 1);
  /** Maximum date allowed. */
  maxDate = new Date();

  /** Contains report specifications i.e: name, type and id */
  report: any = {};
  /** Formatted data post labeling of report parameters fetched from API */
  paramData: ReportParameter[] = [];
  /** Array of all parent parameters */
  parentParameters: any[] = [];
  /** Parameter data to configure pentaho output */
  pentahoReportParameters: any[] = [];
  /** Data to be passed on to component selectors */
  dataObject: any;

  /** Initializes new form group eportForm */
  reportForm = new UntypedFormGroup({});
  /** Static Form control for decimal places in output */
  decimalChoice = new UntypedFormControl();

  /** Toggles Report form */
  isCollapsed = false;
  /** Toggles  Table output. */
  hideTable = true;
   /** Toggles Chart output */
  hideChart = true;
   /** Toggles Pentaho output */
  hidePentaho = true;
  /** Report uses dates */
  reportUsesDates = false;
  exportToS3Allowed = false;
  reportToBeExportedInRepository: any;
  exportToS3Repository: string;
  outputTypeOptions: any[] = [];

  isProcessing = false;
  
  /** GL Account data */
  glAccountData: GLAccount[] = [];
  
  /** For custom filters */
  glAccountFilterCtrl: UntypedFormControl = new UntypedFormControl('');
  filteredGLAccounts: ReplaySubject<GLAccount[]> = new ReplaySubject<GLAccount[]>(1);
  
  /** App User data */
  appUserData: any[] = [];
  
  /** For app user filter */
  appUserFilterCtrl: UntypedFormControl = new UntypedFormControl('');
  filteredAppUsers: ReplaySubject<any[]> = new ReplaySubject<any[]>(1);
  
  // Parameter type maps to track filter controls and filtered data
  paramFilterCtrls: { [key: string]: UntypedFormControl } = {};
  filteredOptions: { [key: string]: ReplaySubject<any[]> } = {};
  
  private _onDestroy = new Subject<void>();

  /**
   * Fetches report specifications from route params and retrieves report parameters data from `resolve`.
   * @param {ActivatedRoute} route ActivatedRoute.
   * @param {ReportsService} reportsService ReportsService
   * @param {SettingsService} settingsService Settings Service
   * @param {Dates} dateUtils Date Utils
   * @param {AccountingService} accountingService Accounting Service
   */
  constructor(private route: ActivatedRoute,
              private reportsService: ReportsService,
              private settingsService: SettingsService,
              private alertService: AlertService,
              private accountingService: AccountingService,
              private dateUtils: Dates) {
    this.report.name = this.route.snapshot.params['name'];
    this.route.queryParams.subscribe((queryParams: { type: any, id: any }) => {
      this.report.type = queryParams.type;
      this.report.id = queryParams.id;
    });
    this.route.data.subscribe((data: { reportParameters: ReportParameter[], configurations: any }) => {
      this.paramData = data.reportParameters;
      if (this.isTableReport()) {
        data.configurations.globalConfiguration.forEach((config: GlobalConfiguration) => {
          if (config.name === 'report-export-s3-folder-name') {
            this.exportToS3Allowed = config.enabled;
            this.exportToS3Repository = config.stringValue;
          }
        });
      }
    });
  }

  isTableReport(): boolean {
    return (this.report.type === 'Table');
  }

  isPentahoReport(): boolean {
    return (this.report.type === 'Pentaho');
  }

  /**
   * Creates and sets the run report form.
   */
  ngOnInit() {
    this.maxDate = this.settingsService.maxAllowedDate;
    // Fetch GL accounts if needed
    this.fetchGLAccounts();
    // Fetch app users if needed
    this.fetchAppUsers();
    this.createRunReportForm();
    
    // Set up filters
    this.setupFilters();
  }
  
  /**
   * Set up all search filters
   */
  setupFilters() {
    // Setup GL account filter
    if (this.glAccountData.length > 0) {
      this.setupGLAccountFilter();
    }
    
    // Setup app user filter
    if (this.appUserData.length > 0) {
      this.setupAppUserFilter();
    }
    
    // Setup filters for standard select parameters
    this.paramData.forEach(param => {
      if (param.displayType === 'select' && !this.isGLAccountParameter(param) && param.selectOptions && param.selectOptions.length > 0) {
        this.setupParameterFilter(param);
      }
    });
  }
  
  /**
   * Set up filter for a specific parameter
   * @param param The parameter to set up filter for
   */
  setupParameterFilter(param: ReportParameter) {
    const paramName = param.name;
    
    // Create filter control if not exists
    if (!this.paramFilterCtrls[paramName]) {
      this.paramFilterCtrls[paramName] = new UntypedFormControl('');
      this.filteredOptions[paramName] = new ReplaySubject<any[]>(1);
      
      // Initialize filtered options
      this.filteredOptions[paramName].next(param.selectOptions.slice());
      
      // Listen for search field value changes
      this.paramFilterCtrls[paramName].valueChanges
        .pipe(takeUntil(this._onDestroy))
        .subscribe(() => {
          this.filterSelectOptions(param);
        });
    }
  }
  
  /**
   * Filter options for a parameter
   * @param param The parameter to filter options for
   */
  filterSelectOptions(param: ReportParameter) {
    const paramName = param.name;
    
    if (!param.selectOptions || param.selectOptions.length === 0) {
      return;
    }
    
    // Get search keyword
    let search = this.paramFilterCtrls[paramName].value;
    if (!search) {
      this.filteredOptions[paramName].next(param.selectOptions.slice());
      return;
    } else {
      search = search.toLowerCase();
    }
    
    // Filter options
    this.filteredOptions[paramName].next(
      param.selectOptions.filter(option => 
        option.name.toLowerCase().indexOf(search) > -1
      )
    );
  }
  
  /**
   * Set up filter for GL account selector
   */
  setupGLAccountFilter() {
    // Set initial filtered GL accounts
    this.filteredGLAccounts.next(this.glAccountData.slice());
    
    // Listen for search field value changes
    this.glAccountFilterCtrl.valueChanges
      .pipe(
        takeUntil(this._onDestroy),
        // Add debounce to avoid excessive filtering
        debounceTime(150)
      )
      .subscribe(() => {
        this.filterGLAccounts();
      });
  }
  
  /**
   * Handles GL account select dropdown opening/closing
   * @param isOpen Whether the dropdown is open
   */
  onGLSelectOpened(isOpen: boolean): void {
    console.log('GL select opened:', isOpen);
    if (isOpen) {
      // Reset filter when opening
      this.glAccountFilterCtrl.setValue('');
      this.filterGLAccounts();
      
      // Focus the search input
      setTimeout(() => {
        const searchInput = document.querySelector('ngx-mat-select-search input');
        if (searchInput) {
          (searchInput as HTMLElement).focus();
        }
      }, 0);
    }
  }
  
  /**
   * Handle direct keyup events on the GL filter
   * @param event Keyboard event
   */
  onGLFilterKeyUp(event: KeyboardEvent): void {
    console.log('GL filter keyup:', this.glAccountFilterCtrl.value);
    this.filterGLAccounts();
  }
  
  /**
   * Filter GL accounts based on search term
   */
  filterGLAccounts() {
    if (!this.glAccountData) {
      return;
    }
    
    // Get search keyword
    let search = this.glAccountFilterCtrl.value;
    console.log('Filtering GL accounts with:', search);
    
    if (!search) {
      this.filteredGLAccounts.next(this.glAccountData.slice());
      return;
    } else {
      search = search.toLowerCase();
    }
    
    // Filter GL accounts with more comprehensive matching
    const filtered = this.glAccountData.filter(glAccount => {
      if (!glAccount) return false;
      
      const nameMatch = glAccount.name && glAccount.name.toLowerCase().includes(search);
      const codeMatch = glAccount.glCode && glAccount.glCode.toLowerCase().includes(search);
      const combinedMatch = `${glAccount.glCode || ''} ${glAccount.name || ''}`.toLowerCase().includes(search);
      
      return nameMatch || codeMatch || combinedMatch;
    });
    
    console.log(`Found ${filtered.length} matching GL accounts`);
    this.filteredGLAccounts.next(filtered);
  }

  /**
   * Fetch GL accounts for selector
   */
  fetchGLAccounts() {
    // Check if any parameter name contains GL Account
    const hasGLAccountParam = this.paramData.some(param => 
      param.label.toLowerCase().includes('gl account') || 
      param.name.toLowerCase().includes('glaccount') ||
      param.name.toLowerCase().includes('glaccountid'));

    if (hasGLAccountParam) {
      this.accountingService.getGlAccounts().subscribe((glAccounts: GLAccount[]) => {
        this.glAccountData = glAccounts;
        // Initialize filtered GL accounts
        this.filteredGLAccounts.next(this.glAccountData.slice());
      });
    }
  }

  /**
   * Checks if parameter is a GL account parameter
   * @param param Report parameter
   * @returns true if parameter is for GL account
   */
  isGLAccountParameter(param: ReportParameter): boolean {
    return param.label.toLowerCase().includes('gl account') || 
           param.name.toLowerCase().includes('glaccount') ||
           param.name.toLowerCase().includes('glaccountid');
  }
  
  /**
   * Checks if parameter is an office parameter
   * @param param Report parameter
   * @returns true if parameter is for office
   */
  isOfficeParameter(param: ReportParameter): boolean {
    return param.label.toLowerCase().includes('office') || 
           param.name.toLowerCase().includes('office') || 
           param.name.toLowerCase().includes('branch');
  }
  
  /**
   * Checks if parameter is an entry filter parameter
   * @param param Report parameter
   * @returns true if parameter is for entry filter
   */
  isEntryFilterParameter(param: ReportParameter): boolean {
    return param.label.toLowerCase().includes('entry filter') || 
           param.label.toLowerCase().includes('entry type') || 
           param.name.toLowerCase().includes('entryfilter') || 
           param.name.toLowerCase().includes('entrytype');
  }

  /**
   * Establishes form controls for Report Parameter's name attribute,
   * Fetches dropdown options and builds child dependencies.
   */
  createRunReportForm() {
    this.paramData.forEach(
      (param: ReportParameter) => {
        if (!param.parentParameterName) { // Non Child Parameter
          this.reportForm.addControl(param.name, new UntypedFormControl('', Validators.required));
          if (param.displayType === 'select' && !this.isGLAccountParameter(param)) {
            this.fetchSelectOptions(param, param.name);
          }
        } else { // Child Parameter
          const parent: ReportParameter = this.paramData
            .find((entry: any) => entry.name === param.parentParameterName);
          if (parent != null) {
            parent.childParameters.push(param);
            this.updateParentParameters(parent);
          }
        }
      });
    if (this.isPentahoReport()) {
      this.reportForm.addControl('outputType', new UntypedFormControl('', Validators.required));
      this.outputTypeOptions = [
        { 'name': 'PDF format', 'value': 'PDF' },
        { 'name': 'Normal format', 'value': 'HTML' },
        { 'name': 'Excel format', 'value': 'XLS' },
        { 'name': 'Excel 2007 format', 'value': 'XLSX' },
        { 'name': 'CSV format', 'value': 'CSV' }
      ];
      this.mapPentahoParams();
    }
    if (this.exportToS3Allowed) {
      this.reportForm.addControl('exportOutputToS3', new UntypedFormControl(false));
    }
    this.decimalChoice.patchValue('0');
    this.setChildControls();
  }

  /**
   * Updates the array of parent parameters.
   * @param {ReportParameter} parent Parent report parameter
   */
  updateParentParameters(parent: ReportParameter) {
    const parentNames = this.parentParameters.map(parameter => parameter.name);
    if (!parentNames.includes(parent.name)) { // Parent's first child.
      this.parentParameters.push(parent);
    } else { // Parent already has a child
      const index = parentNames.indexOf(parent.name);
      this.parentParameters[index] = parent;
    }
  }

  /**
   * Maps pentaho specific names to form-control names.
   */
  mapPentahoParams() {
    this.reportsService.getPentahoParams(this.report.id).subscribe((data: any) => {
      data.forEach((entry: any) => {
        const param: ReportParameter = this.paramData
         .find((_entry: any) => _entry.name === entry.parameterName);
        param.pentahoName = `R_${entry.reportParameterName}`;
      });
    });
  }

  /**
   * Subscribes to changes in parent parameters value, builds child parameter vis-a-vis parent's value.
   */
  setChildControls() {
    this.parentParameters.forEach((param: ReportParameter) => {
      this.reportForm.get(param.name).valueChanges.subscribe((option: any) => {
        param.childParameters.forEach((child: ReportParameter) => {
          if (child.displayType === 'none') {
            this.reportForm.addControl(child.name, new UntypedFormControl(child.defaultVal));
          } else {
            this.reportForm.addControl(child.name, new UntypedFormControl('', Validators.required));
          }
          if (child.displayType === 'select' && !this.isGLAccountParameter(child)) {
            const inputstring = `${child.name}?${param.inputName}=${option.id}`;
            this.fetchSelectOptions(child, inputstring);
          }
        });
      });
    });
  }

  /**
   * Fetches Select Dropdown options for param type "Select".
   * @param {ReportParameter} param Parameter for which dropdown options are required.
   * @param {string} inputstring url substring for API call.
   */
  fetchSelectOptions(param: ReportParameter, inputstring: string) {
    this.reportsService.getSelectOptions(inputstring).subscribe((options: SelectOption[]) => {
      param.selectOptions = options;
      if (param.selectAll === 'Y') {
        param.selectOptions.push({id: '-1', name: 'All'});
      }
      
      // Set up filter for this parameter if it's an office or entry filter
      if (this.isOfficeParameter(param) || this.isEntryFilterParameter(param)) {
        this.setupParameterFilter(param);
      }
    });
  }

  /**
   * Formats user response and readies it for utilization by run report function.
   * @param {any} response Object containing formcontrol values.
   */
  formatUserResponse(response: any) {
    const formattedResponse: any = {};
    let newKey: string;
    this.reportToBeExportedInRepository = false;
    for (const [key, value] of Object.entries(response)) {
      if (key === 'outputType') {
        formattedResponse['output-type'] = value;
        continue;
      } else if (key === 'exportOutputToS3') {
        this.reportToBeExportedInRepository = value;
        continue;
      }

      const param: ReportParameter = this.paramData
        .find((_entry: any) => _entry.name === key);
      newKey = this.isPentahoReport() ? param.pentahoName : param.inputName;
      switch (param.displayType) {
        case 'text':
          formattedResponse[newKey] = value;
          break;
        case 'select':
          formattedResponse[newKey] = (value as any).id || value;
          break;
        case 'date':
          if (this.isTableReport()) {
            formattedResponse[newKey] = this.dateUtils.formatDate(value, Dates.DEFAULT_DATEFORMAT);
          } else {
            formattedResponse[newKey] = this.dateUtils.formatDate(value, this.settingsService.dateFormat);
          }
          this.reportUsesDates = true;
          break;
        case 'none':
          formattedResponse[newKey] = value;
          break;
      }
    }
    return formattedResponse;
  }

  /**
   * Core run report functionality.
   */
  run() {
    this.isCollapsed = true;
    const userResponseValues = this.formatUserResponse(this.reportForm.value);
    let formData = {
      ...userResponseValues,
    };
    if (this.reportUsesDates) {
      let dateFormat = this.settingsService.dateFormat;
      if (this.isTableReport()) {
        dateFormat = Dates.DEFAULT_DATEFORMAT;
      }
      formData = {
        ...userResponseValues,
        locale: this.settingsService.language.code,
        dateFormat: dateFormat
      };
    }
    if (this.reportToBeExportedInRepository) {
      formData['exportS3'] = true;
    }
    this.dataObject = {
      formData: formData,
      report: this.report,
      decimalChoice: this.decimalChoice.value
    };
    switch (this.report.type) {
      case 'SMS':
      case 'Table':
        this.hideTable = false;
       break;
      case 'Chart':
        this.hideChart = false;
       break;
      case 'Pentaho':
        this.hidePentaho = false;
       break;
    }
  }

  runReportAndExport($event: Event): void {
    $event.stopPropagation();
    this.isProcessing = true;
    const userResponseValues = this.formatUserResponse(this.reportForm.value);

    const reportName = this.report.name;
    const payload = {
      ...userResponseValues,
      decimalChoice: this.decimalChoice.value,
      // exportCSV: true
    };
    this.reportsService.getRunReportData(reportName, payload)
    .subscribe( (res: any) => {
      if (res.data.length > 0) {
        this.alertService.alert({type: 'Report generation', message: `Report: ${reportName} data generated`});

        const displayedColumns: string[] = [];
        res.columnHeaders.forEach((header: any) => {
          displayedColumns.push(header.columnName);
        });

        this.exportToXLS(reportName, res.data, displayedColumns);
      } else {
        this.alertService.alert({type: 'Report generation', message: `Report: ${reportName} without data generated`});
      }
      this.isProcessing = false;
    });
  }

  exportToXLS(reportName: string, csvData: any, displayedColumns: string[]): void {
    const fileName = `${reportName}.xlsx`;
    const data = csvData.map((object: any) => {
      const row: { [key: string]: any } = {};
      for (let i = 0; i < displayedColumns.length; i++) {
        row[displayedColumns[i]] = object.row[i];
      }
      return row;
    });
    const ws: XLSX.WorkSheet = XLSX.utils.json_to_sheet(data, {header: displayedColumns});
    const wb: XLSX.WorkBook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'report');
    XLSX.writeFile(wb, fileName);
  }

  /**
   * Handles the select dropdown opening event.
   * @param {ReportParameter} param The parameter for which the select dropdown was opened.
   * @param {boolean} isOpen Whether the dropdown is open or closed.
   */
  onSelectOpened(param: ReportParameter, isOpen: boolean): void {
    // Initialize filteredOptions with all options when dropdown is opened
    param.filteredOptions = [...param.selectOptions];
    
    // Focus the search input when dropdown is opened
    if (isOpen) {
      setTimeout(() => {
        const searchInput = document.getElementById(`search-${param.name}`);
        if (searchInput) {
          searchInput.focus();
        }
      }, 0);
    }
  }

  /**
   * Handles keyboard events in select dropdowns for filtering options.
   * @param {KeyboardEvent} event The keyboard event.
   * @param {ReportParameter} param The parameter for which the select dropdown is being used.
   */
  onSelectKeydown(event: KeyboardEvent, param: ReportParameter): void {
    const searchText = (event.target as HTMLInputElement).value.toLowerCase();
    if (param.selectOptions && param.selectOptions.length > 0) {
      if (searchText === '') {
        // If search is empty, show all options
        param.filteredOptions = [...param.selectOptions];
      } else {
        // Filter options based on search text
        param.filteredOptions = param.selectOptions.filter((option: SelectOption) =>
          option.name.toLowerCase().includes(searchText)
        );
      }
    }
  }

  /**
   * Set up app user filter
   */
  setupAppUserFilter() {
    // Initialize filtered app users
    this.filteredAppUsers.next(this.appUserData.slice());
    
    // Listen for search field value changes
    this.appUserFilterCtrl.valueChanges
      .pipe(
        takeUntil(this._onDestroy),
        // Add debounce to avoid excessive filtering
        debounceTime(150)
      )
      .subscribe(() => {
        this.filterAppUsers();
      });
  }

  /**
   * Handles app user select dropdown opening/closing
   * @param isOpen Whether the dropdown is open
   */
  onAppUserSelectOpened(isOpen: boolean): void {
    console.log('App user select opened:', isOpen);
    if (isOpen) {
      // Reset filter when opening
      this.appUserFilterCtrl.setValue('');
      this.filterAppUsers();
      
      // Focus the search input
      setTimeout(() => {
        const searchInput = document.querySelector('ngx-mat-select-search input');
        if (searchInput) {
          (searchInput as HTMLElement).focus();
        }
      }, 0);
    }
  }
  
  /**
   * Handle direct keyup events on the app user filter
   * @param event Keyboard event
   */
  onAppUserFilterKeyUp(event: KeyboardEvent): void {
    console.log('App user filter keyup:', this.appUserFilterCtrl.value);
    this.filterAppUsers();
  }
  
  /**
   * Filter app users based on search input
   */
  filterAppUsers() {
    // Get search keyword
    let search = this.appUserFilterCtrl.value;
    console.log('Filtering app users with:', search);
    
    if (!search) {
      this.filteredAppUsers.next(this.appUserData.slice());
      return;
    } else {
      search = search.toLowerCase();
    }
    
    // Filter app users with more comprehensive matching
    const filtered = this.appUserData.filter(appUser => {
      if (!appUser) return false;
      
      const nameMatch = appUser.displayName && appUser.displayName.toLowerCase().includes(search);
      const idMatch = appUser.id && appUser.id.toString().toLowerCase().includes(search);
      
      return nameMatch || idMatch;
    });
    
    console.log(`Found ${filtered.length} matching app users`);
    this.filteredAppUsers.next(filtered);
  }

  /**
   * Fetch app users for selector
   */
  fetchAppUsers() {
    // Check if any parameter name contains app user
    const hasAppUserParam = this.paramData.some(param => 
      param.label.toLowerCase().includes('app user') || 
      param.name.toLowerCase().includes('appuser') ||
      param.name.toLowerCase().includes('appuserid'));

    if (hasAppUserParam) {
      this.reportsService.getAppUsers().subscribe(
        (response: any) => {
          console.log('Staff Response:', response); // Debug log
          if (Array.isArray(response)) {
            this.appUserData = response.map((staff: any) => ({
              id: staff.id,
              displayName: `${staff.firstname} ${staff.lastname}`
            }));
            if (this.appUserData.length > 0) {
              this.setupAppUserFilter();
            }
          } else {
            console.error('Invalid staff response format:', response);
          }
        },
        error => {
          console.error('Error fetching staff:', error);
        }
      );
    }
  }

  /**
   * Check if parameter is app user parameter
   */
  isAppUserParameter(param: ReportParameter): boolean {
    return param.label.toLowerCase().includes('app user') || 
           param.name.toLowerCase().includes('appuser') ||
           param.name.toLowerCase().includes('appuserid');
  }

  /**
   * Implements OnDestroy interface
   */
  ngOnDestroy() {
    this._onDestroy.next();
    this._onDestroy.complete();
  }
}
