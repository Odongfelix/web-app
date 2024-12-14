import { Injectable } from '@angular/core';
import {
  Router, Resolve,
  RouterStateSnapshot,
  ActivatedRouteSnapshot
} from '@angular/router';
import { Observable, of } from 'rxjs';
import { McurrencyService } from '../mcurrency.service';

@Injectable({
  providedIn: 'root'
  }
)
export class OfficesResolver implements Resolve<boolean> {
  constructor(private mcurrencyService: McurrencyService) {
  }
  resolve(): Observable<any> {
    return this.mcurrencyService.getOffices();
  }
}
