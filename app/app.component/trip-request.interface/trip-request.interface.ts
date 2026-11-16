export interface TripRequest {
    request:Request;
}

interface Request {
    slice:Slice[];
    passengers:Passengers;
    solutions:number;
    refundable:boolean;
}

interface Slice {
    origin:string;
    destination:string;
    date:string;
}

interface Passengers {
    adultCount:number;
    infantInLapCount:number;
    infantInSeatCount:number;
    childCount:number;
    seniorCount:number;
}