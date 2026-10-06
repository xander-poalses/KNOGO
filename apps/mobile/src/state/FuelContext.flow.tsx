import { act, cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { emptyFuelPreferences, type FuelPreferences } from "@knogo/core";
import { FuelProvider, useFuel } from "./FuelContext";

const mocks = vi.hoisted(() => ({ read: vi.fn(), write: vi.fn() }));
vi.mock("../storage", () => ({ mobileStorage: { readFuelPreferences: mocks.read, writeFuelPreferences: mocks.write } }));
vi.mock("../fuelFeed", () => ({ fuelFeed: { load: vi.fn() } }));
const first: FuelPreferences = { consumptionLPer100Km: 7.5, grade: "petrol_95", region: "inland", priceOverrideZarPerLitre: 23 };
const second: FuelPreferences = { ...first, consumptionLPer100Km: 6.2, region: "coastal" };

function deferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (reason: Error) => void;
  const promise = new Promise<T>((yes, no) => { resolve = yes; reject = no; });
  return { promise, resolve, reject };
}
function Probe({ onSave }: { onSave: (promise: Promise<void>) => void }) {
  const { preferences, save } = useFuel();
  return <><output data-testid="preferences">{JSON.stringify(preferences)}</output>
    <button onClick={() => onSave(save(first))}>First</button>
    <button onClick={() => onSave(save(second))}>Second</button>
    <button onClick={() => onSave(save({ ...emptyFuelPreferences }))}>Clear</button>
  </>;
}
const displayed = () => JSON.parse(screen.getByTestId("preferences").textContent!);
beforeEach(() => {
  vi.resetAllMocks();
  mocks.read.mockResolvedValue({ ...emptyFuelPreferences });
  mocks.write.mockResolvedValue(undefined);
});
afterEach(cleanup);

describe("fuel preferences provider", () => {
  it("restores persisted settings without an account", async () => {
    mocks.read.mockResolvedValue(first);
    render(<FuelProvider><Probe onSave={() => {}}/></FuelProvider>);
    await waitFor(() => expect(displayed()).toEqual(first));
    expect(mocks.write).not.toHaveBeenCalled();
  });
  it("cannot replace a successful save with a delayed startup restore", async () => {
    const restore = deferred<FuelPreferences>();
    mocks.read.mockReturnValue(restore.promise);
    const saves: Promise<void>[] = [];
    render(<FuelProvider><Probe onSave={promise => saves.push(promise)}/></FuelProvider>);
    fireEvent.click(screen.getByText("Second"));
    await act(async () => { await saves[0]; });
    await act(async () => { restore.resolve(first); await restore.promise; });
    expect(displayed()).toEqual(second);
  });
  it("orders overlapping saves and clearing in both memory and storage", async () => {
    const pending = deferred<void>();
    mocks.write.mockReturnValueOnce(pending.promise);
    const saves: Promise<void>[] = [];
    render(<FuelProvider><Probe onSave={promise => saves.push(promise)}/></FuelProvider>);
    fireEvent.click(screen.getByText("First"));
    fireEvent.click(screen.getByText("Second"));
    fireEvent.click(screen.getByText("Clear"));
    await waitFor(() => expect(mocks.write).toHaveBeenCalledTimes(1));
    await act(async () => { pending.resolve(); for (const save of saves) await save; });
    expect(mocks.write.mock.calls.map(call => call[0])).toEqual([first, second, emptyFuelPreferences]);
    expect(displayed()).toEqual(emptyFuelPreferences);
  });
  it("retains stored settings after a failed write and allows the next save", async () => {
    mocks.read.mockResolvedValue(first);
    mocks.write.mockRejectedValueOnce(new Error("Storage full"));
    const saves: Promise<void>[] = [];
    render(<FuelProvider><Probe onSave={promise => { saves.push(promise); void promise.catch(() => undefined); }}/></FuelProvider>);
    await waitFor(() => expect(displayed()).toEqual(first));
    fireEvent.click(screen.getByText("Second"));
    await act(async () => { await expect(saves[0]).rejects.toThrow("Storage full"); });
    expect(displayed()).toEqual(first);
    fireEvent.click(screen.getByText("Clear"));
    await act(async () => { await saves[1]; });
    expect(displayed()).toEqual(emptyFuelPreferences);
  });
  it("recovers a failed restore without inventing fuel values", async () => {
    mocks.read.mockRejectedValue(new Error("Cannot read storage"));
    render(<FuelProvider><Probe onSave={() => {}}/></FuelProvider>);
    await act(async () => { await Promise.resolve(); });
    expect(displayed()).toEqual(emptyFuelPreferences);
  });
});
