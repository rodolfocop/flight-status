System.register(['angular2/core', './flight-search.component.html!text', './flight-search.component.css!text', '../qpx.service/qpx.service'], function(exports_1, context_1) {
    "use strict";
    var __moduleName = context_1 && context_1.id;
    var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
        var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
        if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
        else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
        return c > 3 && r && Object.defineProperty(target, key, r), r;
    };
    var __metadata = (this && this.__metadata) || function (k, v) {
        if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
    };
    var core_1, flight_search_component_html_text_1, flight_search_component_css_text_1, qpx_service_1;
    var FlightSearchComponent;
    return {
        setters:[
            function (core_1_1) {
                core_1 = core_1_1;
            },
            function (flight_search_component_html_text_1_1) {
                flight_search_component_html_text_1 = flight_search_component_html_text_1_1;
            },
            function (flight_search_component_css_text_1_1) {
                flight_search_component_css_text_1 = flight_search_component_css_text_1_1;
            },
            function (qpx_service_1_1) {
                qpx_service_1 = qpx_service_1_1;
            }],
        execute: function() {
            FlightSearchComponent = (function () {
                function FlightSearchComponent(_qpx) {
                    this._qpx = _qpx;
                    this.tripRequest = {
                        "request": {
                            "slice": [
                                {
                                    "origin": "IEV",
                                    "destination": "DME",
                                    "date": "2016-04-09"
                                }
                            ],
                            "passengers": {
                                "adultCount": 1,
                                "infantInLapCount": 0,
                                "infantInSeatCount": 0,
                                "childCount": 0,
                                "seniorCount": 0
                            },
                            "solutions": 1,
                            "refundable": false
                        }
                    };
                }
                FlightSearchComponent.prototype.search = function () {
                    var _this = this;
                    this._qpx
                        .getTrip(this.tripRequest)
                        .subscribe(function (data) {
                        _this.searchResults = data;
                    }, function (error) {
                        console.error(error);
                    }, function () {
                        console.log('Search complete');
                    });
                };
                FlightSearchComponent = __decorate([
                    core_1.Component({
                        selector: 'flight-search',
                        template: flight_search_component_html_text_1.default,
                        styles: [flight_search_component_css_text_1.default],
                        providers: [qpx_service_1.QpxService]
                    }), 
                    __metadata('design:paramtypes', [qpx_service_1.QpxService])
                ], FlightSearchComponent);
                return FlightSearchComponent;
            }());
            exports_1("FlightSearchComponent", FlightSearchComponent);
        }
    }
});
//# sourceMappingURL=flight-search.component.js.map