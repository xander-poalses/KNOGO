import { createFuelPricesHandler } from './fuelPrices.ts';
const assert=(value:unknown)=>{if(!value)throw new Error('Assertion failed');};
Deno.test('POST responds while source work continues; GET does not claim',async()=>{
 let claims=0,finishes=0,release!:()=>void;
 const pending=new Promise<void>(resolve=>release=resolve), tasks:Promise<unknown>[]=[];
 const handler=createFuelPricesHandler({claim:async()=>{claims++;return 'id';},read:async()=>({records:[],updateState:'pending'}),fetchPublications:async()=>{await pending;return [];},finish:async()=>{finishes++;},waitUntil:task=>tasks.push(task)});
 const response=await handler(new Request('https://knogo.example',{method:'POST'}));
 assert(response.status===200 && finishes===0 && tasks.length===1);
 await handler(new Request('https://knogo.example'));
 assert(claims===1);release();await Promise.all(tasks);assert(finishes===1);
});
Deno.test('rejects client inputs and methods; no work when claim is unavailable',async()=>{
 let claims=0,tasks=0;
 const handler=createFuelPricesHandler({claim:async()=>{claims++;return null;},read:async()=>({records:[],updateState:'idle'}),fetchPublications:async()=>[],finish:async()=>{},waitUntil:()=>tasks++});
 assert((await handler(new Request('https://x',{method:'POST',body:'{"force":true}'}))).status===400);
 assert((await handler(new Request('https://x',{method:'DELETE'}))).status===405);
 await handler(new Request('https://x',{method:'POST'}));assert(claims===1 && tasks===0);
});
Deno.test('failure is recorded without exposing upstream details',async()=>{
 let error='';const tasks:Promise<unknown>[]=[];
 const handler=createFuelPricesHandler({claim:async()=> 'id',read:async()=>({}),fetchPublications:async()=>{throw new Error('source_download');},finish:async(_id,_pubs,code)=>{error=code??'';},waitUntil:task=>tasks.push(task)});
 await handler(new Request('https://x',{method:'POST'}));await Promise.all(tasks);assert(error==='source_download');
});
