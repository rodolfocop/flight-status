import * as moment from 'moment';
import {Component} from 'angular2/core';

import {TripRequest} from "../trip-request.interface/trip-request.interface";
import {FlightSearchFormComponent} from "./flight-search-form.component/flight-search-form.component";
import {FlightSearchResultComponent} from "./flight-search-result.component/flight-search-result.component";
import {TripResponse} from "../trip-response.interface/trip-response.interface";

@Component({
    selector: 'flight-search',
    templateUrl: 'app/app.component/flight-search.component/flight-search.component.html',
    directives: [
        [FlightSearchFormComponent, FlightSearchResultComponent]
    ],
})
export class FlightSearchComponent {
    public searchError;

    public defaultTripRequest:TripRequest = {
        "request": {
            "slice": [
                {
                    "origin": "IEV",
                    "destination": "JFK",
                    "date": moment().add(1, 'day').format('YYYY-MM-DD')
                }
            ],
            "passengers": {
                "adultCount": 1,
                "infantInLapCount": 0,
                "infantInSeatCount": 0,
                "childCount": 0,
                "seniorCount": 0
            },
            "solutions": 3,
            "refundable": false
        }
    };
    public searchResults:TripResponse;

    public setResult(result:TripResponse) {
        this.searchResults = result;
    }

    public setError(error) {
        if (error) {
            this.searchError = JSON.parse(error._body).error;
        } else {
            this.searchError = null;
        }
    }
}