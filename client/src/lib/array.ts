export function moveItemInArray<T>(arr: T[], fromIdx: number, toIdx: number): T[] {
  if (fromIdx === toIdx) return arr;
  if (fromIdx < 0 || fromIdx >= arr.length) return arr;
  if (toIdx < 0 || toIdx >= arr.length) return arr;
  const next = [...arr];
  const [moved] = next.splice(fromIdx, 1);
  next.splice(toIdx, 0, moved);
  return next;
}