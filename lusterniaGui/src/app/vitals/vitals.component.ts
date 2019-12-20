import {Component, Input, OnInit} from '@angular/core';
import {Vitals} from '../gmcp/vitals';

@Component({
  selector: 'app-vitals',
  templateUrl: './vitals.component.html',
  styleUrls: ['./vitals.component.scss']
})
export class VitalsComponent implements OnInit {
  @Input() vitals: Vitals;

  constructor() { }

  ngOnInit() {
  }

}
