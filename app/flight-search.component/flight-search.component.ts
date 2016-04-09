import {Component, Input, Output} from 'angular2/core';
import {EventEmitter} from "angular2/src/facade/async";

import flightSearchComponentTemplate from './flight-search.component.html!text';
import flightSearchComponentStyle from './flight-search.component.css!text'

import {QpxService} from '../qpx.service/qpx.service';
import {TripRequest} from "../trip-request.interface/trip-request.interface";

@Component({
    selector: 'flight-search',
    template: flightSearchComponentTemplate,
    styles: [flightSearchComponentStyle],
    providers: [QpxService]
})
export class FlightSearchComponent {
    constructor(private _qpx:QpxService) {
    }

    public searchResults:string;
    public tripRequest:TripRequest = {
        "request": {
            "slice": [
                {
                    "origin": "IEV",
                    "destination": "DME",
                    "date": "2016-04-09"
                }
            ],
            "passengers": {
                "adultCount": 1,
                "infantInLapCount": 0,
                "infantInSeatCount": 0,
                "childCount": 0,
                "seniorCount": 0
            },
            "solutions": 1,
            "refundable": false
        }
    };

    public search() {
        this._qpx
            .getTrip(this.tripRequest)
            .subscribe(
                (data) => {
                    this.searchResults = data;
                    console.log(data);
                },
                (error) => {
                    console.error(error);
                },
                () => {
                    console.log('Search complete');
                }
            );
    }
}