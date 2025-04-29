import { Injectable } from '@angular/core';
import { Resolve, ActivatedRouteSnapshot } from '@angular/router';
import { Observable } from 'rxjs';
import { LoansService } from '../loans.service';

@Injectable()
export class LoanHandlingCostsResolver implements Resolve<Object> {
  constructor(private loansService: LoansService) { }

  resolve(route: ActivatedRouteSnapshot): Observable<any> {
    const loanId = route.paramMap.get('loanId') || route.parent.paramMap.get('loanId');
    return this.loansService.getLoanHandlingCosts(loanId);
  }
} 