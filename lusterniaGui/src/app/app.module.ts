import {BrowserModule} from '@angular/platform-browser';
import {NgModule} from '@angular/core';

import {AppComponent} from './app.component';
import {BrowserAnimationsModule} from '@angular/platform-browser/animations';
import {Route, RouterModule} from '@angular/router';
import {WrapperComponent} from './wrapper/wrapper.component';
import {
  MatButtonModule,
  MatCardModule,
  MatChipsModule,
  MatExpansionModule,
  MatInputModule,
  MatSliderModule,
  MatToolbarModule
} from '@angular/material';
import {AstilectronModule} from './astilectron';
import {ReactiveFormsModule} from '@angular/forms';
import {VitalsComponent} from './vitals/vitals.component';
import {CommonComponentsModule} from './common/common.module';
import {LoginComponent} from './login/login.component';
import { MapComponent } from './map/map.component';

const routes: Route[] = [
  {
    path: '',
    redirectTo: 'login',
    pathMatch: 'full'
  },
  {
    path: 'client',
    component: WrapperComponent,
  },
  {
    path: 'login',
    component: LoginComponent,
  }
];

@NgModule({
  declarations: [
    AppComponent,
    WrapperComponent,
    VitalsComponent,
    LoginComponent,
    MapComponent
  ],
  imports: [
    BrowserModule,
    BrowserAnimationsModule,
    RouterModule.forRoot(routes),
    AstilectronModule,
    MatSliderModule,
    MatToolbarModule,
    ReactiveFormsModule,
    CommonComponentsModule,
    MatInputModule,
    MatExpansionModule,
    MatChipsModule,
    MatCardModule,
    MatButtonModule
  ],
  providers: [],
  bootstrap: [AppComponent]
})
export class AppModule {
}
