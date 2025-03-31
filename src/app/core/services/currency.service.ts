import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

export interface Currency {
  code: string;
  name: string;
  symbol: string;
  decimalPlaces: number;
}

@Injectable({
  providedIn: 'root'
})
export class CurrencyService {
  
  constructor(private http: HttpClient) { }

  /**
   * @returns {Observable<Currency[]>} Currencies.
   */
  getCurrencies(): Observable<Currency[]> {
    return this.http.get<Currency[]>('/currencies');
  }

  /**
   * @returns {Observable<any>} Exchange Rates.
   */
  getExchangeRates(): Observable<any> {
    return this.http.get('/currencies/exchange-rates');
  }
} 