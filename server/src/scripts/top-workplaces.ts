import { type Workplace, type Shift } from "@prisma/client";
import { WorkplaceStatus } from "../modules/workplaces/workplaces.schemas";
import { API_URL, allShifts, fetchAll, groupBy, isCompleted } from "./helper";

interface WorkplaceReport {
  name: string;
  shifts: number;
}

interface WorkplaceWithShifts extends Workplace {
  shifts: number;
}

const NOUT = 3;

/**
 * Fetch a list of all active workplaces with counts of completed shifts, return top NOUT;
 * Limitations:
 * - has to go throgh the web api.
 * - can't include shifts in workplaces lookup, api does not support.
*/
const topWorkplaces = async () => {
  // Only keep active workplaces
  let workplaces: WorkplaceWithShifts[] = await allWorkplaces() as WorkplaceWithShifts[];
  workplaces = workplaces.filter(v => v.status === WorkplaceStatus.ACTIVE);
  // Map by unique workplace id
  const workplacesById = workplaces.reduce((map, w) => map.set(w.id, w), new Map<number, WorkplaceWithShifts>());

  // Get all shifts as an Array
  let shifts: Shift[] = await allShifts();
  // Count shifts for all workplaces
  for (const shift of shifts) {
    if (!workplacesById.has(shift.workplaceId)) continue;
    if (!isCompleted(shift)) continue;
    const workplace = workplacesById.get(shift.workplaceId)!;
    workplace.shifts = (workplace.shifts || 0) + 1;
  }

  // Group workplaces by number of completed shifts
  const grouped: Map<number, WorkplaceWithShifts[]> = groupBy<number, WorkplaceWithShifts>(workplacesById, v => v.shifts || 0);
  const topTied: [number, WorkplaceWithShifts[]][] = [...grouped];
  // Place groups with highest counts first
  topTied.sort((a, b) => b[0] - a[0]);

  // Extract enough items to return NOUT of them, keep all ties
  const results = topSlice(topTied);
  console.log(results);
}

/**
 * Fetch all workplaces as an Array, unfiltered
 * @returns Workplace[]
 */
const allWorkplaces = async (): Promise<Workplace[]> => {
  const topurl: string = `${API_URL}/workplaces`;
  const workplaces: Workplace[] = await fetchAll<Workplace>(topurl);
  return workplaces;
}

/**
 * Return at least top NOUT items.
 * Skip items without counts.
 * If there are ties, return all tied items.
 * @param grouped
 * @returns
 */
const topSlice = (grouped: [number, WorkplaceWithShifts[]][]): WorkplaceReport[] => {
  let out: WorkplaceReport[] = [];
  for (const [count, a] of grouped) {
    if (!count) continue;  // omit those without completed shifts (not in requirements)
    for (const worker of a) out.push({ name: worker.name, shifts: count } as WorkplaceReport);
    // Output at least NOUT items, including any ties
    if (out.length >= NOUT) break;
  }
  return out;
}

topWorkplaces();
