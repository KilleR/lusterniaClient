import {ChangeDetectorRef, Component, ElementRef, OnInit, ViewChild, ViewEncapsulation} from '@angular/core';
import {Astilectron} from '../astilectron';
import * as Convert from 'ansi-to-html';
import {DomSanitizer} from '@angular/platform-browser';
import {FormBuilder, FormGroup} from '@angular/forms';

@Component({
  selector: 'app-wrapper',
  templateUrl: './wrapper.component.html',
  styleUrls: ['./wrapper.component.scss'],
  encapsulation: ViewEncapsulation.None
})
export class WrapperComponent implements OnInit {
  messages = [];
  convert: any;

  form: FormGroup;

  @ViewChild('mainPane', {static: false}) mainPane: ElementRef;

  constructor(private cdr: ChangeDetectorRef, private asti: Astilectron, private sanitizer: DomSanitizer, private _fb: FormBuilder) {
    this.convert = new Convert({
      fg: '#FFF',
      bg: '#000',
      newline: false,
      escapeXML: false,
      stream: true
    });
    this.form = _fb.group({
      prompt: [''],
    });
  }

  ngOnInit() {
    this.asti.messages.subscribe(msg => {
      console.log(msg);
      const content = JSON.parse(msg);
      const htmlContent = this.sanitizer.bypassSecurityTrustHtml(this.convert.toHtml(content.content));
      console.log(htmlContent);
      if (content.type === 'main') {
        // output.innerHTML += `<p style="white-space: pre-wrap">${htmlContent}</p>`;
        this.messages.push(htmlContent);
        this.cdr.detectChanges();
        this.mainPane.nativeElement.scrollTop = this.mainPane.nativeElement.scrollHeight;
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

  handlePromptSubmit() {
    const prompt = this.form.get('prompt');
    const message = prompt.value;
    this.sendToAsti(message);
    prompt.setValue('');
  }

  sendToAsti(msg: string) {
    console.log('send:', msg);
    this.asti.send(msg).subscribe(res => {
      console.log('response from Asti:', res);
    });
  }

}
