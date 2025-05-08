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
        const fileName = `${this.dataObject.report.name}.${extension}`;
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
