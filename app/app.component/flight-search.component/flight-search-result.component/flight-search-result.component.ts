import {Component, Input} from 'angular2/core';
import moment from 'moment';

@Component({
    selector: 'flight-search-result',
    templateUrl: 'app/app.component/flight-search.component/flight-search-result.component/flight-search-result.component.html',
    styleUrls: ['app/app.component/flight-search.component/flight-search-result.component/flight-search-result.component.css'],
})
export class FlightSearchResultComponent {
    @Input() result;

    parseData(origin:Array<any>, value:any) {
        return origin.find((elem) => elem.code === value).name;
    }
}