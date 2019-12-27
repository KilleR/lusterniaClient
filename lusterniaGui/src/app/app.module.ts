import { BrowserModule } from '@angular/platform-browser';
import { NgModule } from '@angular/core';

import { AppComponent } from './app.component';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import {Route, RouterModule} from '@angular/router';
import { WrapperComponent } from './wrapper/wrapper.component';
import {MatExpansionModule, MatInputModule, MatSliderModule, MatToolbarModule} from '@angular/material';
import {AstilectronModule} from './astilectron';
import {ReactiveFormsModule} from '@angular/forms';
import { VitalsComponent } from './vitals/vitals.component';
import { IndicatorComponent } from './common/indicator/indicator.component';
import {CommonComponentsModule} from './common/common.module';

const routes: Route[] = [
  {
    path: '',
    component: WrapperComponent,
  }
]

@NgModule({
  declarations: [
    AppComponent,
    WrapperComponent,
    VitalsComponent
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
    MatExpansionModule
  ],
  providers: [],
  bootstrap: [AppComponent]
})
export class AppModule { }
