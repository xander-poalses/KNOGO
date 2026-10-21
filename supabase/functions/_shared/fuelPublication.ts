// Imports
import { DOMParser } from "npm:@xmldom/xmldom@0.9.12";
import { Unzip, UnzipInflate } from "npm:fflate@0.8.3";

// Types
export type FuelPublicationRow = { grade: 'petrol_93' | 'petrol_95' | 'diesel_50ppm' | 'diesel_500ppm'; region: 'inland' | 'coastal'; zarPerLitre: number; kind: 'retail_reference' | 'wholesale_reference' };
export type FuelPublication = { effectiveAt: string; effectiveUntil: null; sourceUrl: string; hash: string; records: FuelPublicationRow[] };
// State and Helpers
export const fuelIndexUrl = 'https://www.dmpr.gov.za/Branches/Petroleum-Resources/Fuel-Prices';
const months = ['january','february','march','april','may','june','july','august','september','october','november','december'];
// Functions
function publicationDate(text: string) {
  const match = /^(\d{1,2})\s+([a-z]+)\s+(\d{4})$/i.exec(text.trim());
  if (!match) throw new Error('source_date');
  const month = months.indexOf(match[2].toLowerCase()) + 1;
  const day = `${match[3]}-${String(month).padStart(2,'0')}-${match[1].padStart(2,'0')}`;
  if (!month || !Number.isFinite(Date.parse(`${day}T00:00:00Z`)) || new Date(`${day}T00:00:00Z`).toISOString().slice(0,10) !== day) throw new Error('source_date');
  return `${day}T00:00:00+02:00`;
}
export function parseFuelBreakdown(xml: string, effectiveAt: string): FuelPublicationRow[] {
  if (xml.length > 2 * 1024 * 1024 || /<!DOCTYPE|<!ENTITY/i.test(xml) || !Number.isFinite(Date.parse(effectiveAt))) throw new Error('source_xml');
  const document = new DOMParser({ onError: () => { throw new Error('source_xml'); } }).parseFromString(xml,'application/xml');
  const rows: FuelPublicationRow[] = [];
  const pairs = new Set<string>();
  for (const table of Array.from(document.getElementsByTagNameNS('*','tbl'))) {
    const cells = Array.from(table.getElementsByTagNameNS('*','tr')).map(tr => Array.from(tr.getElementsByTagNameNS('*','tc')).map(tc => (tc.textContent ?? '').replace(/\s+/g,' ').trim()));
    let heading = '', needsHeader=false;
    for (const cell of cells) {
      if(cell.length===1) {heading=cell[0].toLowerCase();needsHeader=heading==='petrol'||heading==='diesel';continue;}
      if(heading!=='petrol' && heading!=='diesel') continue;
      if(needsHeader) { if(cell.join('|').toLowerCase()!=='date|cents per litre|region') throw new Error('source_columns');needsHeader=false;continue; }
      if (cell.length !== 3 || publicationDate(cell[0]) !== effectiveAt) throw new Error('source_date');
      const match = heading === 'petrol' ? /^(\d+(?:\.\d{1,3})?)\s*c\/l\s*\((93|95) ULP & LRP\)$/i.exec(cell[1]) : /^(\d+(?:\.\d{1,3})?)\s*c\/l\s*\((0\.05|0\.005)%\)$/i.exec(cell[1]);
      const region = /^(Inland|Coastal) Region$/i.exec(cell[2])?.[1].toLowerCase() as FuelPublicationRow['region'] | undefined;
      if (!match || !region || +match[1] <= 0 || +match[1] > 100000) throw new Error('source_value');
      const grade: FuelPublicationRow['grade'] = heading === 'petrol' ? match[2] === '93' ? 'petrol_93' : 'petrol_95' : match[2] === '0.05' ? 'diesel_500ppm' : 'diesel_50ppm';
      const pair = `${grade}:${region}`;
      if (pairs.has(pair)) throw new Error('source_duplicate');
      pairs.add(pair);
      rows.push({grade,region,zarPerLitre:Math.round(+match[1]*100)/10000,kind:heading === 'petrol' ? 'retail_reference' : 'wholesale_reference'});
    }
  }
  const expected = ['petrol_93:inland','petrol_93:coastal','petrol_95:inland','petrol_95:coastal','diesel_500ppm:inland','diesel_50ppm:inland'];
  if (rows.length !== expected.length || expected.some(pair => !pairs.has(pair))) throw new Error('source_incomplete');
  return rows;
}

export function readZipEntry(bytes: Uint8Array, select: (name: string) => boolean, limit: number): Uint8Array {
  if (bytes.length < 22 || bytes.length > 10*1024*1024) throw new Error('source_zip');
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  let end = bytes.length - 22;
  while (end >= Math.max(0,bytes.length-65557) && view.getUint32(end,true) !== 0x06054b50) end--;
  if (end < 0 || end+22+view.getUint16(end+20,true) !== bytes.length || view.getUint16(end+4,true) || view.getUint16(end+6,true)) throw new Error('source_zip');
  const count = view.getUint16(end+10,true);
  let cursor = view.getUint32(end+16,true), total = 0;
  const names = new Set<string>();
  if (!count || count>64 || cursor + view.getUint32(end+12,true) !== end) throw new Error('source_zip');
  for (let i=0;i<count;i++) {
    if (cursor+46>end || view.getUint32(cursor,true)!==0x02014b50 || (view.getUint16(cursor+8,true)&1)) throw new Error('source_zip');
    const nameLength=view.getUint16(cursor+28,true);
    const name=new TextDecoder('utf-8',{fatal:true}).decode(bytes.subarray(cursor+46,cursor+46+nameLength));
    const size=view.getUint32(cursor+24,true);
    total+=size;
    if (names.has(name) || /[\\\x00]/.test(name) || name.startsWith('/') || name.split('/').some(part => part==='..' || part==='.') || total>20*1024*1024 || (select(name) && size>limit)) throw new Error('source_zip');
    names.add(name);
    cursor+=46+nameLength+view.getUint16(cursor+30,true)+view.getUint16(cursor+32,true);
  }
  if(cursor!==end) throw new Error('source_zip');
  let result: Uint8Array | null=null, selected=0;
  const unzip=new Unzip(file => {
    if(!names.has(file.name)) throw new Error('source_zip');
    if(!select(file.name)) return;
    if(++selected!==1) throw new Error('source_duplicate');
    const chunks:Uint8Array[]=[];let size=0;
    file.ondata=(error,chunk,final)=>{
      if(error) throw new Error('source_zip');
      size+=chunk.length;
      if(size>limit) {file.terminate();throw new Error('source_size');}
      chunks.push(chunk);
      if(final) { const output=new Uint8Array(size);let offset=0;for(const chunk of chunks){output.set(chunk,offset);offset+=chunk.length;} result=output; }
    };
    file.start();
  });
  unzip.register(UnzipInflate);
  for(let offset=0;offset<bytes.length;offset+=4096) unzip.push(bytes.subarray(offset,offset+4096),offset+4096>=bytes.length);
  if(!result || selected!==1) throw new Error('source_missing');
  return result;
}

function sourceUrl(raw: string) {
  const url = new URL(raw, fuelIndexUrl);
  if(url.protocol!=='https:' || url.username || url.password || url.port || url.hash) throw new Error('source_url');
  if(url.href===fuelIndexUrl) return url.href;
  if(url.hostname==='bit.ly' && /^\/[a-zA-Z0-9]+$/.test(url.pathname) && !url.search) return url.href;
  if(url.hostname==='www.dmpr.gov.za' && url.pathname==='/API/Evotiva-UserFiles/FileActionsServices/DownloadFile' && [...url.searchParams.keys()].sort().join(',')==='ItemId,ModuleId,TabId' && [...url.searchParams.values()].every(value => /^\d+$/.test(value))) return url.href;
  throw new Error('source_url');
}
export function discoverPublications(html: string, now: Date) {
  const publications: Array<{effectiveAt:string;url:string}>=[];
  const sections=html.split(/<h3\b[^>]*>/i).slice(1);
  for(const section of sections) {
    const heading=/^\s*Fuel Prices Effective from\s+([^<]+)<\/h3>/i.exec(section);
    if(!heading || !/\(ZIP\)/i.test(section)) continue;
    const effectiveAt=publicationDate(heading[1]);
    const link=/<a\b[^>]*href\s*=\s*["']([^"']+)["'][^>]*>\s*(?:<[^>]+>\s*)*(?:View|Download)/i.exec(section);
    if(!link) throw new Error('source_link');
    publications.push({effectiveAt,url:sourceUrl(link[1].replaceAll('&amp;','&'))});
  }
  publications.sort((a,b)=>Date.parse(b.effectiveAt)-Date.parse(a.effectiveAt));
  const active=publications.find(p=>Date.parse(p.effectiveAt)<=now.getTime());
  const future=publications.filter(p=>Date.parse(p.effectiveAt)>now.getTime()).at(-1);
  if(!active || publications.some((p,i)=>publications.findIndex(q=>q.effectiveAt===p.effectiveAt)!==i)) throw new Error('source_publication');
  return [active,...(future?[future]:[])];
}

async function download(raw: string, limit: number, deadline: number, fetcher:typeof fetch): Promise<{bytes:Uint8Array;url:string}> {
  let url=sourceUrl(raw);
  for(let redirect=0;redirect<=3;redirect++) {
    const remaining=Math.min(15000,deadline-Date.now());if(remaining<=0) throw new Error('source_timeout');
    const controller=new AbortController();const timer=setTimeout(()=>controller.abort(),remaining);
    try {
      const response=await fetcher(url,{redirect:'manual',signal:controller.signal});
      if([301,302,303,307,308].includes(response.status)) {
        await response.body?.cancel();
        url=sourceUrl(new URL(response.headers.get('location')??'',url).href);continue;
      }
      if(!response.ok || !response.body || Number(response.headers.get('content-length')??0)>limit) throw new Error('source_download');
      const reader=response.body.getReader(),chunks:Uint8Array[]=[];let size=0;
      try { while(true) { const {value,done}=await reader.read();if(done)break;size+=value.length;if(size>limit)throw new Error('source_size');chunks.push(value); } }
      finally { await reader.cancel(); }
      const bytes=new Uint8Array(size);let offset=0;for(const chunk of chunks){bytes.set(chunk,offset);offset+=chunk.length;}
      return {bytes,url};
    } finally { clearTimeout(timer); }
  }
  throw new Error('source_redirect');
}
export async function fetchFuelPublications(now = new Date(), fetcher:typeof fetch=fetch):Promise<FuelPublication[]> {
  const deadline=Date.now()+60000;
  const index=await download(fuelIndexUrl,2*1024*1024,deadline,fetcher);
  const publications=discoverPublications(new TextDecoder().decode(index.bytes),now);
  const result:FuelPublication[]=[];
  for(const publication of publications) {
    const archive=await download(publication.url,10*1024*1024,deadline,fetcher);
    const docx=readZipEntry(archive.bytes,name=>/^Breakdown of Prices [a-z]+ \d{4}\.docx$/i.test(name),2*1024*1024);
    const xml=new TextDecoder('utf-8',{fatal:true}).decode(readZipEntry(docx,name=>name==='word/document.xml',2*1024*1024));
    const hash=Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',new Uint8Array(docx).buffer))).map(b=>b.toString(16).padStart(2,'0')).join('');
    result.push({effectiveAt:publication.effectiveAt,effectiveUntil:null,sourceUrl:archive.url,hash,records:parseFuelBreakdown(xml,publication.effectiveAt)});
  }
  return result;
}
