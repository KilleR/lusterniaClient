import {Injectable} from '@angular/core';
import {ActivatedRouteSnapshot, Resolve, RouterStateSnapshot} from '@angular/router';
import {Observable} from 'rxjs';

import {Astilectron} from './astilectron';
import {filter, take} from 'rxjs/operators';

// AstilectronReadyResolver waits until Astilectron ready state changes to true.
@Injectable()
export class AstilectronReadyResolver implements Resolve<any> {
  constructor(private asti: Astilectron) {
  }

  resolve(
    route: ActivatedRouteSnapshot,
    state: RouterStateSnapshot
  ): Observable<any> | Promise<any> | any {
    return this.asti.isReady.pipe(filter((s) => s === true), take(1));
  }
}
