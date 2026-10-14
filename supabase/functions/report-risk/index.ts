import { assessReportRisk } from "../_shared/providerServices.ts";
import { drainRiskQueue, type RiskJob } from "../_shared/riskQueue.ts";
import { jsonResponse, serverRpc } from "../_shared/server.ts";

// Called by a server worker after commit, never by the mobile app.
Deno.serve(async (req:Request)=>{
 const workerKey=Deno.env.get("RISK_WORKER_SECRET");
 if(!workerKey || req.headers.get("authorization")!==`Bearer ${workerKey}`)return jsonResponse({error:"Not authorised."},401);
 if(req.method!=="POST")return jsonResponse({error:"Method not allowed."},405);
 try{
  const raw=await req.text();if(raw.length>1024)return jsonResponse({error:"Request too large."},413);
  if(raw.trim()) {
   const body=JSON.parse(raw);
   if(!body || Array.isArray(body) || typeof body!=="object" || Object.keys(body).length) return jsonResponse({error:"Send an empty object to drain the queue."},400);
  }
  const url=Deno.env.get("SUPABASE_URL")!;const key=Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  if(!url || !key)throw new Error("Server setup missing.");
  const testActorId=Deno.env.get("RISK_TEST_ACTOR_ID");
  // shortcut: reviews require a test account until production data handling is approved.
  if(!/^[0-9a-f]{8}(?:-[0-9a-f]{4}){3}-[0-9a-f]{12}$/i.test(testActorId??""))return jsonResponse({error:"Test account scope missing. Review remains disabled."},503);
  const result=await drainRiskQueue({
   claim:async()=>{
    const jobs=await serverRpc(url,key,"claim_report_risk_job",{p_actor_id:testActorId,p_place_id:"knogo-gemini-test-venue"});
    return Array.isArray(jobs)? (jobs[0] as RiskJob | undefined)??null : null;
   },
   assess:async(id)=>{
    const rows=await serverRpc(url,key,"report_risk_context",{p_report_id:id});
    if(!Array.isArray(rows))throw new Error("Context unavailable.");
    return assessReportRisk(rows,{targetReportId:id,testActorId,key:Deno.env.get("GEMNINI_API_KEY"),model:Deno.env.get("GEMINI_RISK_MODEL"),pseudonymSecret:Deno.env.get("RISK_PSEUDONYM_SECRET"),freeTierConfirmed:Deno.env.get("GEMINI_FREE_TIER_CONFIRMED")==="true",reserve:(provider)=>serverRpc(url,key,"reserve_provider_call",{p_provider:provider})});
   },
   finish:(job,assessment)=>serverRpc(url,key,"finish_report_risk_job",{p_report_id:job.report_id,p_lease_id:job.lease_id,p_risk:assessment.risk,p_reasons:assessment.reasons,p_model:assessment.model,p_outcome:assessment.outcome})
  });
  return jsonResponse(result);
 }catch{return jsonResponse({error:"Assessment unavailable. Status remains uncertain."},503);}
});
