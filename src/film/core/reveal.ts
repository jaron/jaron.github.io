// Shared by the bridge and the cold open: text that fades in a clause at a time. A clause ends at . ! ? , ; : or …;
// every word of a clause shares one time, and the next clause waits `perWord` seconds for each word of the one before
// it (but never less than `minGap`). Pure, so data files and checkers can use it too.
export const CLAUSE_FADE = 0.7;      // seconds a clause takes to fade in

export function clauseTimes(text: string, from: number, perWord: number, minGap: number): number[] {
  const words = text.split(' ');
  const times: number[] = [];
  let t = from, n = 0;
  words.forEach((w, k) => {
    n++;
    if (k === words.length - 1 || /[.!?,;:…][”"]?$/.test(w)) {
      for (let j = 0; j < n; j++) times.push(t);
      t += Math.max(minGap, n * perWord);
      n = 0;
    }
  });
  return times;
}
