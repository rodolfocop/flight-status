import {Component, Input, Output, EventEmitter, ElementRef} from 'angular2/core';

@Component({
    selector: 'typeahead-container',
    templateUrl: 'app/app.component/flight-search.component/flight-search-form.component/typeahead.directive/typeahead.container.component/typeahead.container.component.html',
    styleUrls: ['app/app.component/flight-search.component/flight-search-form.component/typeahead.directive/typeahead.container.component/typeahead.container.component.css'],
    providers: []
})
export class TypeaheadContainerComponent {
    public selectOption:EventEmitter;
    public visible:boolean = false;

    @Input suggestions:any[];

    constructor() {}

    public show() {
        this.visible = true;
    }

    public hide() {
        this.visible = false;
    }

    public select(index:number) {
        this.selectOption.emit(this.suggestions[index]);
    }
}