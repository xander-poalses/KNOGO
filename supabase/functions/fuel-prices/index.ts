import { createFuelPricesHandler } from '../_shared/fuelPrices.ts';
import { fetchFuelPublications } from '../_shared/fuelPublication.ts';
import { serverRpc } from '../_shared/server.ts';

declare const EdgeRuntime:{waitUntil:(task:Promise<unknown>)=>void};
const rpc=(name:string,args:unknown={})=>serverRpc(Deno.env.get('SUPABASE_URL')!,Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,name,args);
// Public reference data; only the server can claim one upstream check per SAST day.
Deno.serve(createFuelPricesHandler({
 claim:()=>rpc('claim_fuel_price_refresh'),read:()=>rpc('read_fuel_price_snapshot'),
 fetchPublications:()=>fetchFuelPublications(),
 finish:(id,publications,error)=>rpc('finish_fuel_price_refresh',{p_attempt_id:id,p_publications:publications,p_error_code:error??null}),
 waitUntil:task=>EdgeRuntime.waitUntil(task)
}));
