// No recording or reusable provider key. Resources belong to one call generation.
export class RootsVoice{
 constructor({transport,status,media=navigator.mediaDevices,Peer=globalThis.RTCPeerConnection,audioFactory=()=>new Audio()}){Object.assign(this,{transport,status,media,Peer,audioFactory});this.generation=0;this.current=null;}
 live(call){return this.current===call&&call.generation===this.generation;}
 async revoke(session){if(session)await this.transport({operation:'voice_end',session}).catch(()=>{});}
 async start(payload){this.end('ended',true);const call={generation:++this.generation};this.current=call;this.status('connecting');try{
  if(!this.media?.getUserMedia||!this.Peer)throw Error('unsupported');
  const stream=await this.media.getUserMedia({audio:{echoCancellation:true,noiseSuppression:true},video:false});if(!this.live(call)){stream.getTracks().forEach(t=>t.stop());return;}
  call.stream=stream;this.stream=stream;call.peer=new this.Peer();this.peer=call.peer;call.audio=this.audioFactory();this.audio=call.audio;call.audio.autoplay=true;call.audio.playsInline=true;call.audio.setAttribute?.('playsinline','');
  call.peer.ontrack=e=>{if(!this.live(call))return;call.audio.srcObject=e.streams[0];call.audio.play().catch(()=>{if(this.live(call))this.status('tap_audio');});};
  call.peer.onconnectionstatechange=()=>{if(!this.live(call))return;clearTimeout(call.reconnectTimer);if(call.peer.connectionState==='failed')this.end('failed');else if(call.peer.connectionState==='disconnected')call.reconnectTimer=setTimeout(()=>{if(this.live(call)&&call.peer.connectionState!=='connected')this.end('failed');},2500);};
  stream.getTracks().forEach(t=>call.peer.addTrack(t,stream));const channel=call.peer.createDataChannel('oai-events');
  channel.onmessage=e=>{if(!this.live(call))return;try{const v=JSON.parse(e.data);if(v.type==='input_audio_buffer.speech_started')this.status('listening');else if(['response.output_audio.delta','output_audio_buffer.started'].includes(v.type))this.status('speaking');else if(['output_audio_buffer.stopped','output_audio_buffer.cleared'].includes(v.type))this.status('listening');else if(v.type==='error')this.end('failed');}catch{}};
  channel.onerror=()=>{if(this.live(call))this.end('failed');};channel.onopen=()=>{if(!this.live(call))return;this.status('listening');channel.send(JSON.stringify({type:'response.create',response:{instructions:payload.language==='ar'?'رحّب باختصار بلهجة فلسطينية واسأل كيف بقدر أساعدك، بدون إضافة معلومات عن المدرسة.':'Greet briefly and ask how you can help, without adding school facts.'}}));};
  const offer=await call.peer.createOffer();if(!this.live(call))return;await call.peer.setLocalDescription(offer);if(!this.live(call))return;
  const result=await this.transport({...payload,operation:'voice',voice_consent:true,sdp:offer.sdp});if(!this.live(call)){await this.revoke(result.session);return;}call.session=result.session;this.session=result.session;
  await call.peer.setRemoteDescription({type:'answer',sdp:result.sdp});if(!this.live(call))return;const limit=Number(result.max_seconds);call.timer=setTimeout(()=>{if(this.live(call))this.end('ended');},Math.min(60,Number.isFinite(limit)&&limit>0?limit:60)*1000);
 }catch(error){if(this.live(call))await this.end(error.name==='NotAllowedError'?'denied':error.message==='unsupported'?'unsupported':'failed');}}
 async resume(){const call=this.current;if(!call?.audio)return;try{await call.audio.play();if(this.live(call))this.status('listening');}catch{if(this.live(call))this.status('tap_audio');}}
 async end(reason='ended',quiet=false){const call=this.current;this.current=null;this.generation++;if(call){clearTimeout(call.timer);clearTimeout(call.reconnectTimer);call.stream?.getTracks().forEach(t=>t.stop());call.peer?.close();if(call.audio){call.audio.pause();call.audio.srcObject=null;}}this.peer=null;this.stream=null;this.audio=null;this.session=null;if(!quiet&&call)this.status(reason);await this.revoke(call?.session);}
}
