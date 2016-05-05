import 'rxjs/add/operator/map';
import {Injectable} from 'angular2/core';
import {Http, Response, Headers, URLSearchParams} from 'angular2/http';

// todo: get api key from backend

@Injectable()
export class JetradarService {
    constructor(private _http:Http) {
    }

    public getAirport(query:string) {
        const URL = 'http://www.jetradar.com/autocomplete/places';

        let headers = new Headers();

        let search = new URLSearchParams();
        search.set('q', query);

        return this._http
            .get(URL, {
                headers: headers,
                search: search
            })
            .map((res:Response) => res.json());
    }
}