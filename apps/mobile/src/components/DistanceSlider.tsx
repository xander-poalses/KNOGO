import {useEffect,useRef,useState} from 'react';
import {fonts,useTheme} from '../theme';
import {ctaHaptic} from '../haptics';
export type DistanceSliderProps={value:number;onCommit:(value:number)=>void};
export function DistanceSlider({value,onCommit}:DistanceSliderProps){
 const {colours}=useTheme();const [draft,setDraft]=useState(value);const committed=useRef(value);
 useEffect(()=>{setDraft(value);committed.current=value;},[value]);
 const commit=()=>{if(draft!==committed.current){committed.current=draft;ctaHaptic();onCommit(draft);}};
 return <div style={{width:'100%',padding:'8px 0',color:colours.text,fontFamily:fonts.medium}}>
  <div style={{display:'flex',justifyContent:'space-between',alignItems:'baseline',marginBottom:12}}><span style={{fontSize:13,color:colours.muted}}>Within</span><strong style={{fontSize:24,fontWeight:600}}>{draft} km</strong></div>
  <input aria-label="Distance range" type="range" min={1} max={50} step={1} value={draft} onChange={event=>setDraft(Number(event.target.value))} onPointerUp={commit} onKeyUp={commit} onBlur={commit} style={{display:'block',width:'100%',height:32,margin:0,accentColor:colours.primary,cursor:'pointer',touchAction:'pan-y'}}/>
  <div style={{display:'flex',justifyContent:'space-between',fontSize:12,color:colours.muted,marginTop:4}}><span>1 km</span><span>50 km</span></div>
 </div>;
}
