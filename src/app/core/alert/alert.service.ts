/** Angular Imports */
import { Injectable } from '@angular/core';

/** rxjs Imports */
import { Subject } from 'rxjs';

/** Custom Models */
import { Alert } from './alert.model';

/**
 * Alert service.
 */
@Injectable({
  providedIn: 'root'
})
export class AlertService {

  /** Alert subject. */
  private alertSubject = new Subject<Alert>();

  /** Alert event. */
  public alertEvent = this.alertSubject.asObservable();

  /**
   * Sends alert to subscribers.
   * @param {Alert} alert Alert.
   */
  alert(alert: Alert) {
    this.alertSubject.next(alert);
  }

  /**
   * Clears any existing alerts.
   */
  clearAlert() {
    this.alertSubject.next(null);
  }

}
