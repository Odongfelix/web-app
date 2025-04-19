import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class AssetsService {
  constructor(private http: HttpClient) { }

  getFixedAssets(): Observable<any> {
    return this.http.get('/fixedassets');
  }
} 