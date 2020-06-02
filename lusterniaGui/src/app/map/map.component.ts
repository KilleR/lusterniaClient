import {Component, Input, OnInit} from '@angular/core';

@Component({
  selector: 'app-map',
  templateUrl: './map.component.html',
  styleUrls: ['./map.component.scss']
})
export class MapComponent implements OnInit {
  @Input() source: string;
  @Input() offsetX: number;
  @Input() offsetY: number;

  constructor() {
  }

  ngOnInit() {
  }

}
