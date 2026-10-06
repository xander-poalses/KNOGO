export function jsonResponse(body:unknown,status=200,origin="") {
  return new Response(JSON.stringify(body),{status,headers:{"Content-Type":"application/json","Cache-Control":"no-store","Access-Control-Allow-Origin":origin,"Access-Control-Allow-Headers":"content-type,apikey,authorization","Access-Control-Allow-Methods":"POST,OPTIONS"}});
}
export async function serverRpc(url:string,key:string,name:string,args:unknown) {
  const response=await fetch(`${url}/rest/v1/rpc/${name}`,{method:"POST",headers:{apikey:key,Authorization:`Bearer ${key}`,"Content-Type":"application/json"},body:JSON.stringify(args),signal:AbortSignal.timeout(10000)});
  if (!response.ok) throw new Error("Database request failed.");
  const text=await response.text(); return text?JSON.parse(text):null;
}
