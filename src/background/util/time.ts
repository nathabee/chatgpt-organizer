//src/background/util/time.ts


export function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

export function randInt(min: number, max: number): number {
  return Math.floor(min + Math.random() * (max - min + 1));
}

export function nowMs(): number {
  return Date.now();
}
