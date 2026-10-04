import type { Tone } from '@/components/controls/Controls';

export interface VerdictResult {
  text: string;
  tone: Tone;
}

export type VerdictRule = (value: number | null, predictive: number | null) => VerdictResult;

const waiting: VerdictResult = { text: 'No Data', tone: 'aqua' };

/** Compared with the expected (predictive) value — the designs' "Above/Below Average". */
export const vsAverage =
  (tolerance = 0.04, higherIsBad = false): VerdictRule =>
  (v, p) => {
    if (v === null) return waiting;
    if (!p) return { text: 'Good', tone: 'good' };
    const d = (v - p) / Math.abs(p);
    if (d > tolerance) return { text: 'Above Average', tone: higherIsBad ? 'bad' : 'warn' };
    if (d < -tolerance) return { text: 'Below Average', tone: higherIsBad ? 'warn' : 'bad' };
    return { text: 'Good', tone: 'good' };
  };

/** Threshold bands, checked in order: first band whose `max` is ≥ value wins. */
export const bands =
  (list: { max: number; text: string; tone: Tone }[]): VerdictRule =>
  (v) => {
    if (v === null) return waiting;
    return list.find((b) => v <= b.max) ?? list[list.length - 1];
  };

export const loadVerdict = bands([
  { max: 85, text: 'Good', tone: 'good' },
  { max: 95, text: 'High Load', tone: 'warn' },
  { max: Infinity, text: 'Overloaded', tone: 'bad' },
]);
