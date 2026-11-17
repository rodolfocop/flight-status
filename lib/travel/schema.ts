import { z } from 'zod';
const date = z.iso.date();
export const flightSchema = z.object({
  origin: z.string().trim().toUpperCase().regex(/^[A-Z]{3}$/),
  destination: z.string().trim().toUpperCase().regex(/^[A-Z]{3}$/),
  destinationName: z.string().trim().min(2).max(100),
  departureDate: date,
  returnDate: date.nullable().optional(),
  passengers: z.coerce.number().int().min(1).max(9),
  maxPrice: z.coerce.number().positive().max(1000000).nullable().optional(),
  maxStops: z.coerce.number().int().min(0).max(3).nullable().optional(),
}).refine(x => x.origin !== x.destination, { message: 'Origem e destino devem ser diferentes.' })
  .refine(x => !x.returnDate || x.returnDate >= x.departureDate, { message: 'A volta não pode ser anterior à ida.' });
export const saveSchema = flightSchema.safeExtend({ monitorUntil: date }).refine(x => x.monitorUntil <= x.departureDate, { message: 'O monitoramento deve terminar até a data de ida.' });
export const staySchema = z.object({
  destination: z.string().trim().min(2).max(100),
  checkin: date,
  checkout: date,
  adults: z.coerce.number().int().min(1).max(9),
}).refine(x => x.checkout > x.checkin, { message: 'A saída deve ocorrer depois da entrada.' });
export type FlightQuery = z.infer<typeof flightSchema>;
export type StayQuery = z.infer<typeof staySchema>;
export type Layover = { airport: string; durationSeconds: number | null };
export type FlightOffer = { airline: string; price: number | null; currency: string; duration: string; stops: number | null; departure: string; arrival: string; returnDeparture?: string; returnArrival?: string; returnAirline?: string; returnDuration?: string; outboundStops?: number | null; returnStops?: number | null; outboundLayovers?: Layover[]; returnLayovers?: Layover[]; link: string | null };
export type StayOffer = { name: string; total: number | null; nightly: number | null; currency: string; rating: number | null; reviews: number | null; nights: number | null; imageUrl?: string | null; beds?: number | null; bedrooms?: number | null; baths?: number | null; link: string | null };
