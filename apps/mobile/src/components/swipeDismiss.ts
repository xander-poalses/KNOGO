export function shouldDismissSheet(distance: number, velocity: number, height: number): boolean {
  "worklet";
  return distance >= 0 && (distance > Math.min(140, height * 0.25) || (distance > 24 && velocity > 700));
}
