import {Component, Input} from 'angular2/core';
import {SortPipe} from "./sort-by.pipe/sort-by.pipe";

@Component({
    selector: 'flight-search-result',
    template: require('./flight-search-result.component.html'),
    styles: [require('./flight-search-result.component.less')],
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

    public parse(origin:Array<any>, value:any) {
        return origin.find((elem) => elem.code === value).name;
    }
}