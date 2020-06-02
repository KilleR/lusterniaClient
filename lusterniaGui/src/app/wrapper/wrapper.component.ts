import {Component, ElementRef, HostListener, OnInit, ViewChild} from '@angular/core';
import {Astilectron} from '../astilectron';
import * as Convert from 'ansi-to-html';
import {DomSanitizer, SafeHtml} from '@angular/platform-browser';
import {FormBuilder, FormGroup} from '@angular/forms';
import {filter, pluck, share, tap} from 'rxjs/operators';
import {Entity, Player, Vitals} from '../gmcp';
import {HistoryService} from '../services';
import {BehaviorSubject} from 'rxjs';
import {Affliction} from '../gmcp/affliction';
import {Router} from '@angular/router';

class Keybind {
  id: string;
  key: number;
  alt: boolean;
  ctrl: boolean;
  shift: boolean;

  static fromAsti(input: any) {
    const out = new Keybind();
    out.id = input.guid;
    out.key = input.key;
    out.alt = input.key_alt;
    out.ctrl = input.key_ctrl;
    out.shift = input.key_shift;
    return out;
  }
}

@Component({
  selector: 'app-wrapper',
  templateUrl: './wrapper.component.html',
  styleUrls: ['./wrapper.component.scss'],
})
export class WrapperComponent implements OnInit {
  messages = [];
  convert: any;
  messages$: BehaviorSubject<SafeHtml[]>;
  keybinds: Keybind[] = [
    {
      id: '1 - 12',
      key: 68,
      shift: false,
      ctrl: true,
      alt: false,
    }
  ];

  vitals: Vitals = new Vitals();
  afflictions: Affliction[] = [];

  room: {
    players: Player[],
    entities: Entity[],
  } = {
    entities: [],
    players: []
  };

  form: FormGroup;

  @ViewChild('prompt', {static: false}) prompt: ElementRef;

  constructor(
    private router: Router,
    private asti: Astilectron,
    private sanitizer: DomSanitizer,
    private fb: FormBuilder,
    private history: HistoryService
  ) {
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
    this.form = fb.group({
      prompt: [''],
    });
  }

  @HostListener('window:keydown', ['$event']) keydown(event: KeyboardEvent) {
    console.log(event);
    if (['Control', 'Shift', 'Alt', 'AltGraph', 'ContextMenu', 'Meta'].includes(event.key)) {
      return;
    }
    if (this.checkKeybinds(event)) {
      return;
    }
    this.prompt.nativeElement.focus();
  }

  ngOnInit() {
    this.messages$ = new BehaviorSubject<SafeHtml[]>([]);

    const messages$ = this.asti.messages.pipe(
      tap(msg => console.log('raw asti:', msg)),
      share());
    const content$ = messages$.pipe(filter(msg => msg.name === 'telnet.content'));
    const notifications$ = messages$.pipe(filter(msg => msg.name === 'notify'));
    const gmcp$ = messages$.pipe(filter(msg => msg.name.startsWith('GMCP.')));

    content$.subscribe(content => {
      const htmlContent = this.sanitizer.bypassSecurityTrustHtml(this.convert.toHtml(content.payload));
      this.writeToScreen(htmlContent);
    });

    notifications$.subscribe(notification => {
      const htmlContent = this.sanitizer.bypassSecurityTrustHtml(
        '<p style="color:' + notification.payload.notice_fg + '; background-color:' + notification.payload.notice_bg + '">' +
        notification.payload.notice + '</p>'
      );
      this.writeToScreen(htmlContent);
    });

    gmcp$.subscribe(msg => {
      this.handleGMCP(msg.name, msg.payload);
    });

    // keybinds pushed from FileStore handler
    messages$.pipe(filter(msg => msg.name === 'keybinds'), pluck('payload')).subscribe(keybinds => {
      console.log('got keybinds');
      keybinds.forEach(keybind => {
        console.log('keybind:', keybind);
        this.keybinds.push(Keybind.fromAsti(keybind));
      });
    });
  }

  writeToScreen(text: SafeHtml) {
    this.messages.push(text);
    this.messages$.next([...this.messages]);
  }

  handlePromptSubmit() {
    const prompt = this.form.get('prompt');
    const message = prompt.value;
    this.history.add(message);
    this.sendToAsti(message);
    prompt.setValue('');
  }

  sendToAsti(msg: string, msgType = 'command') {
    console.log('send:', msg);
    this.asti.send(msgType, msg).subscribe(res => {
      console.log('response from Asti:', res);
    });
  }

  checkKeybinds(event: KeyboardEvent): boolean {
    let keyMatch = false;
    this.keybinds.forEach(keybind => {
      if (
        keybind.alt === event.altKey &&
        keybind.ctrl === event.ctrlKey &&
        keybind.shift === event.shiftKey &&
        keybind.key === event.which
      ) {
        console.log('Keybind match!');
        this.sendToAsti(keybind.id, 'keybind');
        event.stopPropagation();
        event.preventDefault();
        keyMatch = true;
      }
    });
    return keyMatch;
  }

  promptKeyDown(event: KeyboardEvent) {
    if (this.checkKeybinds(event)) {
      return;
    }
    switch (event.key) {
      case 'Enter':
        if (!event.shiftKey) {
          event.preventDefault();
          this.handlePromptSubmit();
        }
        break;
      case 'ArrowUp':
        console.log('Up Key');
        this.form.get('prompt').setValue(this.history.prev());
        break;
      case 'ArrowDown':
        this.form.get('prompt').setValue(this.history.next());
        break;
    }
  }

  handleGMCP(method: string, content: string) {
    console.log('GOT GMCP:', method, content);
    const gmcpMethodPath = method.split('.');
    console.log('method path', gmcpMethodPath);
    switch (gmcpMethodPath[1]) {
      case 'Core':
        switch (gmcpMethodPath[2]) {
          case 'Goodbye':
            console.log('GOODBYE!');
            const htmlContent = this.sanitizer.bypassSecurityTrustHtml(this.convert.toHtml(content));
            this.writeToScreen(htmlContent);
            setTimeout(() => this.router.navigate(['login']), 2000);
            // TODO: route to login
            // setTimeout(window.close, 2000);
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
          case 'Afflictions':
            switch (gmcpMethodPath[3]) {
              case 'List':
                this.afflictions = Affliction.fromJsonString(content);
                break;
              case 'Add':
                this.afflictions.push(...Affliction.fromJsonString(content));
                break;
              case 'Remove':
                const toDel = JSON.parse(content);
                this.afflictions = this.afflictions.filter(affliction => {
                  let shouldRemain = true;
                  toDel.forEach(aff => {
                    if (aff === affliction.name) {
                      shouldRemain = false;
                    }
                  });
                  return shouldRemain;
                });
                break;
              default:
                console.log('[GMCP] Unknown Char.Afflictions Method:', method);
            }
            break;
          case 'Items':
            switch (gmcpMethodPath[3]) {
              case 'List':
                this.room.entities = Entity.fromJsonString(content);
                break;
              default:
                console.log('[GMCP] Unknown Char.Items Method:', method);
            }
            break;
          default:
            console.log('[GMCP] Unknown Char Method:', method);
        }
        break;
      case 'Room':
        switch (gmcpMethodPath[2]) {
          case 'Players':
            this.room.players = Player.fromJsonString(content);
            break;
          default:
            console.log('[GMCP] Unknown Room Method:', method);
        }
        break;
      default:
        console.log('[GMCP] Unknown Method:', method);
    }
  }

}
