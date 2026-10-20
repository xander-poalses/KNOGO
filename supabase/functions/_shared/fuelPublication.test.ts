import { parseFuelBreakdown, readZipEntry, discoverPublications, fetchFuelPublications } from "./fuelPublication.ts";
import { zipSync, strToU8 } from "npm:fflate@0.8.3";

const equal = (a: unknown, b: unknown) => { if (JSON.stringify(a) !== JSON.stringify(b)) throw new Error(`${JSON.stringify(a)} != ${JSON.stringify(b)}`); };
const rejects = (fn: () => unknown) => { try { fn(); } catch { return; } throw new Error("Expected rejection"); };
const date = "2026-10-07T00:00:00+02:00";
const row = (...cells: string[]) => `<w:tr>${cells.map(text => `<w:tc><w:p><w:r><w:t>${text.replaceAll('&','&amp;')}</w:t></w:r></w:p></w:tc>`).join('')}</w:tr>`;
export function fixture() {
  return `<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:body><w:tbl>${row('Petrol')}${row('Date','Cents per litre','Region')}${['93','95'].flatMap(grade => ['Inland','Coastal'].map(region => row('07 October 2026',`2988.00 c/l (${grade} ULP & LRP)`,`${region} Region`))).join('')}</w:tbl><w:tbl>${row('Diesel')}${row('Date','Cents per litre','Region')}${row('07 October 2026','3195.49 c/l (0.05%)','Inland Region')}${row('07 October 2026','3279.89 c/l (0.005%)','Inland Region')}</w:tbl><w:tbl>${row('Paraffin')}${row('07 October 2026','1000 c/l','Inland Region')}</w:tbl></w:body></w:document>`;
}
Deno.test('breakdown keeps six pairs, cents, grades and basis', () => {
  const records = parseFuelBreakdown(fixture(), date);
  equal(records.length, 6);
  equal(records[0], {grade:'petrol_93',region:'inland',zarPerLitre:29.88,kind:'retail_reference'});
  equal(records[4], {grade:'diesel_500ppm',region:'inland',zarPerLitre:31.9549,kind:'wholesale_reference'});
  equal(records[5].grade, 'diesel_50ppm');
  equal(records.filter(r => r.grade.startsWith('diesel') && r.region === 'coastal').length, 0);
  equal(parseFuelBreakdown(fixture().replaceAll('</w:tbl><w:tbl>',''),date),records);
});
Deno.test('rejects ambiguity, missing pairs, dates, units and unsafe XML', () => {
  for (const xml of [fixture().replace('93 ULP','99 ULP'), fixture().replace('Inland Region','Coastal Region'), fixture().replace('07 October','08 October'), fixture().replaceAll('Cents per litre','Price'), fixture().replace('2988.00','-2988.00'), fixture().slice(0,-20), '<!DOCTYPE x [<!ENTITY x SYSTEM="file:///etc/passwd">]>' + fixture()]) rejects(() => parseFuelBreakdown(xml,date));
  rejects(() => parseFuelBreakdown(fixture(),'2026-02-30T00:00:00+02:00'));
});
Deno.test('ZIP reads one bounded entry and rejects paths, duplicates and expansion', () => {
  const zip = zipSync({'word/document.xml':strToU8(fixture())});
  equal(new TextDecoder().decode(readZipEntry(zip, name => name === 'word/document.xml', 10000)),fixture());
  rejects(() => readZipEntry(zip, () => true, 10));
  rejects(() => readZipEntry(zipSync({'../x':strToU8('x')}), () => true,100));
  rejects(() => readZipEntry(zipSync({'a':strToU8('x'),'b':strToU8('y')}), () => true,100));
  rejects(() => readZipEntry(zip.slice(0,10), () => true,100));
});
const index = '<h3>Fuel Prices Effective from 07 October 2026</h3><h4>Fuel Price Adjustment Documents (ZIP)</h4><a href="https://bit.ly/example">Download</a>';
Deno.test('discovers dates and URLs without hard-coded item IDs', () => {
  equal(discoverPublications(index,new Date('2026-10-19T12:00:00Z')), [{effectiveAt:date,url:'https://bit.ly/example'}]);
  rejects(() => discoverPublications(index.replace('https://bit.ly/example','https://evil.example/x'),new Date()));
  rejects(() => discoverPublications(index.replace('07 October','32 October'),new Date()));
});
Deno.test('fetch follows only source redirects and parses downloaded DOCX', async () => {
  const docx=zipSync({'word/document.xml':strToU8(fixture())});
  const zip=zipSync({'Breakdown of Prices October 2026.docx':docx});
  const fetcher=(async(input: RequestInfo | URL) => {
    const url=String(input);
    if(url.includes('Fuel-Prices')) return new Response(index);
    if(url.includes('bit.ly')) return new Response(null,{status:302,headers:{location:'https://www.dmpr.gov.za/API/Evotiva-UserFiles/FileActionsServices/DownloadFile?ItemId=3501&ModuleId=2305&TabId=154'}});
    return new Response(zip);
  }) as typeof fetch;
  const result=await fetchFuelPublications(new Date('2026-10-19T12:00:00Z'),fetcher);
  equal(result[0].records.length,6);
  equal(result[0].hash.length,64);
  let failed=false;
  try { await fetchFuelPublications(new Date(),(async() => new Response(null,{status:302,headers:{location:'http://127.0.0.1/'}})) as typeof fetch); } catch { failed=true; }
  equal(failed,true);
});
