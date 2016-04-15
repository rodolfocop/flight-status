import moment from 'moment';
import {Component} from 'angular2/core';

import flightSearchComponentTemplate from './flight-search.component.html!text';
import flightSearchComponentStyle from './flight-search.component.css!text'

import {TripRequest} from "../trip-request.interface/trip-request.interface";
import {FlightSearchFormComponent} from "./flight-search-form.component/flight-search-form.component";
import {FlightSearchResultComponent} from "./flight-search-result.component/flight-search-result.component";
import {TripResponse} from "../trip-response.interface/trip-response.interface";

import tripRequestMock from '../trip-request.interface/trip-request.mock.json!text';
import tripResponseMock from '../trip-response.interface/trip-response.mock.json!text';


@Component({
    selector: 'flight-search',
    template: flightSearchComponentTemplate,
    styles: [flightSearchComponentStyle],
    directives: [
        [FlightSearchFormComponent, FlightSearchResultComponent]
    ],
})
export class FlightSearchComponent {
    public defaultTripRequest:TripRequest = JSON.parse(tripRequestMock);
    //public searchResults:TripResponse = JSON.parse(tripResponseMock);
    public searchResults:TripResponse;

    public getCurrentDate() {
        return moment().format('YYYY-MM-DD');
    }

    public getResult(value:TripResponse) {
        this.searchResults = value;
    }
}