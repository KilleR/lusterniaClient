import {Component, OnInit} from '@angular/core';
import {FormBuilder, FormGroup} from '@angular/forms';
import {Astilectron} from '../astilectron';
import {Router} from '@angular/router';

@Component({
  selector: 'app-login',
  templateUrl: './login.component.html',
  styleUrls: ['./login.component.scss']
})
export class LoginComponent implements OnInit {

  loginForm: FormGroup;

  constructor(private fb: FormBuilder, private asti: Astilectron, private router: Router) {
  }

  ngOnInit() {
    this.loginForm = this.fb.group({
      user: [''],
      pass: [''],
    });
    this.asti.messages.subscribe(
      msg => console.log('raw asti:', msg)
    );
  }

  doLogin() {
    const user = this.loginForm.get('user').value;
    const pass = this.loginForm.get('pass').value;

    if (user && pass) {
      console.log(user, pass);
      this.asti.send('login', JSON.stringify({user, pass})).subscribe(res => {
        console.log('response from Asti:', res);
        this.router.navigate(['client']);
      });
    }
  }
}
