import {Directive, Input, Output, ElementRef, DynamicComponentLoader, ComponentRef, OnInit, ContentChild} from 'angular2/core';
import {TypeaheadContainerComponent} from './typeahead-container.component/typeahead-container.component';
import {JetradarService} from "../jetradar.service/jetradar.service";
import {FlightSearchFormComponent} from "../flight-search-form.component";
import {EventEmitter} from "angular2/core";
import {NgControlName} from "angular2/common";

@Directive({
    selector: 'input[typeahead]',
    host: {
        '(keyup)': 'search()',
        '(click)': 'cleanModel()'
    },
    providers: [JetradarService]
})
export class TypeaheadDirective implements OnInit {
    public container:ComponentRef;

    @Output('ngModelChange') changeModel:EventEmitter<any> = new EventEmitter();
    @Input('typeahead') input:NgControlName;

    constructor(private _el:ElementRef,
                private _loader:DynamicComponentLoader,
                private _jetradar:JetradarService) {
    }

    ngOnInit() {
        this._loader.loadNextToLocation(TypeaheadContainerComponent, this._el)
            .then((compRef:ComponentRef) => {
                this.container = compRef;
                this.container.instance.select.subscribe(
                    (data) => this.setCode(data),
                    (error) => console.error(error)
                )
            });

        console.log(this.input);
    }

    public setCode(data:any) {
        this.changeModel.emit(data.code);
        this.cleanResults()
    }

    public search() {
        let value = this._el.nativeElement.value;
        if (value) {
            this._jetradar.getAirport(value)
                .subscribe(
                    (data) => this.container.instance.results = data.filter(v => v.name),
                    (error) => console.error(error)
                )
        } else {
            this.cleanResults();
        }
    }

    public cleanModel() {
        this.changeModel.emit('');
    }

    public cleanResults() {
        this.container.instance.results = []
    }
}