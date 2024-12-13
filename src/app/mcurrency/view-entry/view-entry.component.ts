import { Component, OnInit, ViewChild } from '@angular/core';
import { MatTableDataSource } from '@angular/material/table';
import { MatPaginator } from '@angular/material/paginator';
import { MatSort } from '@angular/material/sort';
import { AccountingService } from '../../accounting/accounting.service';
import { McurrencyService } from '../mcurrency.service';
import { ActivatedRoute, Router } from '@angular/router';
import { MatDialog } from '@angular/material/dialog';
import { UserService } from '../../self-service/users/user.service';

@Component({
  selector: 'mifosx-view-entry',
  templateUrl: './view-entry.component.html',
  styleUrls: ['./view-entry.component.scss']
})
export class ViewEntryComponent implements OnInit {

  title: string;
  EntriesData: any[];
  transaction: any;
  transactionId: string;
  displayedColumns: string[] = ['id', 'glAccountType', 'glAccountCode', 'glAccountName', 'debit', 'credit'];
  dataSource: MatTableDataSource<any>;

  @ViewChild(MatPaginator, { static: true }) paginator: MatPaginator;
  @ViewChild(MatSort, { static: true }) sort: MatSort;

  isEntryLoaded: boolean;

  constructor(private mcurrencyService: McurrencyService,
              private route: ActivatedRoute,
              private router: Router,
              private dialog: MatDialog,
              private location: Location,) { }

  ngOnInit(): void {
    this.route.data.subscribe((data: { title: string, transaction: any, transferEntryData: any }) => {
      this.title = data.title;
      this.isEntryLoaded = false;
      if (this.isViewTransaction()) {
        this.transaction = data.transaction;
        if (data.transaction.pageItems.length > 0) {
          this.isEntryLoaded = true;
          this.transactionId = data.transaction.pageItems[0].transactionId;
        }
      } else if (this.isViewTransfer()){
        this.EntriesData = data.transferEntryData.journalEntryData.content;
        this.isEntryLoaded = true;
      }
      this.setTransaction()
    })
  }

  isViewTransaction() {
    return (this.title === 'View Multi-Currency Transaction');
  }

  isViewTransfer() {
    return (this.title === 'View Multi-Currency Transfer');
  }

  setTransaction() {

  }

  revertTransaction() {

  }

  viewEntry(Entry: any) {
    this.dialog.open(ViewEntryComponent, {
      data: {Entry: Entry},
    })
  }

  goBack() {

  }
}
