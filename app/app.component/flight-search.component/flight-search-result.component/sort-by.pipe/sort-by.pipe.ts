import {Pipe, PipeTransform} from 'angular2/core';

@Pipe({
    name: 'sortBy',
    pure: false
})
export class SortPipe implements PipeTransform {
    public transform(tripOption:any, args:any[]):any {

        tripOption.sort((a, b) => {
            if (args[0] === 'price') return args[1] ? a.saleTotal.slice(3) - b.saleTotal.slice(3) : b.saleTotal.slice(3) - a.saleTotal.slice(3);
            if (args[0] === 'duration') return args[1] ? a.slice[0].duration - b.slice[0].duration : b.slice[0].duration - a.slice[0].duration;
        });

        return tripOption;
    }
}