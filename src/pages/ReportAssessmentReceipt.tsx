import { useEffect, useRef, useState } from "react";
import type { ReportAssessment } from "@knogo/core";
import { readReportAssessment } from "../lib/supabaseApi";
import styles from "./ConfirmPage.module.css";

export function ReportAssessmentReceipt({reportId,onReviewed}:{reportId:string;onReviewed:()=>void}) {
 const [assessment,setAssessment]=useState<ReportAssessment|null>(null);
 const [error,setError]=useState<string|null>(null);
 const [busy,setBusy]=useState(false);
 const [refresh,setRefresh]=useState(0);
 const reviewed=useRef(onReviewed);reviewed.current=onReviewed;
 useEffect(()=>{
  let active=true;let timer:ReturnType<typeof setTimeout>|undefined;
  const deadline=Date.now()+120_000;
  const next=()=>{if(active&&Date.now()+5000<=deadline)timer=setTimeout(()=>void read(),5000);};
  const read=async()=>{
   setBusy(true);
   try {
    const value=await readReportAssessment(reportId);if(!active)return;
    setAssessment(value);setError(null);
    if(value.state==='complete')reviewed.current();
    else if(['queued','reviewing'].includes(value.state))next();
   } catch(cause) {
    if(!active)return;
    const missing=cause instanceof Error&&cause.message==='Your report assessment is not available.';
    setError(missing?'Review details are no longer available.':'Review could not load. Check your connection and try again.');
    if(!missing)next();
   } finally {if(active)setBusy(false);}
  };
  void read();return()=>{active=false;clearTimeout(timer);};
 },[reportId,refresh]);
 const state=assessment?.state;
 const title=state==='complete'?'Gemini review complete':state==='queued'?'Waiting for review':state==='reviewing'?'Review in progress':state==='expired'?'Review window ended':state==='unavailable'?'Review unavailable':'Checking review';
 const message=state==='complete'?(assessment?.risk==='low'?'No pattern flagged. This does not prove the report.':'More community checks needed. This is not a verdict on your report.')
  :assessment?.reason==='quota'?'Waiting for review capacity. It will retry without you.'
  :assessment?.reason==='setup'?'Review setup needs attention. Your report was received.'
  :assessment?.reason==='disabled'?'Reviews are switched off. Your report was received.'
  :assessment?.reason==='notice'?'This report predates the review notice. It will not be sent to Google.'
  :state==='expired'?'Report details are removed after 24 hours during cleanup.':'You can leave this screen.';
 return <section aria-live="polite" aria-busy={busy}><h2>{title}</h2><p className={styles.helper}>{message}</p>
  {error?<p role="alert" className={styles.error}>{error}</p>:null}
  {state!=='complete'&&state!=='expired'?<button className={styles.authSubmit} disabled={busy} onClick={()=>setRefresh(value=>value+1)}>Check review</button>:null}
 </section>;
}
