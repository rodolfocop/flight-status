import {Component, Input, Output, EventEmitter} from 'angular2/core';
import moment from 'moment';

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
    @Input('request') tripRequest:TripRequest;

    constructor(private _qpx:QpxService) {
    }

    public getOrigin() {
        return this.tripRequest.request.slice[0].origin;
    }

    public setOrigin(value:string) {
        this.tripRequest.request.slice[0].origin = value;
    }

    public getDestination() {
        return this.tripRequest.request.slice[0].destination;
    }

    public setDestination(value:string) {
        this.tripRequest.request.slice[0].destination = value;
    }

    public setDate(value:string) {
        this.tripRequest.request.slice[0].date = moment(value).format('YYYY-MM-DD');
    }

    public getSolutions() {
        return this.tripRequest.request.solutions;
    }

    public setSolutions(input:HTMLInputElement) {
        let solutions = parseInt(input.value, 10);
        if (solutions) {
            this.tripRequest.request.solutions = solutions;
        }
    }

    public search() {
        this.searchEmitter.emit(null);
        this._qpx
            .getTrip(this.tripRequest)
            .subscribe(
                (data) => {
                    this.searchEmitter.emit(data);
                },
                (error) => {
                    console.error(error);
                }
            );
    }

    public getCurrentDate() {
        return moment().format('YYYY-MM-DD');
    }
}