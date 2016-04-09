System.register(['rxjs/add/operator/map', 'angular2/core', 'angular2/http'], function(exports_1, context_1) {
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
    var core_1, http_1;
    var APIKEY, QpxService;
    return {
        setters:[
            function (_1) {},
            function (core_1_1) {
                core_1 = core_1_1;
            },
            function (http_1_1) {
                http_1 = http_1_1;
            }],
        execute: function() {
            APIKEY = 'AIzaSyCgILgw9s6w_9zPNTTyXN1w6x_9zKsrFEU';
            QpxService = (function () {
                function QpxService(_http) {
                    this._http = _http;
                }
                QpxService.prototype.getTrip = function (tripRequest) {
                    var url = 'https://www.googleapis.com/qpxExpress/v1/trips/search';
                    var body = JSON.stringify(tripRequest);
                    var headers = new http_1.Headers();
                    headers.set('Content-Type', 'application/json; charset=utf-8');
                    var search = new http_1.URLSearchParams();
                    search.set('key', APIKEY);
                    return this._http
                        .post(url, '', {
                        headers: headers,
                        search: search,
                        body: body,
                    })
                        .map(function (res) { return res.json(); });
                };
                QpxService = __decorate([
                    core_1.Injectable(), 
                    __metadata('design:paramtypes', [http_1.Http])
                ], QpxService);
                return QpxService;
            }());
            exports_1("QpxService", QpxService);
        }
    }
});
//# sourceMappingURL=qpx.service.js.map