import { Component, OnInit, ViewChild } from '@angular/core';
import { MatPaginator } from '@angular/material/paginator';
import { MatSort } from '@angular/material/sort';
import { MatTableDataSource } from '@angular/material/table';
import { ActivatedRoute, Router } from '@angular/router';
import { MatDialog } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';
import { TranslateService } from '@ngx-translate/core';
import { AuthenticationService } from 'app/core/authentication/authentication.service';
import { AddCostDialogComponent } from './add-cost-dialog/add-cost-dialog.component';

interface CostHandlingData {
  date: string;
  description: string;
  amount: number;
  category: string;
  status: string;
  isReversed?: boolean;
  reversalDate?: string;
  glAccount?: {
    id: number;
    name: string;
    glCode: string;
  };
}

@Component({
  selector: 'mifosx-cost-handling-tab',
  templateUrl: './cost-handling-tab.component.html',
  styleUrls: ['./cost-handling-tab.component.scss']
})
export class CostHandlingTabComponent implements OnInit {
  
  /** Data source for costs table. */
  dataSource: MatTableDataSource<any>;

  /** Columns to be displayed in costs table. */
  displayedColumns: string[] = ['date', 'description', 'amount', 'category', 'glAccount', 'actions'];

  /** Paginator for costs table. */
  @ViewChild(MatPaginator, { static: true }) paginator: MatPaginator;
  /** Sorter for costs table. */
  @ViewChild(MatSort, { static: true }) sort: MatSort;

  /** Cost data. */
  costData: any = {
    costs: []
  };
  /** Loan ID. */
  loanId: string;
  /** Has reverse permission */
  hasReversePermission = false;

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private dialog: MatDialog,
    private snackBar: MatSnackBar,
    private translateService: TranslateService,
    private authenticationService: AuthenticationService
  ) {
    this.route.parent.parent.data.subscribe((data: { loanDetailsData: any }) => {
      if (data && data.loanDetailsData) {
        this.costData = {
          ...data.loanDetailsData,
          costs: data.loanDetailsData.costs || []
        };
        if (this.dataSource) {
          this.dataSource.data = this.costData.costs;
        }
      }
    });
    this.loanId = this.route.parent.parent.snapshot.params['loanId'];
  }

  ngOnInit() {
    this.dataSource = new MatTableDataSource(this.costData.costs);
    this.dataSource.paginator = this.paginator;
    this.dataSource.sort = this.sort;

    // Check for reverse entry permission
    const credentials = this.authenticationService.getCredentials();
    this.hasReversePermission = credentials.permissions.some(
      (permission: string) => permission === 'REVERSE_COSTHANDLING'
    );
  }

  /**
   * Show transaction details
   * @param {any} transactionData Transaction data
   */
  showTransaction(transactionData: any) {
    this.router.navigate([transactionData.id], { relativeTo: this.route });
  }

  /**
   * View journal entry
   * @param {any} transactionData Transaction data
   */
  viewJournalEntry(transactionData: any) {
    this.router.navigate(['/', 'journal-entry', 'view', 'L' + transactionData.id]);
  }

  /**
   * Approve cost
   * @param {any} cost Cost
   */
  approveCost(cost: any) {
    // Implement approve cost logic
  }

  /**
   * Reject cost
   * @param {any} cost Cost
   */
  rejectCost(cost: any) {
    // Implement reject cost logic
  }

  /**
   * Reverse transaction
   * @param {any} transaction Transaction
   */
  reverseTransaction(transaction: any) {
    // Implement reverse transaction logic
  }

  openAddCostDialog(): void {
    const dialogRef = this.dialog.open(AddCostDialogComponent, {
      width: '500px'
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result) {
        // Mock implementation - in real app, this would call a service
        const newCost: CostHandlingData = {
          date: result.date,
          description: result.description,
          amount: result.amount,
          category: result.category,
          status: 'Pending',
          glAccount: {
            id: result.glAccount,
            name: this.costData.costs.find((cost: any) => cost.glAccount?.id === result.glAccount)?.glAccount?.name || '',
            glCode: this.costData.costs.find((cost: any) => cost.glAccount?.id === result.glAccount)?.glAccount?.glCode || ''
          }
        };
        this.costData.costs = [newCost, ...this.costData.costs];
        this.dataSource.data = this.costData.costs;

        // Show success message
        this.snackBar.open(
          this.translateService.instant('labels.messages.Cost Added Successfully'),
          'Close',
          { duration: 3000 }
        );
      }
    });
  }
} 