import { Injectable } from '@angular/core';
import { environment } from 'environments/environment';
import { interval, merge, fromEvent, Observable, Subject} from 'rxjs';
import { takeUntil, repeat, map} from 'rxjs/operators';

/**
 *  Idle timeout service used to track idle user
 */
@Injectable({
    providedIn: 'root'
})
export class IdleTimeoutService {
    private timeoutSubject = new Subject<void>();
    private timer: any;
    private events = ['mousemove', 'keydown', 'wheel', 'mousedown', 'scroll'];
    private $signal = merge(...this.events.map(eventName => fromEvent(document, eventName)));

    // observable timeout
    readonly $onSessionTimeout: Observable<void>;

    constructor() {
        this.$onSessionTimeout = this.timeoutSubject.asObservable();
        this.startTimer();

        // Reset timer on any user activity
        this.$signal.subscribe(() => {
            this.resetTimer();
        });
    }

    private startTimer() {
        this.timer = setTimeout(() => {
            this.timeoutSubject.next();
        }, environment.session.timeout.idleTimeout);
    }

    private resetTimer() {
        if (this.timer) {
            clearTimeout(this.timer);
        }
        this.startTimer();
    }

    public stopTimer() {
        if (this.timer) {
            clearTimeout(this.timer);
        }
    }
}
