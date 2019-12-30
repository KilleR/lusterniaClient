import {Injectable} from '@angular/core';

@Injectable({
  providedIn: 'root'
})
export class HistoryService {
  commandList: string[] = [];
  historyIndex = 0;

  constructor() {
  }

  prev(): string {
    if (this.historyIndex < this.commandList.length) {
      this.historyIndex++;
    }
    return this.commandList[this.commandList.length - this.historyIndex];
  }

  next(): string {
    if (this.historyIndex > 0) {
      this.historyIndex--;
    }
    return this.commandList[this.commandList.length - this.historyIndex];
  }

  add(item: string) {
    if (!item) {
      return;
    }
    if (this.commandList[this.commandList.length - 1] !== item) {
      this.commandList.push(item);
    }
    this.historyIndex = 0;
    console.log(this.commandList);
  }
}
