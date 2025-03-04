/** Angular Imports */
import { CollectionViewer, DataSource } from '@angular/cdk/collections';

/** rxjs Imports */
import { Observable, BehaviorSubject } from 'rxjs';
import { catchError, finalize } from 'rxjs/operators';
import { of } from 'rxjs';

/** Custom Services */
import { AccountingService } from '../accounting.service';

/**
 * Journal entries custom data source to implement server side filtering, pagination and sorting.
 */
export class JournalEntriesDataSource implements DataSource<any> {

  /** Journal entries behavior subject to represent loaded journal entries page. */
  private journalEntriesSubject = new BehaviorSubject<any[]>([]);
  /** Records subject to represent total number of filtered journal entry records. */
  private recordsSubject = new BehaviorSubject<number>(0);
  /** Loading subject to represent loading state. */
  private loadingSubject = new BehaviorSubject<boolean>(false);
  /** Records observable which can be subscribed to get the value of total number of filtered journal entry records. */
  public records$ = this.recordsSubject.asObservable();
  /** Loading observable which can be subscribed to get the loading state. */
  public loading$ = this.loadingSubject.asObservable();

  /**
   * @param {AccountingService} accountingService Accounting Service
   */
  constructor(private accountingService: AccountingService) { }

  /**
   * Gets journal entries on the basis of provided parameters and emits the value.
   * @param {any} filterBy Properties by which entries should be filtered.
   * @param {string} orderBy Property by which entries should be sorted.
   * @param {string} sortOrder Sort order: ascending or descending.
   * @param {number} pageIndex Page number.
   * @param {number} pageSize Number of entries within the page.
   */
  getJournalEntries(filterBy: any, orderBy: string = '', sortOrder: string = '', pageIndex: number = 0, pageSize: number = 10) {
    // For debugging
    console.log('Sending filters to backend:', filterBy);
    
    this.journalEntriesSubject.next([]);
    this.loadingSubject.next(true);

    orderBy = (orderBy === 'debit' || orderBy === 'credit') ? 'amount' : orderBy;
    
    this.accountingService.getJournalEntries(filterBy, orderBy, sortOrder, pageIndex * pageSize, pageSize)
      .pipe(
        catchError(() => of({ pageItems: [], totalFilteredRecords: 0 })),
        finalize(() => this.loadingSubject.next(false))
      )
      .subscribe(
        (response: any) => {
          console.log('Backend response:', response);
          this.journalEntriesSubject.next(response.pageItems);
          this.recordsSubject.next(response.totalFilteredRecords);
        }
      );
  }

  /**
   * @param {CollectionViewer} collectionViewer
   */
  connect(collectionViewer: CollectionViewer): Observable<any[]> {
    return this.journalEntriesSubject.asObservable();
  }

  /**
   * @param {CollectionViewer} collectionViewer
   */
  disconnect(collectionViewer: CollectionViewer): void {
    this.journalEntriesSubject.complete();
    this.recordsSubject.complete();
    this.loadingSubject.complete();
  }

}
