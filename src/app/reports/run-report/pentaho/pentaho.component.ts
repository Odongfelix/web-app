/** Angular Imports */
import { Component, OnChanges, Input } from '@angular/core';
import { DomSanitizer } from '@angular/platform-browser';

/** Custom Services */
import { ReportsService } from '../../reports.service';
import { SettingsService } from 'app/settings/settings.service';
import { ProgressBarService } from 'app/core/progress-bar/progress-bar.service';

/**
 * Pentaho Component
 */
@Component({
  selector: 'mifosx-pentaho',
  templateUrl: './pentaho.component.html',
  styleUrls: ['./pentaho.component.scss']
})
export class PentahoComponent implements OnChanges {

  /** Run Report Data */
  @Input() dataObject: any;

  /** substitute for resolver */
  hideOutput = true;
  /** trusted resource url for pentaho output */
  pentahoUrl: any;

  /**
   * @param {DomSanitizer} sanitizer DOM Sanitizer
   * @param {ReportsService} reportsService Reports Service
   * @param {SettingsService} settingsService Settings Service
   */
  constructor(private sanitizer: DomSanitizer,
              private reportsService: ReportsService,
              private settingsService: SettingsService,
              private progressBarService: ProgressBarService) { }

  /**
   * Fetches run report data post changes in run report form.
   */
  ngOnChanges() {
    this.hideOutput = true;
    this.getRunReportData();
  }

  /**
   * Gets GL code from form data if available
   */
  private getGLCode(): string {
    const formData = this.dataObject.formData;
    
    // Check various possible parameter names for GL account
    for (const key in formData) {
      const keyLower = key.toLowerCase().replace(/\s+/g, '');
      if (keyLower.includes('glaccount') || 
          keyLower.includes('glaccountid') || 
          keyLower === 'r_gl') {
        const value = formData[key];
        
        // If it's a number (ID value), use it directly
        return value.toString();
      }
    }
    
    return '';
  }

  /**
   * Initializes the report based on the output type
   */
  getRunReportData() {
    this.reportsService.getPentahoRunReportData(
      this.dataObject.report.name, 
      this.dataObject.formData, 
      'default', 
      this.settingsService.language.code, 
      this.settingsService.dateFormat
    ).subscribe((res: any) => {
      const contentType = res.headers.get('Content-Type');
      const file = new Blob([res.body], {type: contentType});

      // Check if output type is Excel or CSV
      const outputType = this.dataObject.formData['output-type'];
      if (outputType === 'XLS' || outputType === 'XLSX' || outputType === 'CSV') {
        // For Excel/CSV formats, trigger download
        const extension = outputType.toLowerCase();
        const glCode = this.getGLCode();
        const fileName = glCode ? 
          `${this.dataObject.report.name}_${glCode}.${extension}` : 
          `${this.dataObject.report.name}.${extension}`;
        const link = document.createElement('a');
        link.href = URL.createObjectURL(file);
        link.download = fileName;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(link.href);
        this.hideOutput = true; // Keep iframe hidden for Excel/CSV
      } else {
        // For other formats (PDF, HTML), show in iframe
        const filecontent = URL.createObjectURL(file);
        this.pentahoUrl = this.sanitizer.bypassSecurityTrustResourceUrl(filecontent);
        this.hideOutput = false;
      }
      this.progressBarService.decrease();
    });
  }
}
