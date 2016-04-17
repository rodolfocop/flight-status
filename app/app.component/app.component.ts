import {Component} from 'angular2/core';
import {FlightSearchComponent} from './flight-search.component/flight-search.component';

@Component({
    selector: 'app',
    directives: [
        [FlightSearchComponent]
    ],
    templateUrl: 'app/app.component/app.component.html',
    styleUrls: ['app/app.component/app.component.css']
})

export class AppComponent {
    public title = 'Flight Status';
}