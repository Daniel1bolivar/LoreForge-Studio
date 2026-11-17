import type { DiceRollRecord } from '../types';

export interface DiceParse {
  ok: boolean;
  record?: DiceRollRecord;
  error?: string;
}

const TERM_RE = /([+-]?)\s*(\d*)d(\d+)|([+-]?)\s*(\d+)/gi;

function rollDie(sides: number): number {
  if (typeof crypto !== 'undefined' && crypto.getRandomValues) {
    const buf = new Uint32Array(1);
    crypto.getRandomValues(buf);
    return (buf[0] % sides) + 1;
  }
  return Math.floor(Math.random() * sides) + 1;
}

/** Parses NdS+M expressions such as 1d20+5, 2d6, 2d6+1d4-1. */
export function rollExpression(expression: string, label?: string): DiceParse {
  const expr = expression.replace(/\s+/g, '').toLowerCase();
  if (!expr || !/^[+-]?(\d*d\d+|\d+)([+-](\d*d\d+|\d+))*$/.test(expr)) {
    return { ok: false, error: 'dice.invalid' };
  }
  const rolls: number[] = [];
  let modifier = 0;
  let total = 0;
  let diceCount = 0;
  TERM_RE.lastIndex = 0;
  let m: RegExpExecArray | null;
  while ((m = TERM_RE.exec(expr)) !== null) {
    if (m[3] !== undefined) {
      const sign = m[1] === '-' ? -1 : 1;
      const count = m[2] ? parseInt(m[2], 10) : 1;
      const sides = parseInt(m[3], 10);
      diceCount += count;
      if (count < 1 || count > 100 || sides < 2 || sides > 1000 || diceCount > 200) {
        return { ok: false, error: 'dice.limit' };
      }
      for (let i = 0; i < count; i += 1) {
        const r = rollDie(sides);
        rolls.push(sign * r);
        total += sign * r;
      }
    } else if (m[5] !== undefined) {
      const sign = m[4] === '-' ? -1 : 1;
      const val = sign * parseInt(m[5], 10);
      modifier += val;
      total += val;
    }
  }
  return {
    ok: true,
    record: {
      id: 'roll_' + Math.random().toString(36).slice(2, 9),
      expression: expr,
      rolls,
      modifier,
      total,
      label,
      timestamp: new Date().toISOString(),
    },
  };
}
