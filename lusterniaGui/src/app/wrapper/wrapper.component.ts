import {ChangeDetectorRef, Component, ElementRef, HostListener, OnInit, ViewChild} from '@angular/core';
import {Astilectron} from '../astilectron';
import * as Convert from 'ansi-to-html';
import {DomSanitizer, SafeHtml} from '@angular/platform-browser';
import {FormBuilder, FormGroup} from '@angular/forms';
import {filter, share, tap} from 'rxjs/operators';
import {Vitals} from '../gmcp/vitals';

@Component({
  selector: 'app-wrapper',
  templateUrl: './wrapper.component.html',
  styleUrls: ['./wrapper.component.scss'],
})
export class WrapperComponent implements OnInit {
  messages = [];
  convert: any;

  vitals: Vitals = new Vitals();

  form: FormGroup;

  @ViewChild('mainPane', {static: false}) mainPane: ElementRef;
  @ViewChild('prompt', {static: false}) prompt: ElementRef;

  constructor(private cdr: ChangeDetectorRef, private asti: Astilectron, private sanitizer: DomSanitizer, private _fb: FormBuilder) {
    this.convert = new Convert({
      fg: '#FFF',
      bg: '#000',
      newline: false,
      escapeXML: false,
      stream: true,
      colors: {
        0: '#000000',
        1: '#800000',
        2: '#00b300',
        3: '#808000',
        4: '#0000a0',
        5: '#800080',
        6: '#008080',
        7: '#aaaaaa',

        8: '#464646',
        9: '#ff0000',
        10: '#00ff00',
        11: '#ffff00',
        12: '#0000ff',
        13: '#ff00ff',
        14: '#00ffff',
        15: '#ffffff',
      }
    });
    this.form = _fb.group({
      prompt: [''],
    });
  }

  // @HostListener('mouseup') mouseUp() {
  //   console.log('Mouse Up event');
  //   this.prompt.nativeElement.focus();
  // }
  //
  // @HostListener('click') click() {
  //   console.log('Click event');
  //   this.prompt.nativeElement.focus();
  // }

  @HostListener('window:keydown') keydown() {
    console.log('keydown');
    this.prompt.nativeElement.focus();
  }

  ngOnInit() {
    const messages$ = this.asti.messages.pipe(
      tap(msg => console.log('raw asti:', msg)),
      share());
    const content$ = messages$.pipe(filter(msg => msg.name === 'telnet.content'));
    const gmcp$ = messages$.pipe(filter(msg => msg.name.startsWith('GMCP.')));

    content$.subscribe(content => {
      const htmlContent = this.sanitizer.bypassSecurityTrustHtml(this.convert.toHtml(content.payload));
      if (content.name === 'telnet.content') {
        this.writeToScreen(htmlContent);
      }
    });

    gmcp$.subscribe(msg => {
      this.handleGMCP(msg.name, msg.payload);
    });
  }

  writeToScreen(text: SafeHtml) {
    this.messages.push(text);
    this.cdr.detectChanges();
    this.mainPane.nativeElement.scrollTop = this.mainPane.nativeElement.scrollHeight;
  }

  handlePromptSubmit() {
    const prompt = this.form.get('prompt');
    const message = prompt.value;
    this.sendToAsti(message);
    prompt.setValue('');
  }

  sendToAsti(msg: string) {
    console.log('send:', msg);
    this.asti.send('command', msg).subscribe(res => {
      console.log('response from Asti:', res);
    });
  }

  promptKeyDown(event: KeyboardEvent) {
    if (!event.shiftKey && event.key === 'Enter') {
      event.preventDefault();
      this.handlePromptSubmit();
    }
  }

  handleGMCP(method: string, content: string) {
    console.log('GOT GMCP:', method, content);
    const gmcpMethodPath = method.split('.');
    console.log('mehtod path', gmcpMethodPath);
    switch (gmcpMethodPath[1]) {
      case 'Core':
        if (gmcpMethodPath.length < 2 || !gmcpMethodPath[1]) {
          this.GMCPError(method, content);
          return;
        }
        switch (gmcpMethodPath[2]) {
          case 'Goodbye':
            console.log('GOODBYE!');
            // TODO: route to login
            setTimeout(window.close, 2000)
            break;
          default:
            console.log('[GMCP] Unknown Core Method:', method);
        }
        break;
      case 'Char':
        switch (gmcpMethodPath[2]) {
          case 'Vitals':
            this.vitals = Vitals.fromJsonString(content);
            console.log('new vitals:', this.vitals);
            break;
          default:
            console.log('[GMCP] Unknown Char Method:', method);
        }
        break;
      default:
        console.log('[GMCP] Unknown Method:', method);
    }
  }

  GMCPError(method: string, content: string) {
    console.error('[GMCP] Failed to parse:');
  }

}
