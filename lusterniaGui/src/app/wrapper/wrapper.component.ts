import {ChangeDetectorRef, Component, ElementRef, HostListener, OnInit, ViewChild} from '@angular/core';
import {Astilectron} from '../astilectron';
import * as Convert from 'ansi-to-html';
import {DomSanitizer} from '@angular/platform-browser';
import {FormBuilder, FormGroup} from '@angular/forms';
import {filter, map, share, tap} from 'rxjs/operators';
import {throwError} from 'rxjs';

@Component({
  selector: 'app-wrapper',
  templateUrl: './wrapper.component.html',
  styleUrls: ['./wrapper.component.scss'],
})
export class WrapperComponent implements OnInit {
  messages = [];
  convert: any;

  form: FormGroup;

  @ViewChild('mainPane', {static: false}) mainPane: ElementRef;
  @ViewChild('prompt', {static: false}) prompt: ElementRef;

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
      // map(msg => {
      //
      //   try {
      //     return JSON.parse(msg.payload);
      //   } catch (e) {
      //     console.error('Unable to parse JSON', msg);
      //     return throwError('JSON parse failure');
      //   }
      // }),
      share());
    const content$ = messages$.pipe(filter(msg => msg.name === 'main'));
    const gmcp$ = messages$.pipe(filter(msg => msg.name === 'GMCP'));

    content$.subscribe(content => {
      console.log(content);
      const htmlContent = this.sanitizer.bypassSecurityTrustHtml(this.convert.toHtml(content.payload));
      if (content.name === 'main') {
        this.messages.push(htmlContent);
        this.cdr.detectChanges();
        this.mainPane.nativeElement.scrollTop = this.mainPane.nativeElement.scrollHeight;
      }
    });

    gmcp$.subscribe(msg => {
      console.log(msg);
    });
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

}
