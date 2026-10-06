import * as Location from "expo-location";

function cancelled() {
  const error = new Error("Trip location request cancelled.");
  error.name = "AbortError";
  return error;
}

// Expo cannot cancel a position lookup; stop our wait and ignore its late result.
export function getTripPosition(signal: AbortSignal): Promise<Location.LocationObject> {
  return new Promise((resolve, reject) => {
    if (signal.aborted) { reject(cancelled()); return; }
    let settled = false;
    let timeout: ReturnType<typeof setTimeout>;
    const finish = (error?: unknown, position?: Location.LocationObject) => {
      if (settled) return;
      settled = true;
      clearTimeout(timeout);
      signal.removeEventListener("abort", abort);
      if (error !== undefined) reject(error);
      else resolve(position!);
    };
    const abort = () => finish(cancelled());
    signal.addEventListener("abort", abort, { once: true });
    timeout = setTimeout(() => finish(new Error("Could not get your location. Choose a starting place instead.")), 15000);
    Promise.resolve().then(() => {
      if (signal.aborted) throw cancelled();
      return Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
    }).then(position => finish(undefined, position), error => finish(error));
  });
}
