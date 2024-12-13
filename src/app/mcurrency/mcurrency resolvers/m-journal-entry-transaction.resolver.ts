import { Injectable } from '@angular/core';
import {
  Router, Resolve,
  RouterStateSnapshot,
  ActivatedRouteSnapshot
} from '@angular/router';
import { Observable, of } from 'rxjs';
import { AccountingService } from '../../accounting/accounting.service';
import { McurrencyService } from '../mcurrency.service';

@Injectable()
export class MJournalEntryTransactionResolver implements Resolve<Object> {
  constructor(private mcurrencyService: McurrencyService) {}

  resolve(route: ActivatedRouteSnapshot) : Observable<any> {
    const transactionId = route.paramMap.get('id');
    return this.mcurrencyService.getJournalEntry(transactionId);
  }
}
