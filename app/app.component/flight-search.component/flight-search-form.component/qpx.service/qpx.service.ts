import 'rxjs/add/operator/map';
import {Injectable} from 'angular2/core';
import {Http, Response, Headers, URLSearchParams} from 'angular2/http';
import {TripRequest} from "../../../trip-request.interface/trip-request.interface";

// todo: get api key from backend

@Injectable()
export class QpxService {
    constructor(private _http:Http) {
    }

    public getTrip(tripRequest:TripRequest) {
        const API_KEY = 'AIzaSyCgILgw9s6w_9zPNTTyXN1w6x_9zKsrFEU';
        const URL = 'https://www.googleapis.com/qpxExpress/v1/trips/search';

        let body = JSON.stringify(tripRequest);

        let headers = new Headers();
        headers.set('Content-Type', 'application/json; charset=utf-8');

        let search = new URLSearchParams();
        search.set('key', API_KEY);

        return this._http
            .post(URL, '', {
                headers: headers,
                search: search,
                body: body,
            })
            .map((res:Response) => res.json());
    }

    public getAirport(query:string) {
        const URL = 'http://www.jetradar.com/autocomplete/places';

        let search = new URLSearchParams();
        search.set('with_countries', 'true');
        search.set('q', query);

        return this._http
            .get(URL, {
                search: search
            })
            .map((res:Response) => res.json());
    }
}