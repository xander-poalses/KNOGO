import {useEffect,useRef,useState} from 'react';
import {PanResponder,StyleSheet,Text,View} from 'react-native';
import {fonts,useTheme} from '../theme';
import {ctaHaptic} from '../haptics';
import type {DistanceSliderProps} from './DistanceSlider';
export function DistanceSlider({value,onCommit}:DistanceSliderProps){
 const {colours}=useTheme();const [draft,setDraft]=useState(value);const width=useRef(1);const current=useRef(value);const start=useRef(value);const props=useRef({value,onCommit});props.current={value,onCommit};
 useEffect(()=>{current.current=value;setDraft(value);},[value]);
 const update=(next:number)=>{current.current=Math.max(1,Math.min(50,Math.round(next)));setDraft(current.current);};
 const commit=()=>{if(current.current!==props.current.value){ctaHaptic();props.current.onCommit(current.current);}};
 const responder=useRef(PanResponder.create({
  onStartShouldSetPanResponder:()=>true,onMoveShouldSetPanResponder:()=>true,onPanResponderTerminationRequest:()=>false,
  onPanResponderGrant:event=>{start.current=1+Math.max(0,Math.min(width.current,event.nativeEvent.locationX))/width.current*49;update(start.current);},
  onPanResponderMove:(_event,gesture)=>update(start.current+gesture.dx/width.current*49),
  onPanResponderRelease:commit,onPanResponderTerminate:()=>update(props.current.value)
 })).current;
 const fraction=(draft-1)/49;
 return <View style={{width:'100%',paddingVertical:8}}>
  <View style={styles.header}><Text style={[styles.label,{color:colours.muted}]}>Within</Text><Text style={[styles.value,{color:colours.text}]}>{draft} km</Text></View>
  <View {...responder.panHandlers} accessible accessibilityRole="adjustable" accessibilityLabel="Distance range" accessibilityValue={{min:1,max:50,now:draft,text:`${draft} kilometres`}} accessibilityActions={[{name:'increment'},{name:'decrement'}]} onAccessibilityAction={event=>{update(current.current+(event.nativeEvent.actionName==='increment'?1:-1));commit();}} onLayout={event=>{width.current=Math.max(1,event.nativeEvent.layout.width);}} style={styles.touch}>
   <View pointerEvents="none" style={[styles.track,{backgroundColor:colours.controlStrong}]}><View style={{width:`${fraction*100}%`,height:6,borderRadius:3,backgroundColor:colours.primary}}/></View>
   <View pointerEvents="none" style={[styles.thumb,{left:`${fraction*100}%`,backgroundColor:colours.primary,shadowColor:colours.text}]}/>
  </View>
  <View style={styles.header}><Text style={[styles.label,{color:colours.muted}]}>1 km</Text><Text style={[styles.label,{color:colours.muted}]}>50 km</Text></View>
 </View>;
}
const styles=StyleSheet.create({header:{flexDirection:'row',justifyContent:'space-between',alignItems:'baseline'},label:{fontFamily:fonts.medium,fontSize:12},value:{fontFamily:fonts.semibold,fontSize:24},touch:{height:48,marginHorizontal:11,justifyContent:'center'},track:{height:6,borderRadius:3,overflow:'hidden'},thumb:{position:'absolute',width:22,height:22,borderRadius:11,marginLeft:-11,shadowOffset:{width:0,height:2},shadowOpacity:0.18,shadowRadius:4,elevation:3}});
