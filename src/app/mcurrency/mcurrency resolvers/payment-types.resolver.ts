import { Injectable } from '@angular/core';
import {
  Router, Resolve,
  RouterStateSnapshot,
  ActivatedRouteSnapshot
} from '@angular/router';
import { Observable, of } from 'rxjs';
import {McurrencyService} from '../mcurrency.service';

@Injectable()
export class PaymentTypesResolver implements Resolve<Object> {
  constructor(private mcurrencyService: McurrencyService) {}
  resolve(): Observable<any> {
    return this.mcurrencyService.getPaymentTypes()
}
}
