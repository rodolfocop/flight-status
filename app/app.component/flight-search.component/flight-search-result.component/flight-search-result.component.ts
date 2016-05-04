import {Component, Input, OnInit, Pipe, PipeTransform} from 'angular2/core';
import {SortPipe} from "./sort-by.pipe/sort-by.pipe";

@Component({
    selector: 'flight-search-result',
    templateUrl: 'app/app.component/flight-search.component/flight-search-result.component/flight-search-result.component.html',
    styleUrls: ['app/app.component/flight-search.component/flight-search-result.component/flight-search-result.component.css'],
    pipes: [[SortPipe]]
})
export class FlightSearchResultComponent {
    @Input() result;
    @Input() error;

    public sortType:string = 'price';
    public sortOrder:boolean = true;

    public sortBy(type:string) {
        if (this.sortType === type)
            this.sortOrder = !this.sortOrder;
        else
            this.sortType = type;
    }

    public toDate(s:string) {
        return new Date(s);
    }

    parseData(origin:Array<any>, value:any) {
        return origin.find((elem) => elem.code === value).name;
    }
}