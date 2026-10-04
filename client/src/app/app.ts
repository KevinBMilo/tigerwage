import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { ApplicationList } from './components/application-list/application-list';
import { ApplicationForm } from './components/application-form/application-form';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, ApplicationList, ApplicationForm],
  templateUrl: './app.html',
  styleUrl: './app.scss',
})
export class App {}