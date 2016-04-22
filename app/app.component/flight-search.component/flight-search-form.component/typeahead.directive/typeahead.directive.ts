import {Directive, Input, EventEmitter, ElementRef, DynamicComponentLoader, ComponentRef, OnInit} from 'angular2/core';
import {TypeaheadContainerComponent} from './typeahead.container.component/typeahead.container.component';
import {Subject} from 'rxjs/Rx';
import {QpxService} from "../qpx.service/qpx.service";


@Directive({
    selector: 'input[typeahead]',
    directives: [ElementRef, DynamicComponentLoader, QpxService],
    host: {
        '(keyup)': 'onChange($event)'
    }
})
export class TypeaheadDirective implements OnInit {
    @Input('typeahead') getData:Function;
    public container:ComponentRef;

    constructor(private _el:ElementRef,
                private _loader:DynamicComponentLoader,
                private _qpx:QpxService) {
    }

    ngOnInit() {
        this._loader.loadNextToLocation(<any>TypeaheadContainerComponent, this._el)
            .then((compRef:ComponentRef) => {
                this.container = compRef;
                this.container.instance.selectOption.subscribe(
                    (data) => this.setCode(data),
                    (error) => console.error(error)
                );
            });
    }

    public onChange(event) {
        if (event.target.value) {
            this._qpx.getAirport(event.target.value)
                .subscribe(
                    (data) => {
                        this.container.instance.suggesiontsObservable.next(data.filter((v) => {
                            return v.name;
                        }));
                    },
                    (error) => {
                        console.log(error);
                    }
                )
        } else {
            this.container.instance.suggesiontsObservable.next([]);
        }
    }

    public setCode(data:any) {
        let event = document.createEvent('Event');
        event.initEvent('change', true, false);
        this._el.nativeElement.value = data.code;
        this._el.nativeElement.dispatchEvent(event);
    }
}
