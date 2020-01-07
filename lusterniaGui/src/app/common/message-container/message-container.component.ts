import {AfterViewChecked, ChangeDetectionStrategy, Component, ElementRef, Input, OnChanges, SimpleChanges, ViewChild} from '@angular/core';
import {SafeHtml} from '@angular/platform-browser';

@Component({
  selector: 'app-message-container',
  templateUrl: './message-container.component.html',
  styleUrls: ['./message-container.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class MessageContainerComponent implements AfterViewChecked {
  @ViewChild('scrollContent', {static: true}) scrollContent: ElementRef;

  @Input() content: SafeHtml[];
  @Input() hasContent: any;

  constructor() {
  }

  ngAfterViewChecked() {
    this.scrollContent.nativeElement.scrollTop = this.scrollContent.nativeElement.scrollHeight;
  }
}
