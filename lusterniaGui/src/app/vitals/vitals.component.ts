import {ChangeDetectionStrategy, Component, Input, OnInit} from '@angular/core';
import {Entity, Player, Vitals} from '../gmcp';

@Component({
  selector: 'app-vitals',
  templateUrl: './vitals.component.html',
  styleUrls: ['./vitals.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class VitalsComponent implements OnInit {
  @Input() vitals: Vitals;
  @Input() entities: Entity[];
  @Input() players: Player[];
  vitalsToShow = [
    {name: 'hp', colour: 'red'},
    {name: 'mp', colour: 'blue'},
    {name: 'ego', colour: 'white'},
    {name: 'pow', colour: 'purple'}
  ];

  constructor() {
  }

  get groupedMonsters() {
    const grouped: { name: string; count: number }[] = [];
    this.entities.forEach(ent => {
      if (!ent.attrib || !ent.attrib.includes('m')) {
        return;
      }
      const entName = ent.name;
      if (!grouped.filter(groupedEnt => {
        if (groupedEnt.name === entName) {
          groupedEnt.count++;
          return true;
        }
        return false;
      }).length) {
        grouped.push({name: entName, count: 1});
      }
    });
    return grouped;
  }

  get groupedItems() {
    const grouped: { name: string; count: number }[] = [];
    this.entities.forEach(ent => {
      if (ent.attrib && ent.attrib.includes('m')) {
        return;
      }
      const entName = ent.name;
      if (!grouped.filter(groupedEnt => {
        if (groupedEnt.name === entName) {
          groupedEnt.count++;
          return true;
        }
        return false;
      }).length) {
        grouped.push({name: entName, count: 1});
      }
    });
    return grouped;
  }

  ngOnInit() {
  }
}
