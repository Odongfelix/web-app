/** Angular Imports */
import { Component, Inject } from '@angular/core';
import { MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';

/**
 * View journal entry dialog component.
 */
@Component({
  selector: 'mifosx-view-journal-entry',
  templateUrl: './view-journal-entry.component.html',
  styleUrls: ['./view-journal-entry.component.scss']
})
export class ViewJournalEntryComponent {

  existsPaymentDetails = false;
  /**
   * @param {MatDialogRef} dialogRef Component reference to dialog.
   * @param {any} data Provides journal entry.
   */
  constructor(public dialogRef: MatDialogRef<ViewJournalEntryComponent>,
              @Inject(MAT_DIALOG_DATA) public data: any) {

    this.existsPaymentDetails = (data.journalEntry.transactionDetails != null && data.journalEntry.transactionDetails.paymentDetails != null);
  }

  /**
   * Prints the journal entry details
   */
  printJournalEntry(): void {
    const printContent = document.querySelector('.journal-entry-content') as HTMLElement;
    const originalContent = document.body.innerHTML;
    
    // Create a clone of the content to print
    const printWindow = window.open('', '_blank');
    if (printWindow) {
      printWindow.document.write(`
        <html>
          <head>
            <title>Journal Entry - ${this.data.journalEntry.id}</title>
            <style>
              body {
                font-family: Arial, sans-serif;
                margin: 20px;
                font-size: 12px;
              }
              table {
                width: 100%;
                border-collapse: collapse;
                margin-bottom: 20px;
              }
              th, td {
                padding: 8px;
                text-align: left;
                border-bottom: 1px solid #ddd;
              }
              th {
                background-color: #f2f2f2;
                width: 30%;
              }
              .header {
                background-color: #e0e0e0;
                font-weight: bold;
                text-align: center;
              }
              @media print {
                body {
                  font-size: 10pt;
                }
                table {
                  page-break-inside: auto;
                }
                tr {
                  page-break-inside: avoid;
                  page-break-after: auto;
                }
              }
            </style>
          </head>
          <body>
            <h2>Journal Entry - ${this.data.journalEntry.id}</h2>
            ${printContent.outerHTML}
          </body>
        </html>
      `);
      
      printWindow.document.close();
      printWindow.focus();
      
      // Wait for resources to load before printing
      setTimeout(() => {
        printWindow.print();
        printWindow.close();
      }, 500);
    }
  }
}
