import {Component, OnDestroy, OnInit} from '@angular/core';
import {FormBuilder, FormGroup} from '@angular/forms';
import {Astilectron} from '../astilectron';
import {Router} from '@angular/router';
import {Subject} from 'rxjs';
import {takeUntil} from 'rxjs/operators';

@Component({
  selector: 'app-login',
  templateUrl: './login.component.html',
  styleUrls: ['./login.component.scss']
})
export class LoginComponent implements OnInit, OnDestroy {

  $onDestroy: Subject<void>;

  loginForm: FormGroup;

  constructor(private fb: FormBuilder, private asti: Astilectron, private router: Router) {
  }

  ngOnInit() {
    this.$onDestroy = new Subject<void>()
    this.loginForm = this.fb.group({
      user: [''],
      pass: [''],
    });
  }

  ngOnDestroy() {
    this.$onDestroy.next();
    this.$onDestroy.complete();
  }

  doLogin() {
    const user = this.loginForm.get('user').value;
    const pass = this.loginForm.get('pass').value;

    if (user && pass) {
      console.log(user, pass);
      this.asti.send('login', JSON.stringify({user, pass})).subscribe(res => {
        this.router.navigate(['client']);
      });
    }
  }
}
