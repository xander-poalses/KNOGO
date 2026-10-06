import { requestTrip } from "../_shared/providerServices.ts";
import { jsonResponse, serverRpc } from "../_shared/server.ts";

Deno.serve(async (req:Request)=>{
 const origin=req.headers.get("origin")??"";
 const approved=(Deno.env.get("TRIP_ALLOWED_ORIGINS")??"").split(",").filter(Boolean);
 if (origin && !approved.includes(origin)) return jsonResponse({error:"Origin not allowed."},403);
 if (req.method==="OPTIONS") return jsonResponse({},200,origin);
 let publishableKeys:string[]=[];
 try { publishableKeys=Object.values(JSON.parse(Deno.env.get("SUPABASE_PUBLISHABLE_KEYS")??"{}")); } catch { /* Fail closed unless the legacy anon key is available. */ }
 const anonKey=Deno.env.get("SUPABASE_ANON_KEY");
 if(anonKey)publishableKeys.push(anonKey);
 if(!publishableKeys.includes(req.headers.get("apikey")??""))return jsonResponse({error:"App key required."},401,origin);
 if (req.method!=="POST") return jsonResponse({error:"Method not allowed."},405,origin);
 if ((req.headers.get("content-length")&&Number(req.headers.get("content-length"))>4096)) return jsonResponse({error:"Request too large."},413,origin);
 try {
  const raw=await req.text();if(raw.length>4096)return jsonResponse({error:"Request too large."},413,origin);
  const body=JSON.parse(raw);if(!body||typeof body!=="object"||Array.isArray(body))return jsonResponse({error:"Invalid request."},400,origin);
  const url=Deno.env.get("SUPABASE_URL")!;const key=Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const result=await requestTrip(body,{orsKey:Deno.env.get("ORS_API_KEY"),freeTierConfirmed:Deno.env.get("ORS_FREE_TIER_CONFIRMED")==="true",reserve:(provider)=>serverRpc(url,key,"reserve_trip_provider_call",{p_provider:provider})});
  return jsonResponse(result,200,origin);
 }catch(cause){const message=cause instanceof Error?cause.message:"provider_error";return jsonResponse({error:message==="disabled"?"Trip service is not configured.":message==="quota"?"Trip service limit reached.":"Trip service failed."},message==="quota"?429:message==="invalid"?400:503,origin);}
});
