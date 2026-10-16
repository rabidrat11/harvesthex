import { describe, expect, it } from 'vitest';
import { SFX, renderSfx } from '../../src/audio/synth';

describe('procedural sound', () => {
  for (const id of Object.keys(SFX)) {
    it(`${id} renders cleanly`, () => {
      const data = renderSfx(id, 48000)!;
      expect(data.length).toBeGreaterThan(100);
      let peak = 0;
      let sum = 0;
      for (const v of data) {
        expect(Number.isFinite(v)).toBe(true);
        peak = Math.max(peak, Math.abs(v));
        sum += v * v;
      }
      const rms = Math.sqrt(sum / data.length);
      // Audible, but never a wall of noise.
      expect(peak).toBeGreaterThan(0.01);
      expect(peak).toBeLessThanOrEqual(0.851);
      expect(rms).toBeLessThan(0.45);
      // Short sounds stay short: nothing loops forever by accident.
      expect(data.length / 48000).toBeLessThan(2.6);
    });
  }
});
