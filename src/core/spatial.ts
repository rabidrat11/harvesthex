// Uniform grid for broad-phase queries over many moving circles (enemies).
// Rebuilt every simulation step; query results are written into a reusable
// array so the hot path does not allocate.

export interface HasPos {
  x: number;
  y: number;
  radius: number;
  active: boolean;
}

export class SpatialGrid<T extends HasPos> {
  private cells: T[][];
  private readonly cols: number;
  private readonly rows: number;
  private stamp = 0;
  private marks = new WeakMap<T, number>();

  constructor(public readonly width: number, public readonly height: number, public readonly cell = 32) {
    this.cols = Math.ceil(width / cell) + 1;
    this.rows = Math.ceil(height / cell) + 1;
    this.cells = Array.from({ length: this.cols * this.rows }, () => []);
  }

  clear(): void {
    for (const c of this.cells) c.length = 0;
  }

  private idx(cx: number, cy: number): number {
    return cy * this.cols + cx;
  }

  insert(o: T): void {
    const cx = Math.min(this.cols - 1, Math.max(0, Math.floor(o.x / this.cell)));
    const cy = Math.min(this.rows - 1, Math.max(0, Math.floor(o.y / this.cell)));
    this.cells[this.idx(cx, cy)].push(o);
  }

  /** Everything whose centre lies in cells overlapping the circle (x, y, r + maxRadius). */
  query(x: number, y: number, r: number, out: T[], maxRadius = 24): T[] {
    out.length = 0;
    const rr = r + maxRadius;
    const x0 = Math.max(0, Math.floor((x - rr) / this.cell));
    const y0 = Math.max(0, Math.floor((y - rr) / this.cell));
    const x1 = Math.min(this.cols - 1, Math.floor((x + rr) / this.cell));
    const y1 = Math.min(this.rows - 1, Math.floor((y + rr) / this.cell));
    for (let cy = y0; cy <= y1; cy++)
      for (let cx = x0; cx <= x1; cx++) {
        const c = this.cells[this.idx(cx, cy)];
        for (let i = 0; i < c.length; i++) if (c[i].active) out.push(c[i]);
      }
    return out;
  }

  /** Like query, but de-duplicates across calls within one stamp (for multi-circle sweeps). */
  beginStamp(): void {
    this.stamp++;
  }

  seen(o: T): boolean {
    if (this.marks.get(o) === this.stamp) return true;
    this.marks.set(o, this.stamp);
    return false;
  }

  /** Whether `seen` has marked this object in the current stamp, without marking it. */
  marked(o: T): boolean {
    return this.marks.get(o) === this.stamp;
  }
}
