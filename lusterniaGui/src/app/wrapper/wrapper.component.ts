import {ChangeDetectorRef, Component, OnInit, ViewEncapsulation} from '@angular/core';
import {Astilectron} from '../astilectron';
import * as Convert from 'ansi-to-html';

@Component({
  selector: 'app-wrapper',
  templateUrl: './wrapper.component.html',
  styleUrls: ['./wrapper.component.scss'],
  encapsulation: ViewEncapsulation.None
})
export class WrapperComponent implements OnInit {
  messages = [];
  convert: any;

  constructor(private cdr: ChangeDetectorRef, private asti: Astilectron) {
    this.convert = new Convert({
      fg: '#FFF',
      bg: '#000',
      newline: false,
      escapeXML: false,
      stream: true
    });
  }

  ngOnInit() {
    this.asti.messages.subscribe(msg => {
      console.log(msg);
      const content = JSON.parse(msg);
      const htmlContent = this.convert.toHtml(content.content);
      console.log(htmlContent);
      if (content.type === 'main') {
        // output.innerHTML += `<p style="white-space: pre-wrap">${htmlContent}</p>`;
        this.messages.push(htmlContent);
        this.cdr.detectChanges();
      }
    });
    // document.addEventListener('astilectron-ready', () => {
    //   astilectron.onMessage((message) => {
    //     console.log('aim', message);
    //     // const output = document.getElementById('output');
    //     const content = JSON.parse(message);
    //     const htmlContent = ansiHtml(content.content);
    //     console.log(htmlContent);
    //     if (content.type === 'main') {
    //       // output.innerHTML += `<p style="white-space: pre-wrap">${htmlContent}</p>`;
    //       this.messages.push(htmlContent);
    //       this.cdr.detectChanges();
    //     }
    //
    //
    //     // output.scrollTop = output.scrollHeight;
    //     return 'ACK';
    //   });
    // });
  }

  sendMessage(msg: string) {
    const input = document.getElementById('prompt');
    // astilectron.sendMessage(msg, (response) => {
    //   console.log('response:', response);
    // });
    this.asti.send('thing', 'stuff');
  }

}
