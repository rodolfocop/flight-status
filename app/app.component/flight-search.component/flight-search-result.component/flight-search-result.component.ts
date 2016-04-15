import {Component, Input} from 'angular2/core';
import moment from 'moment';

import flightSearchResultComponentTemplate from './flight-search-result.component.html!text';
import flightSearchResultComponentStyle from './flight-search-result.component.css!text'


@Component({
    selector: 'flight-search-result',
    template: flightSearchResultComponentTemplate,
    styles: [flightSearchResultComponentStyle],
})
export class FlightSearchResultComponent {
    @Input() result;

    findData(origin:Array, value:any) {
        return origin.find((elem) => elem.code === value).name;
    }
}