import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { ReportAssessmentReceipt } from "./ReportAssessmentReceipt";
const mocks=vi.hoisted(()=>({read:vi.fn()}));
vi.mock("../lib/supabaseApi",()=>({readReportAssessment:mocks.read}));
beforeEach(()=>{vi.resetAllMocks();vi.useFakeTimers();});
afterEach(()=>{cleanup();vi.useRealTimers();});
it("bounds polling to two minutes then permits a manual read",async()=>{
 mocks.read.mockResolvedValue({state:"queued",reason:"quota",retryAt:null});
 render(<ReportAssessmentReceipt reportId="report" onReviewed={()=>{}}/>);
 await act(async()=>{});
 for(let i=0;i<24;i++)await act(async()=>{await vi.advanceTimersByTimeAsync(5000);});
 await act(async()=>{await vi.advanceTimersByTimeAsync(60000);});
 expect(mocks.read).toHaveBeenCalledTimes(25);
 expect(screen.getByText("Waiting for review capacity. It will retry without you.")).toBeTruthy();
 fireEvent.click(screen.getByRole("button",{name:"Check review"}));await act(async()=>{});
 expect(mocks.read).toHaveBeenCalledTimes(26);
});
it("stops when the receipt is no longer available",async()=>{
 mocks.read.mockRejectedValue(new Error("Your report assessment is not available."));
 render(<ReportAssessmentReceipt reportId="report" onReviewed={()=>{}}/>);await act(async()=>{});
 await act(async()=>{await vi.advanceTimersByTimeAsync(120000);});
 expect(mocks.read).toHaveBeenCalledOnce();
 expect(screen.getByText("Review details are no longer available.")).toBeTruthy();
});
it("ignores an in-flight read after unmount",async()=>{
 let finish!:(value:unknown)=>void;const reviewed=vi.fn();
 mocks.read.mockReturnValue(new Promise(resolve=>{finish=resolve;}));
 const view=render(<ReportAssessmentReceipt reportId="report" onReviewed={reviewed}/>);
 view.unmount();await act(async()=>finish({state:"complete",risk:"low"}));
 expect(reviewed).not.toHaveBeenCalled();expect(vi.getTimerCount()).toBe(0);
});
