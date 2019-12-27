import {Component, Input, OnInit} from '@angular/core';

@Component({
  selector: 'app-indicator',
  templateUrl: './indicator.component.html',
  styleUrls: ['./indicator.component.scss']
})
export class IndicatorComponent implements OnInit {
  @Input() color: string;
  @Input() current: number;
  @Input() max: number;
  @Input() label: string;

  constructor() { }

  ngOnInit() {
  }

}
