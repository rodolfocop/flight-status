import {Component, Input, Output, EventEmitter, OnInit} from 'angular2/core';

import {FlightSearchResultComponent} from "../flight-search-result.component/flight-search-result.component";
import {QpxService} from "./qpx.service/qpx.service";
import {TripRequest} from "../../trip-request.interface/trip-request.interface";
import {TripResponse} from "../../trip-response.interface/trip-response.interface";


@Component({
    selector: 'flight-search-form',
    templateUrl: 'app/app.component/flight-search.component/flight-search-form.component/flight-search-form.component.html',
    styleUrls: ['app/app.component/flight-search.component/flight-search-form.component/flight-search-form.component.css'],
    directives: [[FlightSearchResultComponent]],
    providers: [QpxService]
})
export class FlightSearchFormComponent {
    @Output('search') searchEmitter:EventEmitter<TripResponse> = new EventEmitter();
    @Output('error') errorEmitter:EventEmitter<any> = new EventEmitter();
    @Input('request') tripRequest:TripRequest;

    constructor(private _qpx:QpxService) {
    }

    public search() {
        this.errorEmitter.emit(null);
        this.searchEmitter.emit(null);
        this._qpx
            .getTrip(this.tripRequest)
            .subscribe(
                (data) => {
                    this.searchEmitter.emit(data);
                    this.errorEmitter.emit(null);
                },
                (error) => {
                    this.errorEmitter.emit(error);
                    this.searchEmitter.emit(null);
                }
            );
    }
}