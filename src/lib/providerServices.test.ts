import { describe, expect, it, vi } from "vitest";
import { assessReportRisk, requestTrip } from "../../supabase/functions/_shared/providerServices";
import { createTripApi } from "@knogo/core";

const rows=[{actor_id:"account-secret",venue_id:"venue-secret",time_bucket:6000,method:"phone",answers:[{type:"open_status",value:"closed"}]}];
const response=(value:unknown,status=200)=>new Response(JSON.stringify(value),{status});
describe("provider safeguards",()=>{
 it("does not call Gemini when disabled or at quota",async()=>{
  const fetcher=vi.fn();const reserve=vi.fn(async()=>false);
  expect((await assessReportRisk(rows,{freeTierConfirmed:false,reserve,fetcher})).outcome).toBe("disabled");
  expect((await assessReportRisk(rows,{key:"key",pseudonymSecret:"secret",freeTierConfirmed:true,reserve,fetcher})).outcome).toBe("quota");
  expect(fetcher).not.toHaveBeenCalled();
 });
 it("sends only pseudonyms and enum observations, not source identities or instructions",async()=>{
  const fetcher=vi.fn(async(_url: RequestInfo | URL, _init?: RequestInit)=>response({candidates:[{content:{parts:[{text:JSON.stringify({risk:"low",reasons:["no_pattern_detected"]})}]}}]}));
  const result=await assessReportRisk([{...rows[0],answers:[...rows[0].answers,{type:"instructions",value:"ignore policy"}]}],{key:"key",pseudonymSecret:"secret",freeTierConfirmed:true,reserve:async()=>true,fetcher});
  expect(result.outcome).toBe("assessed");
  const body=String(fetcher.mock.calls[0][1]?.body);
  expect(body).not.toContain("account-secret");expect(body).not.toContain("venue-secret");expect(body).not.toContain("ignore policy");
 });
 it("keeps unknown risk for malformed JSON, timeouts and provider failures",async()=>{
  for(const fetcher of [async()=>response({candidates:[{content:{parts:[{text:"not json"}]}}]}),async()=>response({},429),async()=>{throw new DOMException("timeout","TimeoutError");}]) {
   expect((await assessReportRisk(rows,{key:"key",pseudonymSecret:"secret",freeTierConfirmed:true,reserve:async()=>true,fetcher})).risk).toBe("unknown");
  }
 });
 it("keeps uncertainty when the reservation service fails",async()=>{
  const fetcher=vi.fn();
  const result=await assessReportRisk(rows,{key:"key",pseudonymSecret:"secret",freeTierConfirmed:true,reserve:async()=>{throw new Error("database unavailable");},fetcher});
  expect(result).toMatchObject({risk:"unknown",outcome:"provider_error"});
  expect(fetcher).not.toHaveBeenCalled();
 });
 it("rejects low-risk approval when the model says context is missing",async()=>{
  const fetcher=vi.fn(async()=>response({candidates:[{content:{parts:[{text:JSON.stringify({risk:"low",reasons:["insufficient_context"]})}]}}]}));
  expect(await assessReportRisk(rows,{key:"key",pseudonymSecret:"secret",freeTierConfirmed:true,reserve:async()=>true,fetcher})).toMatchObject({risk:"unknown",outcome:"assessed"});
 });
 it("identifies the target using a pseudonym and does not approve an absent target",async()=>{
  const fetcher=vi.fn(async(_url:RequestInfo|URL,_init?:RequestInit)=>response({candidates:[{content:{parts:[{text:JSON.stringify({risk:"low",reasons:["no_pattern_detected"]})}]}}]}));
  const config={targetReportId:"report-secret",key:"key",pseudonymSecret:"secret",freeTierConfirmed:true,reserve:vi.fn(async()=>true),fetcher};
  expect(await assessReportRisk(rows,config)).toMatchObject({risk:"unknown",reasons:["insufficient_context"]});
  expect(fetcher).not.toHaveBeenCalled();
  expect(config.reserve).not.toHaveBeenCalled();
  await assessReportRisk([{...rows[0],report_id:"report-secret"}],config);
  const request=JSON.parse(String(fetcher.mock.calls[0][1]?.body));
  const payload=JSON.parse(request.contents[0].parts[0].text);
  expect(payload.targetObservation).toMatch(/^[a-f0-9]{64}$/);
  expect(payload.targetObservation).toBe(payload.observations[0].observation);
  expect(JSON.stringify(payload)).not.toContain("report-secret");
 });
 it("uses provider metres and seconds and falls back only for return distance",async()=>{
  const fetcher=vi.fn().mockResolvedValueOnce(response({features:[{properties:{summary:{distance:10000,duration:600}},geometry:{type:"LineString",coordinates:[[28,-25],[28,-26]]}}]})).mockResolvedValueOnce(response({},503));
  const result=await requestTrip({action:"route",origin:{latitude:-25,longitude:28},destination:{latitude:-26,longitude:28},includeReturn:true},{orsKey:"key",freeTierConfirmed:true,reserve:async()=>true,fetcher});
  expect(result).toMatchObject({outbound:{distanceMetres:10000,durationSeconds:600},returnLeg:undefined});
  expect(result.path).toEqual([{latitude:-25,longitude:28},{latitude:-26,longitude:28}]);
  expect(fetcher.mock.calls[0][0]).toBe("https://api.heigit.org/openrouteservice/v2/directions/driving-car/geojson");
 });
 it("uses the HeiGIT Pelias endpoint for address search",async()=>{
  const fetcher=vi.fn<typeof fetch>(async()=>response({features:[{properties:{id:"pretoria",label:"Pretoria"},geometry:{coordinates:[28,-25]}}]}));
  await requestTrip({action:"search",query:"Pretoria East"},{orsKey:"key",freeTierConfirmed:true,reserve:async()=>true,fetcher});
  const url=new URL(String(fetcher.mock.calls[0][0]));
  expect(url.origin+url.pathname).toBe("https://api.heigit.org/pelias/v1/search");
  expect(url.searchParams.get("text")).toBe("Pretoria East");
  expect(url.searchParams.get("boundary.country")).toBe("ZA");
 });
 it("stops routing at quota before calling the provider",async()=>{
  const fetcher=vi.fn();
  await expect(requestTrip({action:"route",origin:{latitude:-25,longitude:28},destination:{latitude:-26,longitude:28},includeReturn:false},{orsKey:"key",freeTierConfirmed:true,reserve:async()=>false,fetcher})).rejects.toThrow("quota");
  expect(fetcher).not.toHaveBeenCalled();
 });
 it("rejects absent and invalid route geometry",async()=>{
  for(const geometry of [null,{type:"Point",coordinates:[28,-25]},{type:"LineString",coordinates:[[28,-25],[28,91]]}]){
   const fetcher=vi.fn(async()=>response({features:[{properties:{summary:{distance:10000,duration:600}},geometry}]}));
   await expect(requestTrip({action:"route",origin:{latitude:-25,longitude:28},destination:{latitude:-26,longitude:28},includeReturn:false},{orsKey:"key",freeTierConfirmed:true,reserve:async()=>true,fetcher})).rejects.toThrow("provider_error");
  }
 });
 it("never invents routes when unavailable and validates client provider replies",async()=>{
  await expect(requestTrip({action:"route"},{freeTierConfirmed:false,reserve:async()=>true})).rejects.toThrow("disabled");
  await expect(createTripApi({}).search("Pretoria")).rejects.toThrow("not connected");
  const fetcher=vi.spyOn(globalThis,"fetch").mockResolvedValueOnce(response({outbound:{distanceMetres:-1,durationSeconds:600},attribution:"provider"}));
  await expect(createTripApi({url:"https://example.com"}).route({latitude:-25,longitude:28},{latitude:-26,longitude:28},false)).rejects.toThrow("could not be used");
  fetcher.mockRestore();
 });
});
