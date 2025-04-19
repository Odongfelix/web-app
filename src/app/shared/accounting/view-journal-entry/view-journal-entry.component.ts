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
    const journalEntry = this.data.journalEntry;
    
    // Create a clone of the content to print
    const printWindow = window.open('', '_blank');
    if (printWindow) {
      printWindow.document.write(`
        <html>
          <head>
            <title>Journal Entry - ${journalEntry.id}</title>
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
                border: 1px solid #ddd;
              }
              th {
                background-color: #f2f2f2;
                width: 30%;
                font-weight: bold;
              }
              .header {
                background-color: #e0e0e0;
                font-weight: bold;
                text-align: center;
                colspan: 2;
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
            <h2>Journal Entry - ${journalEntry.id}</h2>
            <table>
              <tbody>
                <tr>
                  <th>Office</th>
                  <td>${journalEntry.officeName}</td>
                </tr>
                <tr>
                  <th>Entry ID</th>
                  <td>${journalEntry.id}</td>
                </tr>
                <tr>
                  <th>Transaction ID</th>
                  <td>${journalEntry.transactionId}</td>
                </tr>
                <tr>
                  <th>Transaction Date</th>
                  <td>${journalEntry.transactionDate}</td>
                </tr>
                <tr>
                  <th>Type</th>
                  <td>${journalEntry.glAccountType.value}</td>
                </tr>
                <tr>
                  <th>Account Code</th>
                  <td>${journalEntry.glAccountId}</td>
                </tr>
                <tr>
                  <th>Account Name</th>
                  <td>${journalEntry.glAccountName}</td>
                </tr>
                <tr>
                  <th>${journalEntry.entryType.value === 'CREDIT' ? 'Credit' : 'Debit'}</th>
                  <td>${journalEntry.currency.displaySymbol} ${journalEntry.amount}</td>
                </tr>
                <tr>
                  <th>Currency</th>
                  <td>(${journalEntry.currency.code}) ${journalEntry.currency.name}</td>
                </tr>
                ${journalEntry.referenceNumber ? `
                  <tr>
                    <th>Reference Number</th>
                    <td>${journalEntry.referenceNumber}</td>
                  </tr>
                ` : ''}
                ${journalEntry.comments ? `
                  <tr>
                    <th>Comments</th>
                    <td>${journalEntry.comments}</td>
                  </tr>
                ` : ''}
                ${this.existsPaymentDetails ? `
                  <tr>
                    <th colspan="2" class="header">Payment Details</th>
                  </tr>
                  ${journalEntry.transactionDetails.paymentDetails?.paymentType ? `
                    <tr>
                      <th>Payment Type</th>
                      <td>${journalEntry.transactionDetails.paymentDetails.paymentType.name}</td>
                    </tr>
                  ` : ''}
                  ${journalEntry.transactionDetails.paymentDetails?.accountNumber ? `
                    <tr>
                      <th>Account Number</th>
                      <td>${journalEntry.transactionDetails.paymentDetails.accountNumber}</td>
                    </tr>
                  ` : ''}
                  ${journalEntry.transactionDetails.paymentDetails?.checkNumber ? `
                    <tr>
                      <th>Cheque Number</th>
                      <td>${journalEntry.transactionDetails.paymentDetails.checkNumber}</td>
                    </tr>
                  ` : ''}
                  ${journalEntry.transactionDetails.paymentDetails?.routingCode ? `
                    <tr>
                      <th>Routing Code</th>
                      <td>${journalEntry.transactionDetails.paymentDetails.routingCode}</td>
                    </tr>
                  ` : ''}
                  ${journalEntry.transactionDetails.paymentDetails?.receiptNumber ? `
                    <tr>
                      <th>Receipt Number</th>
                      <td>${journalEntry.transactionDetails.paymentDetails.receiptNumber}</td>
                    </tr>
                  ` : ''}
                  ${journalEntry.transactionDetails.paymentDetails?.bankNumber ? `
                    <tr>
                      <th>Bank Number</th>
                      <td>${journalEntry.transactionDetails.paymentDetails.bankNumber}</td>
                    </tr>
                  ` : ''}
                  <tr>
                    <th>Created by</th>
                    <td>${journalEntry.createdByUserName}</td>
                  </tr>
                ` : ''}
                <tr>
                  <th>Submitted on</th>
                  <td>${journalEntry.submittedOnDate}</td>
                </tr>
              </tbody>
            </table>
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
