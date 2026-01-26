import { NgModule } from '@angular/core';
import { provideHttpClient, withInterceptorsFromDi } from '@angular/common/http';
import { AngularSvgIconModule } from 'angular-svg-icon';
import { BackofficeAuthRoutingModule } from './backoffice-auth-routing.module';

@NgModule({
    imports: [BackofficeAuthRoutingModule, AngularSvgIconModule.forRoot()],
    providers: [provideHttpClient(withInterceptorsFromDi())]
})
export class BackofficeAuthModule { }
