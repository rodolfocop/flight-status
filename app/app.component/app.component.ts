import {Component} from 'angular2/core';
import {FlightSearchComponent} from './flight-search.component/flight-search.component';

@Component({
    selector: 'app',
    directives: [
        [FlightSearchComponent]
    ],
    template: require('./app.component.html'),
})

export class AppComponent {
    public title = 'Flight Status';
}