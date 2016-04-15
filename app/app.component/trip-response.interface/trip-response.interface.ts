export interface TripResponse {
    kind: string;
    trips: Trips;
}

interface Trips {
    kind: string;
    requestId: string;
    data: Data;
    tripOption: TripOption[];
}

interface Data {
    kind: string;
    airport: Airport[];
    city: City[];
    aircraft: Aircraft[];
    tax: Tax[];
    carrier: Carrier[];
}

interface Airport {
    kind: string;
    code: string;
    city: string;
    name: string;
}

interface City {
    kind: string;
    code: string;
    name: string;
}

interface Aircraft {
    kind: string;
    code: string;
    name: string;
}

interface Tax {
    kind: string;
    id: string;
    name?: string;
    chargeType?: string;
    code?: string;
    country?: string;
    salePrice?: string;
}

interface Carrier {
    kind: string;
    code: string;
    name: string;
}

interface TripOption {
    kind: string;
    saleTotal: string;
    id: string;
    slice: Slice[];
    pricing: Pricing[];
}

interface Slice {
    kind: string;
    duration: number;
    segment: Segment[];
}

interface Segment {
    kind: string;
    duration: number;
    flight: Flight;
    id: string;
    cabin: string;
    bookingCode: string;
    bookingCodeCount: number;
    marriedSegmentGroup: string;
    leg: Leg[];
}

interface Flight {
    carrier: string;
    number: string
}

interface Leg {
    kind: string;
    id: string;
    aircraft: string;
    arrivalTime: string;
    departureTime: string;
    origin: string;
    destination: string;
    duration: number;
    mileage: number;
    meal: string;
}

interface Pricing {
    kind: string;
    fare: Fare[];
    segmentPricing: SegmentPricing[];
    baseFareTotal: string;
    saleFareTotal: string;
    saleTaxTotal: string;
    saleTotal: string;
    passengers: Passengers;
    tax: Tax[];
    fareCalculation: string;
    latestTicketingTime: string;
    ptc: string;
}

interface Fare {
    kind: string;
    id: string;
    carrier: string;
    origin: string;
    destination: string;
    basisCode: string;
}

interface SegmentPricing {
    kind: string;
    fareId: string;
    segmentId: string;
}

interface Passengers {
    kind: string;
    adultCount: number;
}