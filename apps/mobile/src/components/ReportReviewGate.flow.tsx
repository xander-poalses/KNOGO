import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ReportReviewGate } from "./ReportReviewGate";

const mocks=vi.hoisted(()=>({read:vi.fn(),accept:vi.fn()}));
vi.mock("../supabase",()=>({supabaseApi:{readReportReviewNotice:mocks.read,acceptReportReviewNotice:mocks.accept}}));
vi.mock("../theme",()=>({fonts:{},space:{},useThemeStyles:(factory:any)=>factory({})}));
vi.mock("./FeedbackToast",()=>({FeedbackToast:({message}:any)=>message?<p role="alert">{message}</p>:null}));
vi.mock("./Ui",()=>({Page:({children}:any)=><main>{children}</main>,BackButton:()=>null,Notice:({title}:any)=><p>{title}</p>,ActionButton:({label,onPress,disabled,loading}:any)=><button onClick={onPress} disabled={disabled||loading}>{label}</button>,Chip:({label,selected,onPress}:any)=><button role="checkbox" aria-checked={selected} onClick={onPress}>{label}</button>}));
vi.mock("react-native",()=>({View:({children}:any)=><div>{children}</div>,Text:({children}:any)=><p>{children}</p>,StyleSheet:{create:(value:any)=>value}}));
beforeEach(()=>{vi.resetAllMocks();mocks.read.mockResolvedValue({version:"2026-10-19",accepted:false});mocks.accept.mockResolvedValue({version:"2026-10-19",accepted:true});});
afterEach(cleanup);
describe("report review notice gate",()=>{
 it("requires adult acknowledgement and a saved notice before showing the survey",async()=>{
  render(<ReportReviewGate accountId="account-a"><p>Survey</p></ReportReviewGate>);
  await screen.findByText("Before you report");
  const submit=screen.getByRole("button",{name:"Agree and continue"}) as HTMLButtonElement;
  expect(submit.disabled).toBe(true);expect(screen.queryByText("Survey")).toBeNull();
  fireEvent.click(screen.getByRole("checkbox"));fireEvent.click(submit);
  await screen.findByText("Survey");
  expect(mocks.accept).toHaveBeenCalledWith({version:"2026-10-19",adultConfirmed:true});
 });
 it("keeps the survey hidden when saving fails",async()=>{
  mocks.accept.mockRejectedValue(new Error("Could not save the notice"));
  render(<ReportReviewGate accountId="account-a"><p>Survey</p></ReportReviewGate>);
  fireEvent.click(await screen.findByRole("checkbox"));fireEvent.click(screen.getByRole("button",{name:"Agree and continue"}));
  await screen.findByRole("alert");expect(screen.queryByText("Survey")).toBeNull();
 });
 it("does not carry consent or a pending response across accounts",async()=>{
  let finish!:(value:unknown)=>void;
  mocks.read.mockReturnValueOnce(new Promise(resolve=>{finish=resolve}));
  const view=render(<ReportReviewGate accountId="account-a"><p>Survey</p></ReportReviewGate>);
  view.rerender(<ReportReviewGate accountId="account-b"><p>Survey</p></ReportReviewGate>);
  await screen.findByText("Before you report");
  await act(async()=>finish({version:"2026-10-19",accepted:true}));
  expect(screen.queryByText("Survey")).toBeNull();
 });
 it("uses the server acknowledgement on return",async()=>{
  mocks.read.mockResolvedValue({version:"2026-10-19",accepted:true});
  render(<ReportReviewGate accountId="account-a"><p>Survey</p></ReportReviewGate>);
  await screen.findByText("Survey");expect(mocks.accept).not.toHaveBeenCalled();
 });
});
