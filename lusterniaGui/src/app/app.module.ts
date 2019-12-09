import { BrowserModule } from '@angular/platform-browser';
import { NgModule } from '@angular/core';

import { AppComponent } from './app.component';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import {Route, RouterModule} from '@angular/router';
import { WrapperComponent } from './wrapper/wrapper.component';
import {MatSliderModule, MatToolbarModule} from '@angular/material';
import {AstilectronModule} from './astilectron';
import {ReactiveFormsModule} from '@angular/forms';

const routes: Route[] = [
  {
    path: '',
    component: WrapperComponent,
  }
]

@NgModule({
  declarations: [
    AppComponent,
    WrapperComponent
  ],
  imports: [
    BrowserModule,
    BrowserAnimationsModule,
    RouterModule.forRoot(routes),
    AstilectronModule,
    MatSliderModule,
    MatToolbarModule,
    ReactiveFormsModule
  ],
  providers: [],
  bootstrap: [AppComponent]
})
export class AppModule { }
