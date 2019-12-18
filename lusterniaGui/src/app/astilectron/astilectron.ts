import {Injectable, NgZone} from '@angular/core';
import {BehaviorSubject, Observable, ReplaySubject, Subject} from 'rxjs';
import {take} from 'rxjs/operators';

// This is the global window.astilectron object that allows communication between
// render and main process. It needs to be declared like this to avoid reference
// errors.
declare var astilectron: any;

// Astilectron class provides an API for communicating to Astilectron backend
// from TypeScript
@Injectable()
export class Astilectron {
  private _msgId = 0;

  constructor(private zone: NgZone) {
    // Bind to astilectron-ready event. We'll enable astilectron communication
    // when it becomes available.
    document.addEventListener('astilectron-ready', (e) => {
      this.log('doc.add astilectron-ready');
      this.zone.run(() => this.onReady(e));
    });
  }

  private _isReady: BehaviorSubject<boolean> = new BehaviorSubject(false);

  // isReady returns an observable that tells if Astilectron is ready for IPC.
  get isReady(): Observable<boolean> {
    return this._isReady.asObservable();
  }

  private _messages: ReplaySubject<any> = new ReplaySubject(10);

  // messages seen before subscription.
  get messages(): Observable<{ name: string; payload: any }> {
    return this._messages.asObservable();
  }

  // matching result.
  public send(name: string, payload: string): Observable<string> {
    const jsonMsg = JSON.stringify({name, payload});
    console.log('doing send', jsonMsg);
    this.log('doing send', jsonMsg);
    // Return error if not ready yet
    if (this._isReady.value === false) {
      const s = new Subject<string>();
      s.error('not ready');
      return s.asObservable();
    }

    const sub = new Subject<string>();
    astilectron.sendMessage({name, payload}, response => {
      sub.next(response);
    });

    // const sub: Subject<Message> = new Subject();
    // this._messages.pipe(
    //   filter((m: Message) => m.id === message.id),
    //   timeout(5000),
    //   take(1))
    //   .subscribe(
    //     (m: Message) => {
    //       if (m.type === MESSAGE_TYPE_ERROR) {
    //         sub.error(new Error(m.data));
    //         return;
    //       }
    //       sub.next(m);
    //     },
    //     e => sub.error(e),
    //     () => sub.complete()
    //   );

    return sub.asObservable().pipe(take(1));
  }

  private log(...rest) {
    console.log('[astilectron]', ...rest);
  }

  // send sends an message to backend. Returns an observable that will contain

  // onReady is called when global event 'astilectron-ready' is received.
  private onReady(e: Event) {
    this.log('now ready!', e);

    // Setup listener for astilectron messages.
    astilectron.onMessage((m) => {
      this.zone.run(() => this.handleMessage(m));
      return 'ACK';
    });

    // Mark astilectron ready for use.
    this._isReady.next(true);
  }

  // messages returns an observable stream of messages, returning at most 10 latest
  // onMessage pushes messages to the message stream as they are received.
  private handleMessage(m: any) {
    this._messages.next(m);
  }
}
