import { Component, OnInit, ViewChild } from '@angular/core';
import { MatTableDataSource } from '@angular/material/table';
import { MatPaginator } from '@angular/material/paginator';
import { MatSort } from '@angular/material/sort';
import { AccountingService } from '../../accounting/accounting.service';
import { ActivatedRoute, Router } from '@angular/router';
import { MatDialog } from '@angular/material/dialog';
import { Location } from '@angular/common';
import { ViewJournalEntryComponent } from '../../shared/accounting/view-journal-entry/view-journal-entry.component';
import { RevertTransactionComponent } from '../../accounting/revert-transaction/revert-transaction.component';

interface JournalEntry {
  id: string;
  glAccountType: { value: string };
  glAccountCode: string;
  glAccountName: string;
  debit: number;
  credit: number;
  transactionId: string;
  reversed: boolean;
}

@Component({
  selector: 'mifosx-view-entry',
  templateUrl: './view-entry.component.html',
  standalone: true,
  styleUrls: ['./view-entry.component.scss']
})
export class ViewEntryComponent implements OnInit {
  title: string;
  entriesData: JournalEntry[];
  transaction: any;
  transactionId: string;

  displayedColumns: string[] = ['id', 'glAccountType', 'glAccountCode', 'glAccountName', 'debit', 'credit'];
  dataSource: MatTableDataSource<JournalEntry>;

  @ViewChild(MatPaginator, { static: true }) paginator: MatPaginator;
  @ViewChild(MatSort, { static: true }) sort: MatSort;

  isEntryLoaded = false;

  constructor(
    private accountingService: AccountingService,
    private route: ActivatedRoute,
    private router: Router,
    public dialog: MatDialog,
    private location: Location
  ) { }

  ngOnInit() {
    this.route.data.subscribe({
      next: (data: { title: string, transaction: any, transferEntryData: any }) => {
        this.title = data.title;
        this.isEntryLoaded = false;

        if (this.isViewTransaction()) {
          this.handleTransactionView(data);
        } else if (this.isViewTransfer()) {
          this.handleTransferView(data);
        }

        this.setTransaction();
      },
      error: (error) => {
        console.error('Error loading transaction data', error);
        // Implement error handling (e.g., show error message)
      }
    });
  }

  private handleTransactionView(data: any) {
    this.transaction = data.transaction;
    if (data.transaction.pageItems.length > 0) {
      this.isEntryLoaded = true;
      this.transactionId = data.transaction.pageItems[0].transactionId;
    }
  }

  private handleTransferView(data: any) {
    this.entriesData = data.transferEntryData.journalEntryData.content;
    this.isEntryLoaded = true;
  }

  isViewTransaction(): boolean {
    return this.title === 'View Transaction';
  }

  isViewTransfer(): boolean {
    return this.title === 'View Transfer';
  }

  setTransaction() {
    this.dataSource = new MatTableDataSource(
      this.entriesData || this.transaction.pageItems
    );

    this.dataSource.sortingDataAccessor = (transaction: JournalEntry, property: string) => {
      switch (property) {
        case 'glAccountType': return transaction.glAccountType.value;
        case 'debit': return transaction.debit;
        case 'credit': return transaction.credit;
        default: return transaction[property];
      }
    };

    this.dataSource.paginator = this.paginator;
    this.dataSource.sort = this.sort;
  }

  viewJournalEntry(journalEntry: JournalEntry) {
    this.dialog.open(ViewJournalEntryComponent, {
      data: { entry: journalEntry }
    });
  }

  revertTransaction(transactionId?: string) {
    const revertTransactionDialogRef = this.dialog.open(RevertTransactionComponent, {
      data: {
        reverted: this.dataSource.data[0].reversed,
        transactionId: transactionId
      }
    });

    revertTransactionDialogRef.afterClosed().subscribe({
      next: (response: any) => {
        if (response.revert) {
          this.accountingService.revertTransaction(this.transactionId, response.comments)
            .subscribe({
              next: (reversedTransaction: any) => {
                this.dataSource.data[0].reversed = true;
                this.revertTransaction(reversedTransaction.transactionId);
              },
              error: (error) => {
                console.error('Error reverting transaction', error);
                // Implement error handling
              }
            });
        } else if (response.redirect) {
          this.router.navigate(['../', transactionId], { relativeTo: this.route });
        }
      }
    });
  }

  goBack(): void {
    this.location.back();
  }
}
