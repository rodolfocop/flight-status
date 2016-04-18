import {Directive, Input, EventEmitter, ElementRef, DynamicComponentLoader, ComponentRef, OnInit, OnDestroy, ChangeDetectorRef} from 'angular2/core';

import {TypeaheadContainerComponent} from './typeahead.container.component/typeahead.container.component';

@Directive({
    selector: 'input[typeahead]',
    prividers: [ElementRef, DynamicComponentLoader],
    host: {
        '(keyup)': 'onChange($event)'
    }
})
export class TypeaheadDirective implements OnInit {
    private _nativeElement:HTMLInputElement;
    private _intervalId:number;
    private _componentReference;

    @Input('typeahead') getData:Function;

    public suggestions:any[];

    ngOnInit() {
        //noinspection TypeScriptValidateTypes
        this._loader.loadNextToLocation(TypeaheadContainerComponent, this._el)
            .then((compRef:ComponentRef) => {
                this._componentReference = compRef;
                this._intervalId = setInterval(() => {
                    compRef.instance.suggestions = this.suggestions;
                }, 100);

                compRef.instance.selectOption = new EventEmitter();
                compRef.instance.selectOption.subscribe((value:any) => {
                    this._nativeElement.value = value.code;
                    this._fireEvent(this._nativeElement, 'change');
                    compRef.instance.hide();
                });
            });
    }

    constructor(private _el:ElementRef,
                private _loader:DynamicComponentLoader) {
        this._nativeElement = _el.nativeElement;
    }

    public onChange(event) {
        this._componentReference.instance.show();
        this.getData(event.target.value)
            .subscribe(
                (data) => {
                    this.suggestions = data.filter((v) => {
                        return v.name;
                    })
                },
                (error) => {
                    console.log(error)
                }
            )
    }

    private _fireEvent(obj, evt) {
        if (document.createEvent) {
            var evObj = document.createEvent('MouseEvents');
            evObj.initEvent(evt, true, false);
            obj.dispatchEvent(evObj);
        }
    }

}
