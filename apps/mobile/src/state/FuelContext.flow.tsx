// Imports
import { act, cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { emptyFuelPreferences, type FuelPreferences } from "@knogo/core";
import { FuelProvider, useFuel } from "./FuelContext";
import { fuelFeed } from "../fuelFeed";

// State and Helpers
const mocks = vi.hoisted(() => ({ read: vi.fn(), write: vi.fn(), listener:null as ((state:string)=>void)|null }));
vi.mock("../storage", () => ({ mobileStorage: { readFuelPreferences: mocks.read, writeFuelPreferences: mocks.write } }));
vi.mock("../fuelFeed", () => ({ fuelFeed: { load: vi.fn(), poll: vi.fn() } }));
vi.mock("react-native", () => ({AppState:{currentState:'active',addEventListener:(_event:string,listener:(state:string)=>void)=>{mocks.listener=listener;return {remove:()=>{mocks.listener=null;}};}}}));
const first: FuelPreferences = { consumptionLPer100Km: 7.5, grade: "petrol_95", region: "inland", priceOverrideZarPerLitre: 23 };
const second: FuelPreferences = { ...first, consumptionLPer100Km: 6.2, region: "coastal" };

// Functions
function deferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (reason: Error) => void;
  const promise = new Promise<T>((yes, no) => { resolve = yes; reject = no; });
  return { promise, resolve, reject };
}
// Components
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
  vi.mocked(fuelFeed.load).mockResolvedValue({source:'none',cache:null,error:null,updateState:'idle'});
});
afterEach(() => {cleanup();vi.useRealTimers();});

// Tests
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

function PriceProbe() {
 const {prices,pricesLoading,watchPrices}=useFuel();
 React.useEffect(()=>watchPrices(),[watchPrices]);
 return <output data-testid="price-state">{pricesLoading?'loading':prices?.updateState}</output>;
}
import * as React from 'react';
describe('background fuel prices',()=>{
 it('starts without an account, polls pending work and stops on completion',async()=>{
  vi.useFakeTimers();
  vi.mocked(fuelFeed.load).mockResolvedValue({source:'none',cache:null,error:null,updateState:'pending'});
  vi.mocked(fuelFeed.poll).mockResolvedValue({source:'none',cache:null,error:null,updateState:'idle'});
  const view=render(<FuelProvider><PriceProbe/></FuelProvider>);
  await act(async()=>{await Promise.resolve();});
  expect(fuelFeed.load).toHaveBeenCalledOnce();
  expect(screen.getByTestId('price-state').textContent).toBe('loading');
  await act(async()=>{await vi.advanceTimersByTimeAsync(5000);});
  expect(fuelFeed.poll).toHaveBeenCalledOnce();
  expect(screen.getByTestId('price-state').textContent).toBe('idle');
  await act(async()=>{await vi.advanceTimersByTimeAsync(10000);});
  expect(fuelFeed.poll).toHaveBeenCalledOnce();view.unmount();vi.useRealTimers();
 });
 it('stops polling when its consumer unmounts and times out pending work',async()=>{
  vi.useFakeTimers();
  vi.mocked(fuelFeed.load).mockResolvedValue({source:'none',cache:null,error:null,updateState:'pending'});
  vi.mocked(fuelFeed.poll).mockResolvedValue({source:'none',cache:null,error:null,updateState:'pending'});
  const view=render(<FuelProvider><PriceProbe/></FuelProvider>);
  await act(async()=>{await Promise.resolve();});
  await act(async()=>{await vi.advanceTimersByTimeAsync(91000);});
  expect(screen.getByTestId('price-state').textContent).toBe('failed');
  const calls=vi.mocked(fuelFeed.poll).mock.calls.length;
  view.unmount();await act(async()=>{await vi.advanceTimersByTimeAsync(10000);});
  expect(fuelFeed.poll).toHaveBeenCalledTimes(calls);vi.useRealTimers();
 });
 it('clears loading after a rejected startup request',async()=>{
  vi.mocked(fuelFeed.load).mockRejectedValue(new Error('offline'));
  render(<FuelProvider><PriceProbe/></FuelProvider>);
  await waitFor(()=>expect(screen.getByTestId('price-state').textContent).toBe('failed'));
 });
 it('stops in background and requests the shared check on foreground',async()=>{
  vi.useFakeTimers();
  vi.mocked(fuelFeed.load).mockResolvedValue({source:'none',cache:null,error:null,updateState:'pending'});
  vi.mocked(fuelFeed.poll).mockResolvedValue({source:'none',cache:null,error:null,updateState:'idle'});
  render(<FuelProvider><PriceProbe/></FuelProvider>);
  await act(async()=>{await Promise.resolve();});
  act(()=>mocks.listener?.('background'));
  await act(async()=>{await vi.advanceTimersByTimeAsync(15000);});
  expect(fuelFeed.poll).not.toHaveBeenCalled();
  await act(async()=>{mocks.listener?.('active');await Promise.resolve();});
  expect(fuelFeed.load).toHaveBeenCalledTimes(2);
  await act(async()=>{await vi.advanceTimersByTimeAsync(5000);});
  expect(fuelFeed.poll).toHaveBeenCalledOnce();
 });
 it('invalidates an open reference at its source freshness boundary',async()=>{
  vi.useFakeTimers();
  const now=Date.now();
  vi.mocked(fuelFeed.load).mockResolvedValue({source:'cache',error:null,updateState:'idle',cache:{version:2,feedUrl:'https://knogo.example/fuel',termsUrl:'https://www.dmpr.gov.za/Terms-Conditions',fetchedAt:new Date(now).toISOString(),records:[{grade:'petrol_95',region:'inland',kind:'retail_reference',zarPerLitre:25,effectiveAt:new Date(now-86400000).toISOString(),effectiveUntil:null,checkedAt:new Date(now-48*3600000+60000).toISOString(),sourceUrl:'https://www.dmpr.gov.za/prices'}]}});
  vi.mocked(fuelFeed.poll).mockResolvedValue({source:'none',cache:null,error:'offline',updateState:'failed'});
  render(<FuelProvider><PriceProbe/></FuelProvider>);
  await act(async()=>{await Promise.resolve();});
  await act(async()=>{await vi.advanceTimersByTimeAsync(60001);});
  expect(screen.getByTestId('price-state').textContent).toBe('failed');
  expect(fuelFeed.poll).toHaveBeenCalledOnce();
 });
});
