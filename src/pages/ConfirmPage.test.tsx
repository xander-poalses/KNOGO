import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { mockPlaces } from "@knogo/core";
import { ConfirmPage } from "./ConfirmPage";
const mocks=vi.hoisted(()=>({notice:vi.fn(),accept:vi.fn(),submit:vi.fn(),assessment:vi.fn(),refreshPlace:vi.fn(async()=>{})}));
vi.mock("../lib/supabaseApi",()=>({hasSupabaseConfig:true,readSupabaseSession:()=>({userId:"tester"}),signInWithEmail:vi.fn(),signUpWithEmail:vi.fn(),readReportReviewNotice:mocks.notice,acceptReportReviewNotice:mocks.accept,submitSupabaseReport:mocks.submit,readReportAssessment:mocks.assessment}));
vi.mock("../state/PlacesContext",()=>({usePlaces:()=>({places:[mockPlaces[0]],addConfirmation:vi.fn(),refreshPlace:mocks.refreshPlace})}));
beforeEach(()=>{vi.resetAllMocks();mocks.refreshPlace.mockResolvedValue(undefined);mocks.notice.mockResolvedValue({version:"2026-10-19",accepted:true});mocks.accept.mockResolvedValue({version:"2026-10-19",accepted:true});mocks.submit.mockResolvedValue({reportId:"report",outcome:"pending"});mocks.assessment.mockResolvedValue({reportId:"report",state:"complete",risk:"low",assessedAt:"2026-10-19T12:00:00Z",reason:null,retryAt:null});});
afterEach(cleanup);
function show(){return render(<MemoryRouter initialEntries={[`/confirm/${mockPlaces[0].id}`]}><Routes><Route path="/confirm/:placeId" element={<ConfirmPage/>}/></Routes></MemoryRouter>)}
it("does not let a web client skip the account notice",async()=>{
 mocks.notice.mockResolvedValue({version:"2026-10-19",accepted:false});show();
 await screen.findByText("Before you report");
 expect(screen.queryByText("Is the place open?")).toBeNull();
 expect((screen.getByRole("button",{name:"Agree and continue"}) as HTMLButtonElement).disabled).toBe(true);
 fireEvent.click(screen.getByRole("checkbox"));fireEvent.click(screen.getByRole("button",{name:"Agree and continue"}));
 await screen.findByText("How did you check?");
 expect(mocks.accept).toHaveBeenCalledWith({version:"2026-10-19",adultConfirmed:true});
});
it("submits one batch with its check method, not one report per question",async()=>{
 show();fireEvent.click(await screen.findByRole("button",{name:"By phone"}));
 fireEvent.click(screen.getByRole("button",{name:"Continue"}));
 fireEvent.click(screen.getByRole("button",{name:"Open"}));
 expect(screen.getByText("Review your check")).toBeTruthy();
 expect(screen.queryByRole("button",{name:"Skip"})).toBeNull();
 expect(mocks.submit).not.toHaveBeenCalled();
 fireEvent.click(screen.getByRole("button",{name:"Submit check"}));
 await screen.findByText("Report received.");
 await screen.findByText("Gemini review complete");
 expect(mocks.assessment).toHaveBeenCalledWith("report");
 expect(mocks.refreshPlace).toHaveBeenCalledWith(mockPlaces[0].id);
 expect(mocks.submit).toHaveBeenCalledOnce();
 expect(mocks.submit).toHaveBeenCalledWith({placeId:mockPlaces[0].id,reportSource:"phone",sourceUrl:undefined,answers:[{type:"open_status",value:"open"}]});
});
it.each(["At the venue", "By phone", "Online"])("ends a %s closure check without follow-up questions",async method=>{
 show(); fireEvent.click(await screen.findByRole("button",{name:method}));
 if(method==="Online") fireEvent.change(screen.getByLabelText("Source website"),{target:{value:"https://example.com/hours"}});
 fireEvent.click(screen.getByRole("button",{name:"Continue"}));
 fireEvent.click(screen.getByRole("button",{name:"Closed"}));
 expect(screen.getByText("Review your check")).toBeTruthy();
 expect(screen.queryByRole("button",{name:"Skip"})).toBeNull();
 expect(mocks.submit).not.toHaveBeenCalled();
 fireEvent.click(screen.getByRole("button",{name:"Submit check"}));
 await screen.findByText("Report received.");
 expect(mocks.submit).toHaveBeenCalledWith(expect.objectContaining({answers:[{type:"open_status",value:"closed"}],reportSource:method==="At the venue"?"in_person":method==="By phone"?"phone":"online"}));
});
