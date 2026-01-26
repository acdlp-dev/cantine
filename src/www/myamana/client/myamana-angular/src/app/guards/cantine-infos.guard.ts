import { Injectable } from '@angular/core';
import { CanActivate, Router, UrlTree } from '@angular/router';
import { Observable, of } from 'rxjs';
import { catchError, map } from 'rxjs/operators';
import { CantineService } from '../modules/cantine/services/cantine.service';

@Injectable({ providedIn: 'root' })
export class CantineInfosGuard implements CanActivate {
  constructor(private cantineService: CantineService, private router: Router) {}

  canActivate(): Observable<boolean | UrlTree> {
    return this.cantineService.checkCanteInfosCompleted().pipe(
      map((res: any) => {
        const isComplete = !!res?.isComplete;
        return isComplete ? true : this.router.parseUrl('/cantine/infos');
      }),
      catchError(() => {
        // En cas d'erreur, laisser passer pour éviter faux blocage
        return of(true);
      })
    );
  }
}
