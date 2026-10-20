import type { FuelPublication } from './fuelPublication.ts';
type Dependencies={claim:()=>Promise<string|null>;read:()=>Promise<unknown>;fetchPublications:()=>Promise<FuelPublication[]>;finish:(id:string,publications:FuelPublication[],error?:string)=>Promise<unknown>;waitUntil:(task:Promise<unknown>)=>void};
export function createFuelPricesHandler(deps:Dependencies) {
 const json=(value:unknown,status=200)=>new Response(JSON.stringify(value),{status,headers:{'Content-Type':'application/json','Cache-Control':'no-store','Access-Control-Allow-Origin':'*','Access-Control-Allow-Headers':'content-type,apikey,authorization','Access-Control-Allow-Methods':'GET,POST,OPTIONS'}});
 return async(req:Request)=>{
  if(req.method==='OPTIONS')return json({});
  if(!['GET','POST'].includes(req.method))return json({error:'Method not allowed.'},405);
  if(new URL(req.url).search)return json({error:'No query parameters.'},400);
  if(req.method==='POST') {
   if(Number(req.headers.get('content-length')??0)>2)return json({error:'No request payload.'},400);
   const reader=req.body?.getReader();
   if(reader) {const {value}=await reader.read();await reader.cancel();if(value?.length)return json({error:'No request payload.'},400);}
  }
  try {
   if(req.method==='POST') {
    const id=await deps.claim();
    if(id) deps.waitUntil((async()=>{
     try {const publications=await deps.fetchPublications();await deps.finish(id,publications);}
     catch(cause) {
      const code=cause instanceof Error && /timeout|abort/i.test(cause.name+cause.message)?'source_timeout':cause instanceof Error && cause.message==='source_download'?'source_download':'source_invalid';
      try{await deps.finish(id,[],code);}catch{console.warn('fuel-prices finish unavailable');}
     }
    })());
   }
   return json(await deps.read());
  } catch {return json({error:'Price unavailable'},503);}
 };
}
