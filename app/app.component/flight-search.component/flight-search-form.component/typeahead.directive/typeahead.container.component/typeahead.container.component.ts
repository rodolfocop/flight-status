import {Component, Input, Output, EventEmitter, ElementRef, OnInit} from 'angular2/core';
import {Subject} from 'rxjs/Rx';

@Component({
    selector: 'typeahead-container',
    templateUrl: 'app/app.component/flight-search.component/flight-search-form.component/typeahead.directive/typeahead.container.component/typeahead.container.component.html',
    styleUrls: ['app/app.component/flight-search.component/flight-search-form.component/typeahead.directive/typeahead.container.component/typeahead.container.component.css'],
    providers: []
})
export class TypeaheadContainerComponent implements OnInit{
    @Output selectOption:EventEmitter = new EventEmitter();
    public suggestions:any[];
    public suggesiontsObservable:Subject = new Subject();
    public visible:boolean = true;

    ngOnInit () {
        this.suggesiontsObservable.subscribe(
            (data) => {this.suggestions = data},
            (error) => {console.error(error)}
        )
    }

    public select(index:number) {
        this.selectOption.emit(this.suggestions[index]);
        this.suggestions = [];
    }
}