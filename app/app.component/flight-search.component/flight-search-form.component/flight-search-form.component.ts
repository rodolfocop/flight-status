import {Component, Input, Output, EventEmitter} from 'angular2/core';
import moment from 'moment';

import flightSearchFormComponentTemplate from './flight-search-form.component.html!text';
import flightSearchFormComponentStyle from './flight-search-form.component.css!text'
import {FlightSearchResultComponent} from "../flight-search-result.component/flight-search-result.component";
import {QpxService} from "./qpx.service/qpx.service";
import {TripRequest} from "../../trip-request.interface/trip-request.interface";


@Component({
    selector: 'flight-search-form',
    template: flightSearchFormComponentTemplate,
    styles: [flightSearchFormComponentStyle],
    directives: [
        [FlightSearchResultComponent]
    ],
    providers: [QpxService]
})
export class FlightSearchFormComponent {
    constructor(private _qpx:QpxService) {
    }

    @Output('search') searchEmitter:EventEmitter = new EventEmitter();
    @Input('request') tripRequest:TripRequest;

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

    public getCurrentDate() {
        return moment().format('YYYY-MM-DD');
    }

    public setDate(value:string) {
        this.tripRequest.request.slice[0].date = moment(value).format('YYYY-MM-DD');
    }

    public getSolutions() {
        return this.tripRequest.request.solutions;
    }

    public setSolutions(input:HTMLInputElement) {
        // todo: use validation message instead of this bullshit
        let solutions = parseInt(input.value, 10);
        if (solutions) {
            this.tripRequest.request.solutions = solutions;
        } else {
            input.value = this.tripRequest.request.solutions.toString();

            alert('Solutions count should be a number');
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
}