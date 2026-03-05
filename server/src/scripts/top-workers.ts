import { type Worker, type Shift } from "@prisma/client";
import { WorkerStatus } from "../modules/workers/workers.schemas";
import { API_URL, allShifts, fetchAll, groupBy, isCompleted } from "./helper";

interface WorkerReport {
  name: string;
  shifts: number;
};

interface WorkerWithShifts extends Worker {
  shifts: number;
}

const NOUT = 3;

/**
 * Fetch a list of all active workers with counts of completed shifts, return top 3.
 * Limitations:
 * - has to go throgh the web api.
 * - api does not support fetching related objects.
*/
const topWorkers = async () => {
  // Only keep active workers
  let workers: WorkerWithShifts[] = await allWorkers() as WorkerWithShifts[];
  workers = workers.filter(v => v.status === WorkerStatus.ACTIVE);
  // Map by unique worker id
  const workersById = workers.reduce((map, w) => map.set(w.id, w), new Map<number, WorkerWithShifts>());

  // Get all shifts as an Array
  let shifts: Shift[] = await allShifts();
  // Count shifts for all workers
  for (const shift of shifts) {
    if (shift.workerId === null) continue;
    if (!workersById.has(shift.workerId)) continue;
    if (!isCompleted(shift)) continue;
    const worker = workersById.get(shift.workerId)!;
    worker.shifts = (worker.shifts || 0) + 1;
  }

  // Group workers by number of completed shifts
  const grouped: Map<number, WorkerWithShifts[]> = groupBy<number, WorkerWithShifts>(workersById, v => v.shifts || 0);
  const topTied: [number, WorkerWithShifts[]][] = [...grouped];
  // Place groups with highest counts first
  topTied.sort((a, b) => b[0] - a[0]);

  // Extract enough items to return NOUT of them, keep all ties
  const results = topSlice(topTied);
  console.log(results);
}

/**
 * Fetch all workers as an Array, unfiltered
 * @returns Worker[]
 */
const allWorkers = async (): Promise<Worker[]> => {
  const topurl: string = `${API_URL}/workers`;
  const workers: Worker[] = await fetchAll<Worker>(topurl);
  return workers;
}

/**
 * Return at least top NOUT items.
 * Skip items without counts.
 * If there are ties, return all tied items.
 * @param grouped
 * @returns
 */
const topSlice = (grouped: [number, WorkerWithShifts[]][]): WorkerReport[] => {
  let out: WorkerReport[] = [];
  for (const [count, a] of grouped) {
    if (!count) continue;  // omit those without completed shifts (not in requirements)
    for (const worker of a) out.push({ name: worker.name, shifts: count } as WorkerReport);
    // Output at least NOUT items, including any ties
    if (out.length >= NOUT) break;
  }
  return out;
}

topWorkers();
