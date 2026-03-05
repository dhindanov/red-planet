import { type Shift } from "@prisma/client";
import { PaginatedResponse } from "../modules/shared/shared.types";

export const API_URL = process.env.BASE_URL ?? "http://localhost:3000";

/**
 * Paginates all results from an endpoint and accumulates them into an array
 * @param url url to pull from
 * @returns Array of endpoint responses
 */
export const fetchAll = async <T>(url: string): Promise<T[]> => {
  let results: T[] = [];
  let nextUrl: string | undefined = url;
  try {
    while (!!nextUrl) {
      const response = await fetch(nextUrl);
      const res: PaginatedResponse<T> = await response.json();
      results = results.concat(res.data);
      nextUrl = res.links.next;
    }
    return results;
  } catch (error: unknown) {
    console.error("Error:", error);
    process.exit(1);
  }
}

/**
 * Determine if a shift is completed based on cancellation and end time
 * @param shift
 * @returns true if shift is completed
 */
export function isCompleted(shift: Shift): boolean {
  // Assume that as shift is completed unless cancelledAt is set, or endAt is not set
  if (shift.cancelledAt !== null) return false;
  if (!shift.endAt) return false;
  return true;
}

/**
 * Fetch an entire universe of shifts
 * @returns Shift[] unfiltered
 */
export const allShifts = async (): Promise<Shift[]> => {
  const topurl: string = `${API_URL}/shifts`;
  const shifts: Shift[] = await fetchAll(topurl);
  return shifts;
}

/**
 * Group a map's values based on what a property extractor returns
 * @param map
 * @param propGet function that extracts a number from a value in the map
 * @returns
 */
export const groupBy = <K, V>(map: Map<K, V>, propGet: (v: any) => number): Map<number, V[]> => {
  const grouped = new Map<number, V[]>();
  for (const [k, v] of map.entries()) {
    const n = propGet(v);
    if (grouped.has(n)) {
      grouped.get(n)!.push(v);
    } else {
      grouped.set(n, [v]);
    }
  }
  return grouped;
}
