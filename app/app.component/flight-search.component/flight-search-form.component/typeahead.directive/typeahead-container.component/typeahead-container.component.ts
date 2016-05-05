import {Component, EventEmitter} from 'angular2/core';

@Component({
    selector: 'typeahead-container',
    template: require('./typeahead-container.component.html'),
    styles: [require('./typeahead-container.component.less')]
})
export class TypeaheadContainerComponent {
    public results:any;
    public select:EventEmitter<any> = new EventEmitter();
}