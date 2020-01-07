import {NgModule} from '@angular/core';
import {CommonModule} from '@angular/common';
import {IndicatorComponent} from './indicator/indicator.component';
import { MessageContainerComponent } from './message-container/message-container.component';


@NgModule({
  declarations: [IndicatorComponent, MessageContainerComponent],
  exports: [
    IndicatorComponent,
    MessageContainerComponent
  ],
  imports: [
    CommonModule
  ]
})
export class CommonComponentsModule {
}
