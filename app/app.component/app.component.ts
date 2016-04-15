import {Component} from 'angular2/core';
import {FlightSearchComponent} from './flight-search.component/flight-search.component';

import appComponentTeplmate from './app.component.html!text';
import appComponentStyles from './app.component.css!text'

@Component({
    selector: 'my-app',
    template: appComponentTeplmate,
    directives: [
        [FlightSearchComponent]
    ],
    styles: [appComponentStyles],
    providers: []
})

export class AppComponent {
    public title = 'Flight Status';
}