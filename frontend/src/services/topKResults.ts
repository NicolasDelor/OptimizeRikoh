import type { OptimizableStat } from "../types/MonsterConfig";
import type { OptimizationResult } from "../types/OptimizationResult";

export function compareOptimizationResults(
  a: OptimizationResult,
  b: OptimizationResult,
  focus: readonly OptimizableStat[]
): number {
  const effectiveFocus: readonly OptimizableStat[] =
    focus.length > 0 ? focus : ["spd"];

  for (const stat of effectiveFocus) {
    const aValue = a[stat];
    const bValue = b[stat];

    if (aValue !== bValue) {
      return bValue - aValue;
    }
  }

  if (a.score !== b.score) {
    return b.score - a.score;
  }

  for (let index = 0; index < 6; index++) {
    const aRuneId = a.runeIds[index] ?? 0;
    const bRuneId = b.runeIds[index] ?? 0;

    if (aRuneId !== bRuneId) {
      return aRuneId - bRuneId;
    }
  }

  return 0;
}

export class TopKResults {
  private readonly heap: OptimizationResult[] = [];
  private readonly limit: number;
  private readonly focus: readonly OptimizableStat[];

  constructor(
    limit: number,
    focus: readonly OptimizableStat[]
  ) {
    this.limit = limit;
    this.focus = focus;
  }

  add(result: OptimizationResult): boolean {
    if (this.limit <= 0) {
      return false;
    }

    if (this.heap.length < this.limit) {
      this.heap.push(result);
      this.siftUp(this.heap.length - 1);
      return true;
    }

    const currentWorst = this.heap[0];

    if (
      compareOptimizationResults(
        result,
        currentWorst,
        this.focus
      ) >= 0
    ) {
      return false;
    }

    this.heap[0] = result;
    this.siftDown(0);

    return true;
  }

  toSortedArray(): OptimizationResult[] {
    return [...this.heap].sort((a, b) =>
      compareOptimizationResults(a, b, this.focus)
    );
  }

  clear(): void {
    this.heap.length = 0;
  }

  private isWorse(
    a: OptimizationResult,
    b: OptimizationResult
  ): boolean {
    return compareOptimizationResults(a, b, this.focus) > 0;
  }

  private siftUp(startIndex: number): void {
    let index = startIndex;

    while (index > 0) {
      const parentIndex = Math.floor((index - 1) / 2);

      if (!this.isWorse(this.heap[index], this.heap[parentIndex])) {
        break;
      }

      this.swap(index, parentIndex);
      index = parentIndex;
    }
  }

  private siftDown(startIndex: number): void {
    let index = startIndex;

    while (true) {
      const leftIndex = index * 2 + 1;
      const rightIndex = leftIndex + 1;
      let worstIndex = index;

      if (
        leftIndex < this.heap.length &&
        this.isWorse(this.heap[leftIndex], this.heap[worstIndex])
      ) {
        worstIndex = leftIndex;
      }

      if (
        rightIndex < this.heap.length &&
        this.isWorse(this.heap[rightIndex], this.heap[worstIndex])
      ) {
        worstIndex = rightIndex;
      }

      if (worstIndex === index) {
        return;
      }

      this.swap(index, worstIndex);
      index = worstIndex;
    }
  }

  private swap(indexA: number, indexB: number): void {
    const temporary = this.heap[indexA];

    this.heap[indexA] = this.heap[indexB];
    this.heap[indexB] = temporary;
  }
}