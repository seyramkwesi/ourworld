/* Community Noise Map — noise walks.
   Walk with your phone: the mic measures sound, GPS draws your route, and a reading is mapped every few seconds.
   Walks are shared to a community map (Supabase), with a feed, kudos, a weekly leaderboard, squares and badges. */
(function(){
"use strict";
const $=id=>document.getElementById(id);
const hero=$("heroBox");
const css=n=>getComputedStyle(document.documentElement).getPropertyValue(n).trim();
const reduceMotion=matchMedia("(prefers-reduced-motion:reduce)").matches;
const isPhone=()=>matchMedia("(max-width:999px)").matches;
const store={
  get(k,d){try{const v=localStorage.getItem(k);return v==null?d:JSON.parse(v)}catch(e){return d}},
  set(k,v){try{localStorage.setItem(k,JSON.stringify(v));return true}catch(e){return false}},
  del(k){try{localStorage.removeItem(k)}catch(e){}}
};
const SB_URL="https://blsfcrgovjvmxlmusndh.supabase.co";
const SB_KEY="sb_publishable_ukIWgDAJmo8zDpdvnGxPlg_UApe0g3L";
const SKEY="noisemap.settings.v2",PENDING="noisemap.pending.v1",INPROG="noisemap.inprogress.v1",PROFILE="noisemap.profile.v1",SEEN="noisemap.badges.v1";
const ZONES={res:[55,48],edu:[55,50],mix:[60,55],com:[75,65]};
const BANDS=[{max:55,name:"Quiet",v:"--b1"},{max:65,name:"Noticeable",v:"--b2"},{max:75,name:"Loud",v:"--b3"},{max:85,name:"Very loud",v:"--b4"},{max:1e9,name:"Harmful",v:"--b5"}];
const GRID=0.0015; // ≈160 m squares near the equator
const POINT_MS=5000,POINT_M=15,PRIVACY_M=150;
const CATS=["Traffic","Music & speakers","Construction","Generator","Market & vendors","Worship","Animals","Nature & quiet","Other"];
const ICON={
  "Traffic":'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linejoin="round"><path d="M4 16v-4l2-5h12l2 5v4H4Z"/><circle cx="7.5" cy="17" r="1.8"/><circle cx="16.5" cy="17" r="1.8"/><path d="M4 12h16"/></svg>',
  "Music & speakers":'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7"><rect x="6" y="3" width="12" height="18" rx="2.5"/><circle cx="12" cy="14" r="3.2"/><circle cx="12" cy="7.5" r="1.2"/></svg>',
  "Construction":'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linejoin="round"><path d="M3 20h18M6 20V9l6-5 6 5v11"/><path d="M9 20v-5h6v5M3 9h18"/></svg>',
  "Generator":'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linejoin="round"><rect x="3" y="7" width="18" height="11" rx="2"/><path d="M13 9l-3 4h4l-3 4M6 7V5h4v2"/></svg>',
  "Market & vendors":'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linejoin="round"><path d="M4 9 5.5 4h13L20 9H4ZM5 9v11h14V9"/><path d="M10 20v-6h4v6"/></svg>',
  "Worship":'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linejoin="round"><path d="M12 3c-3.5 0-5 3-5 6v5l-2 3h14l-2-3V9c0-3-1.5-6-5-6Z"/><path d="M10 20a2 2 0 0 0 4 0"/></svg>',
  "Animals":'<svg viewBox="0 0 24 24" fill="currentColor"><circle cx="7" cy="9" r="2"/><circle cx="17" cy="9" r="2"/><circle cx="10" cy="5.5" r="1.8"/><circle cx="14" cy="5.5" r="1.8"/><path d="M12 11c-3 0-5.5 4-5.5 6.5 0 1.6 1.3 2.5 3 2.5 1 0 1.6-.5 2.5-.5s1.5.5 2.5.5c1.7 0 3-.9 3-2.5C17.5 15 15 11 12 11Z"/></svg>',
  "Nature & quiet":'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linejoin="round"><path d="M5 19c0-8 5-14 15-14 0 10-6 15-14 15"/><path d="M5 19c3-4 6-6.5 10-8"/></svg>',
  "Other":'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7"><path d="M3 12c2 0 2-4 4.5-4S10 16 12 16s2.5-8 4.5-8S19 12 21 12"/></svg>'
};
const icon=c=>ICON[c]||ICON.Other;
const EMOJIS=["🎧","🚶","🏃","🦉","🐝","🦜","🌿","🔊","🎙️","🛰️","🧭","⚡","🌙","☀️","🐢","🦊"];
const PLAYICON='<svg viewBox="0 0 16 16" fill="currentColor"><path d="M4 2.5v11l9.5-5.5z"/></svg>';
const HEART='<svg viewBox="0 0 16 16" fill="currentColor"><path d="M8 14s-5.5-3.3-5.5-7.2A3 3 0 0 1 8 5a3 3 0 0 1 5.5 1.8C13.5 10.7 8 14 8 14z"/></svg>';

let settings=Object.assign({offset:100,weighting:"A",zone:"res",hideEnds:true,base:"map"},store.get(SKEY,{}));
function saveSettings(){store.set(SKEY,settings)}
$("offset").value=settings.offset;$("weighting").value=settings.weighting;$("zone").value=settings.zone;$("hideEnds").checked=settings.hideEnds!==false;
$("offset").addEventListener("change",e=>{const v=parseFloat(e.target.value);if(!isNaN(v)){settings.offset=v;saveSettings();toast("Calibration saved")}});
$("weighting").addEventListener("change",e=>{settings.weighting=e.target.value;saveSettings();updateWLabel()});
$("zone").addEventListener("change",e=>{settings.zone=e.target.value;saveSettings();placeLimit();renderAll()});
$("hideEnds").addEventListener("change",e=>{settings.hideEnds=e.target.checked;saveSettings()});

/* ---------- Helpers ---------- */
const fmt1=v=>v==null||!isFinite(v)?"--":(+v).toFixed(1);
const fmt0=v=>v==null||!isFinite(v)?"--":Math.round(v);
const km=m=>(m/1000).toFixed(m<10000?2:1);
function bandOf(v){if(v==null||!isFinite(v))return{name:"Ready",v:null,hex:css("--muted")};const b=BANDS.find(b=>v<b.max);return{name:b.name,v:b.v,hex:css(b.v)}}
const isDay=ts=>{const h=new Date(ts).getHours();return h>=6&&h<22};
function limitFor(ts){const z=ZONES[settings.zone]||ZONES.res;return isDay(ts)?z[0]:z[1]}
const eAvg=arr=>{if(!arr.length)return null;let s=0;for(const v of arr)s+=Math.pow(10,v/10);return 10*Math.log10(s/arr.length)};
const mmss=s=>{s=Math.max(0,Math.floor(s));const h=Math.floor(s/3600),m=Math.floor(s%3600/60),x=String(s%60).padStart(2,"0");return h?`${h}:${String(m).padStart(2,"0")}:${x}`:`${m}:${x}`};
function esc(s){return String(s??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]))}
function ago(ts){const m=(Date.now()-new Date(ts))/6e4;if(m<1)return"just now";if(m<60)return Math.round(m)+" min ago";const h=m/60;if(h<24)return Math.round(h)+" h ago";const d=h/24;if(d<7)return Math.round(d)+" d ago";return new Date(ts).toLocaleDateString(undefined,{day:"numeric",month:"short"})}
function when(ts){const d=new Date(ts);return d.toLocaleDateString(undefined,{weekday:"short",day:"numeric",month:"short"})+" · "+d.toLocaleTimeString(undefined,{hour:"2-digit",minute:"2-digit"})}
function hav(a,b){const R=6371000,t=Math.PI/180,dLa=(b[0]-a[0])*t,dLo=(b[1]-a[1])*t,x=Math.sin(dLa/2)**2+Math.cos(a[0]*t)*Math.cos(b[0]*t)*Math.sin(dLo/2)**2;return 2*R*Math.asin(Math.sqrt(x))}
const cellOf=(la,lo)=>Math.floor(la/GRID)+":"+Math.floor(lo/GRID);
function cellsOf(path){const s=new Set();(path||[]).forEach(p=>s.add(cellOf(p[0],p[1])));return s}
const partOfDay=ts=>{const h=new Date(ts).getHours();return h<5?"Night":h<12?"Morning":h<17?"Afternoon":h<21?"Evening":"Night"};
const uid=()=>"local-"+Date.now().toString(36)+Math.random().toString(36).slice(2,7);
function updateWLabel(){const a=settings.weighting==="A";$("wLabel").textContent=a?"A-weighted":"Unweighted (Z)";$("liveUnit").textContent=a?"dB(A)":"dB(Z)";$("faceUnit").textContent=a?"dB(A)":"dB(Z)"}
updateWLabel();
let tt=null;function toast(t){const el=$("toast");el.textContent=t;el.classList.add("show");clearTimeout(tt);tt=setTimeout(()=>el.classList.remove("show"),2600)}

/* ---------- Topographic background + legend band ---------- */
(function(){try{
  const w=1200,h=1600,c=document.createElement("canvas");c.width=w;c.height=h;const g=c.getContext("2d");
  [[w*.8,h*.18],[w*.12,h*.55],[w*.7,h*.9]].forEach((ct,ci)=>{for(let k=1;k<30;k++){const base=k*24+ci*7;g.beginPath();
    for(let a=0;a<=Math.PI*2+.01;a+=Math.PI/90){const n=Math.sin(a*3+k*.35+ci)*10+Math.sin(a*5-k*.2)*6+Math.cos(a*2+ci*2)*k*1.3,r=base+n,x=ct[0]+Math.cos(a)*r*1.25,y=ct[1]+Math.sin(a)*r;a?g.lineTo(x,y):g.moveTo(x,y)}
    g.strokeStyle=k%5===0?"rgba(221,242,64,.14)":"rgba(255,255,255,.05)";g.lineWidth=1;g.stroke()}});
  document.documentElement.style.setProperty("--topo",`url(${c.toDataURL("image/png")})`);
}catch(e){}})();
(function(){const ul="<ul>"+BANDS.map((b,i)=>`<li><i style="background:var(${b.v})"></i>${b.name} <small>${["< 55","55–65","65–75","75–85","85+"][i]} dB</small></li>`).join("")+"</ul>";$("band").innerHTML=ul+ul+ul+ul})();

/* ---------- Data layer (Supabase). Tests can swap window.__nmData in. ---------- */
const WSEL="id,user_id,title,started_at,ended_at,duration_s,distance_m,avg_db,max_db,min_db,over_pct,n_points,n_cells,weighting,path,pins,created_at,profiles(name,emoji),kudos(user_id)";
function makeData(){
  if(!window.supabase||!window.supabase.createClient)return null;
  const sb=window.supabase.createClient(SB_URL,SB_KEY,{auth:{persistSession:true,autoRefreshToken:true,storageKey:"noisemap.auth"}});
  const ok=({data,error})=>{if(error)throw error;return data};
  return{
    async user(){const {data}=await sb.auth.getSession();return data.session?data.session.user:null},
    async signIn(){return ok(await sb.auth.signInAnonymously()).user},
    async getProfile(id){return ok(await sb.from("profiles").select("id,name,emoji,created_at").eq("id",id).maybeSingle())},
    async saveProfile(p){return ok(await sb.from("profiles").upsert(p).select("id,name,emoji,created_at").single())},
    async feed(n){const since=new Date(Date.now()-90*864e5).toISOString();return ok(await sb.from("walks").select(WSEL).gte("started_at",since).order("started_at",{ascending:false}).limit(n))},
    async mine(u){return ok(await sb.from("walks").select(WSEL).eq("user_id",u).order("started_at",{ascending:false}).limit(500))},
    async insertWalk(w){return ok(await sb.from("walks").insert(w).select(WSEL).single())},
    async deleteWalk(id){ok(await sb.from("walks").delete().eq("id",id));return true},
    async kudos(id,u,on){if(on)ok(await sb.from("kudos").insert({walk_id:id}));else ok(await sb.from("kudos").delete().eq("walk_id",id).eq("user_id",u));return true},
    async board(){return ok(await sb.from("leaderboard_week").select("*"))}
  };
}
const DATA=window.__nmData||makeData();

/* ---------- State ---------- */
let me=store.get(PROFILE,null);           // {id,name,emoji,created_at}
let feedWalks=[],myWalks=[],boardRows=[],pending=store.get(PENDING,[]);
let feedState="loading",boardState="loading",boardMetric="distance_m",view="walk",detailWalk=null;
const clips=new Map();                    // walk id → in-memory audio clip (this session only)

/* ---------- Views ---------- */
function go(v){
  if(v==="map"){if(!isPhone()){map.invalidateSize();return}document.body.classList.add("mapmode");setTimeout(()=>map.invalidateSize(),30)}
  else{
    document.body.classList.remove("mapmode");
    document.querySelectorAll(".view").forEach(s=>s.hidden=s.dataset.view!==v);
    view=v;$("center").scrollTop=0;if(isPhone())window.scrollTo(0,0);
    if(v==="feed")renderFeed();if(v==="board"){renderBoard();loadBoard()}if(v==="you")renderYou();
  }
  const cur={summary:"walk",detail:"feed"}[v]||v;
  document.querySelectorAll(".rbtn[data-go],.tab[data-go]").forEach(b=>{if(b.dataset.go===cur)b.setAttribute("aria-current","page");else b.removeAttribute("aria-current")});
}
document.querySelectorAll("[data-go]").forEach(b=>b.addEventListener("click",()=>go(b.dataset.go)));

/* ---------- Sheets (in-page dialogs) ---------- */
function sheet(html,onMount){
  const host=$("sheetHost");host.innerHTML=`<div class="sheetwrap" role="dialog" aria-modal="true"><div class="sheet">${html}</div></div>`;
  const wrap=host.firstElementChild,close=()=>{host.innerHTML=""};
  wrap.addEventListener("click",e=>{if(e.target===wrap)close()});
  document.addEventListener("keydown",function k(e){if(e.key==="Escape"){close();document.removeEventListener("keydown",k)}});
  onMount&&onMount(wrap,close);
  const f=wrap.querySelector("input,button");f&&f.focus();
  return close;
}
function profileSheet(reason){return new Promise(resolve=>{
  let pick=(me&&me.emoji)||EMOJIS[Math.floor(Math.random()*EMOJIS.length)];
  sheet(`<h3>${me?"Edit profile":"Join the walkers"}</h3><p>${reason||"Pick a walker name and avatar. This is how you'll appear on the community map and leaderboard. No email needed."}</p>
    <div class="field"><label for="pfName">Walker name</label><input id="pfName" maxlength="24" placeholder="e.g. Osu Night Owl" value="${esc(me?me.name:"")}"></div>
    <div class="emojis" role="group" aria-label="Avatar">${EMOJIS.map(e=>`<button type="button" aria-pressed="${e===pick}">${e}</button>`).join("")}</div>
    <p class="err" id="pfErr" hidden></p>
    <button class="primary" type="button" id="pfGo">${me?"Save":"Join & save walk"}</button>
    <button class="ghostbtn" type="button" id="pfLater">${me?"Cancel":"Not now · keep on this phone"}</button>`,(w,close)=>{
    w.querySelectorAll(".emojis button").forEach(b=>b.addEventListener("click",()=>{pick=b.textContent;w.querySelectorAll(".emojis button").forEach(x=>x.setAttribute("aria-pressed",x===b))}));
    w.querySelector("#pfLater").addEventListener("click",()=>{close();resolve(false)});
    w.querySelector("#pfGo").addEventListener("click",async()=>{
      const name=w.querySelector("#pfName").value.trim(),err=w.querySelector("#pfErr");
      if(name.length<2){err.hidden=false;err.textContent="Use at least 2 characters.";return}
      const btn=w.querySelector("#pfGo");btn.disabled=true;btn.textContent="Joining…";
      try{
        if(!DATA)throw new Error("offline");
        let u=await DATA.user();if(!u)u=await DATA.signIn();
        me=await DATA.saveProfile({id:u.id,name,emoji:pick});store.set(PROFILE,me);
        close();resolve(true);toast(`Welcome, ${me.name}`);renderYou();flushPending();
      }catch(e){
        btn.disabled=false;btn.textContent=me?"Save":"Join & save walk";err.hidden=false;
        err.textContent=/anonymous/i.test(e.message||"")?"Sign-ups are switched off on the server right now. Your walk will stay on this phone.":/fetch|network|offline/i.test(e.message||"")?"You're offline. Your walk will stay on this phone and upload later.":"Couldn't join: "+(e.message||"unknown error");
      }
    });
  });
})}
$("btnEditProfile").addEventListener("click",()=>profileSheet());

/* ---------- Radial gain meter ---------- */
const GMIN=30,GMAX=110,GA=135,GN=40,GC=150;
const gAng=db=>-GA+(Math.min(GMAX,Math.max(GMIN,db))-GMIN)/(GMAX-GMIN)*GA*2;
const polar=(deg,r)=>{const a=(deg-90)*Math.PI/180;return[GC+Math.cos(a)*r,GC+Math.sin(a)*r]};
const leds=[];
(function(){
  const ns="http://www.w3.org/2000/svg",g=$("ledRing");
  for(let i=0;i<GN;i++){const db=GMIN+(i+.5)*(GMAX-GMIN)/GN,a=gAng(db),[x1,y1]=polar(a,114),[x2,y2]=polar(a,131);
    const l=document.createElementNS(ns,"line");l.setAttribute("x1",x1.toFixed(2));l.setAttribute("y1",y1.toFixed(2));l.setAttribute("x2",x2.toFixed(2));l.setAttribute("y2",y2.toFixed(2));
    l.setAttribute("stroke","#22221f");l.setAttribute("stroke-width","6.5");l.setAttribute("stroke-linecap","round");l.setAttribute("class","lseg");g.appendChild(l);leds.push({el:l,db,on:null})}
  const lb=$("ledLabels");for(let v=30;v<=110;v+=20){const[x,y]=polar(gAng(v),101);const t=document.createElementNS(ns,"text");t.setAttribute("x",x.toFixed(1));t.setAttribute("y",(y+3).toFixed(1));t.textContent=v;lb.appendChild(t)}
  const kn=$("knurl");for(let i=0;i<48;i++){const a=i*7.5,[x1,y1]=polar(a,70),[x2,y2]=polar(a,76);const l=document.createElementNS(ns,"line");l.setAttribute("x1",x1.toFixed(2));l.setAttribute("y1",y1.toFixed(2));l.setAttribute("x2",x2.toFixed(2));l.setAttribute("y2",y2.toFixed(2));kn.appendChild(l)}
})();
function arcPath(d0,d1,r){const a0=gAng(d0),a1=gAng(d1),[x0,y0]=polar(a0,r),[x1,y1]=polar(a1,r);return`M${x0.toFixed(1)} ${y0.toFixed(1)} A${r} ${r} 0 ${a1-a0>180?1:0} 1 ${x1.toFixed(1)} ${y1.toFixed(1)}`}
function lightTo(lvl,pk){leds.forEach(s=>{const on=lvl!=null&&s.db<=lvl,isPk=pk!=null&&Math.abs(s.db-pk)<(GMAX-GMIN)/GN/2&&pk>lvl;const c=isPk?"#f4f2e9":on?bandOf(s.db).hex:"#22221f";if(c!==s.on){s.on=c;s.el.setAttribute("stroke",c)}})}
let pkL=null,pkT=0,sweeping=false;
function drawMeter(lvl){
  if(sweeping)return;const now=performance.now();
  if(lvl==null)pkL=null;else if(pkL==null||lvl>=pkL){pkL=lvl;pkT=now}else if(now-pkT>1500)pkL=Math.max(lvl,pkL-2);
  lightTo(lvl,pkL);$("knob").style.transform=`rotate(${gAng(lvl==null?GMIN:lvl)}deg)`;
}
drawMeter(null);
function sweep(up){return new Promise(res=>{
  if(reduceMotion){lightTo(null,null);res();return}
  sweeping=true;const t0=performance.now(),dur=520;
  const step=t=>{const k=Math.min(1,(t-t0)/dur),e=up?(k<.5?k*2:2-k*2):1-k,lvl=GMIN+(GMAX-GMIN)*e;
    lightTo(e<=0.001?null:lvl,null);$("knob").style.transform=`rotate(${gAng(lvl)}deg)`;
    if(k<1)requestAnimationFrame(step);else{sweeping=false;lightTo(null,null);res()}};
  requestAnimationFrame(step)})}
function placeLimit(){
  const lim=limitFor(Date.now());$("limitPill").textContent=`Limit ${lim} dB · ${isDay(Date.now())?"day":"night"}`;
  const a=gAng(lim),[x,y]=polar(a,136);
  $("limMark").innerHTML=`<path d="M${x.toFixed(1)} ${y.toFixed(1)} l-4 -7 h8 Z" fill="#ff4b3e" transform="rotate(${a} ${x.toFixed(1)} ${y.toFixed(1)})"/><line x1="${polar(a,112)[0].toFixed(1)}" y1="${polar(a,112)[1].toFixed(1)}" x2="${polar(a,133)[0].toFixed(1)}" y2="${polar(a,133)[1].toFixed(1)}" stroke="#ff4b3e" stroke-width="1.4" stroke-dasharray="2 2"/>`;
}
placeLimit();

/* ---------- Audio input ---------- */
let ctx=null,stream=null,analyser=null,timeBuf,freqBuf,aw=null,timer=null,wakeLock=null,disp=null,liveHist=[];
function aWeight(f){if(f<=0)return 0;const f2=f*f;const ra=(12194**2*f2*f2)/((f2+20.6**2)*Math.sqrt((f2+107.7**2)*(f2+737.9**2))*(f2+12194**2));return Math.pow(10,(20*Math.log10(ra)+2)/10)}
async function startMic(){
  if(!navigator.mediaDevices||!navigator.mediaDevices.getUserMedia){hint("This browser can't open the microphone. Open the app over https:// in Chrome or Safari.",true);return false}
  try{stream=await navigator.mediaDevices.getUserMedia({audio:{echoCancellation:false,noiseSuppression:false,autoGainControl:false}})}
  catch(e){hint("Microphone access was blocked. Allow it in your browser's site settings, then tap Start again.",true);return false}
  ctx=new(window.AudioContext||window.webkitAudioContext)();
  const src=ctx.createMediaStreamSource(stream);analyser=ctx.createAnalyser();analyser.fftSize=4096;analyser.smoothingTimeConstant=0;src.connect(analyser);
  timeBuf=new Float32Array(analyser.fftSize);freqBuf=new Float32Array(analyser.frequencyBinCount);aw=new Float32Array(analyser.frequencyBinCount);
  const binHz=ctx.sampleRate/analyser.fftSize;for(let i=0;i<aw.length;i++)aw[i]=aWeight(i*binHz);
  timer=setInterval(tick,125);
  try{if("wakeLock" in navigator)wakeLock=await navigator.wakeLock.request("screen")}catch(e){}
  return true;
}
function stopMic(){
  clearInterval(timer);timer=null;
  if(stream)stream.getTracks().forEach(t=>t.stop());if(ctx)ctx.close();ctx=null;stream=null;
  try{wakeLock&&wakeLock.release()}catch(e){}wakeLock=null;disp=null;
  $("live").textContent="—";$("faceNum").textContent="00";hero.classList.remove("live");drawMeter(null);
}
document.addEventListener("visibilitychange",async()=>{if(document.visibilityState==="visible"&&walk&&!wakeLock&&"wakeLock" in navigator){try{wakeLock=await navigator.wakeLock.request("screen")}catch(e){}}});
function tick(){
  analyser.getFloatTimeDomainData(timeBuf);
  let sq=0;for(let i=0;i<timeBuf.length;i++)sq+=timeBuf[i]*timeBuf[i];
  let lvl=20*Math.log10(Math.max(Math.sqrt(sq/timeBuf.length),1e-9))+settings.offset;
  if(settings.weighting==="A"){analyser.getFloatFrequencyData(freqBuf);let p=0,pa=0;for(let i=1;i<freqBuf.length;i++){const v=freqBuf[i];if(!isFinite(v))continue;const e=Math.pow(10,v/10);p+=e;pa+=e*aw[i]}if(p>0&&pa>0)lvl+=10*Math.log10(pa/p)}
  lvl=Math.max(0,lvl);
  disp=(disp==null||lvl>=disp)?lvl:Math.max(lvl,disp-3);
  drawMeter(disp);
  const t=disp.toFixed(0);$("live").textContent=t;$("faceNum").textContent=t.padStart(2,"0");hero.classList.add("live");
  const b=bandOf(disp);$("bandPill").textContent=b.name;$("scrBand").textContent=b.name.toUpperCase();$("scrBand").style.fill=b.hex;
  document.querySelector(".t-live").style.setProperty("--bc",b.v?`var(${b.v})`:"");
  hero.style.setProperty("--rc",b.v?`var(${b.v})`:"#ff3b30");hero.style.setProperty("--ro",Math.min(.75,Math.max(.12,(disp-40)/55)).toFixed(2));
  liveHist.push(disp);if(liveHist.length>120)liveHist.shift();drawSpark();
  if(walk&&walk.active){const e=Math.pow(10,lvl/10);walk.eSum+=e;walk.n++;walk.winE+=e;walk.winN++;if(lvl>walk.max)walk.max=lvl}
}
function drawSpark(){
  const W=300,H=70,y=v=>H-Math.min(1,Math.max(0,(v-30)/80))*H,lim=y(limitFor(Date.now()));
  $("sparkLim").setAttribute("y1",lim);$("sparkLim").setAttribute("y2",lim);
  $("spark").style.color=getComputedStyle(document.querySelector(".t-live")).getPropertyValue("--bc")||"#8c8a85";
  $("sparkEmpty").hidden=liveHist.length>1;
  if(liveHist.length<2){$("sparkLine").setAttribute("d","");$("sparkFill").setAttribute("d","");return}
  const n=liveHist.length,pts=liveHist.map((v,i)=>[(W*(i+(120-n))/119).toFixed(1),y(v).toFixed(1)]),d="M"+pts.map(p=>p.join(" ")).join(" L");
  $("sparkLine").setAttribute("d",d);$("sparkFill").setAttribute("d",d+` L${pts[n-1][0]} ${H} L${pts[0][0]} ${H} Z`);
}
function hint(t,err){$("micMsg").textContent=t;$("micMsg").className="hint"+(err?" err":"")}

/* ---------- Walk engine ---------- */
let walk=null,pointTimer=null,uiTimer=null,watchId=null,lastFix=null,saveTimer=null;
function newWalk(){return{started:Date.now(),elapsed:0,resumeAt:performance.now(),active:true,eSum:0,n:0,max:0,winE:0,winN:0,dist:0,last:null,lastPointT:0,lastPointAt:null,path:[],pins:[],weighting:settings.weighting}}
const walkSecs=()=>walk?(walk.elapsed+(walk.active?performance.now()-walk.resumeAt:0))/1000:0;
function walkAvg(w){return w&&w.n?10*Math.log10(w.eSum/w.n):null}
async function startWalk(){
  if(walk)return;
  if(pendingSummary&&!confirmLeaveSummary())return;
  hint("Starting… allow microphone and location when asked.");
  $("btnStart").disabled=true;
  const [ok]=await Promise.all([ctx?Promise.resolve(true):startMic(),sweep(true)]);
  $("btnStart").disabled=false;
  if(!ok)return;
  walk=newWalk();liveHist=[];startGPS();clipStart();
  pointTimer=setInterval(maybePoint,1000);uiTimer=setInterval(updateWalkUI,500);saveTimer=setInterval(saveProgress,10000);
  hero.classList.add("recording");setWalkUI();updateWalkUI();clearLiveTrail();
  hint("Walking. Hold the phone out, mic uncovered. Tap Pin source to mark what you hear.");
  toast("Walk started · GO!");
  if(isPhone())setTimeout(()=>toast("Tip: the Map tab shows your trail live"),2800);
}
function togglePause(){
  if(!walk)return;
  if(walk.active){walk.elapsed+=performance.now()-walk.resumeAt;walk.active=false;flushWindow();walk.last=null;clipPause();hero.classList.remove("recording");toast("Paused")}
  else{walk.resumeAt=performance.now();walk.active=true;clipResume();hero.classList.add("recording");toast("Resumed")}
  setWalkUI();updateWalkUI();
}
let finishArmed=0;
async function finishWalk(){
  if(!walk)return;
  if(Date.now()-finishArmed>3000){finishArmed=Date.now();$("btnFinish").classList.add("armed");$("finishLbl").textContent="Tap again";setTimeout(()=>{$("btnFinish").classList.remove("armed");$("finishLbl").textContent="Finish"},3000);return}
  finishArmed=0;$("btnFinish").classList.remove("armed");$("finishLbl").textContent="Finish";
  if(walk.active){walk.elapsed+=performance.now()-walk.resumeAt;walk.active=false}
  flushWindow(true);
  clearInterval(pointTimer);clearInterval(uiTimer);clearInterval(saveTimer);stopGPS();
  await clipStop();stopMic();hero.classList.remove("recording");sweep(false);
  const w=walk;walk=null;store.del(INPROG);setWalkUI();
  if(w.elapsed<20000||w.n<20){toast("Too short to save. Walk at least 20 seconds.");resetWalkUI();return}
  openSummary(buildWalk(w));
}
function flushWindow(force){
  if(!walk||!walk.winN)return;
  if(!lastFix){if(force){walk.winE=0;walk.winN=0}return}
  const db=10*Math.log10(walk.winE/walk.winN),t=Math.round(walkSecs());
  walk.path.push([+lastFix[0].toFixed(5),+lastFix[1].toFixed(5),+db.toFixed(1),t]);
  walk.winE=0;walk.winN=0;walk.lastPointT=performance.now();walk.lastPointAt=[lastFix[0],lastFix[1]];
  addLiveSeg();
}
function maybePoint(){
  if(!walk||!walk.active||!lastFix||!walk.winN)return;
  const due=performance.now()-walk.lastPointT>=POINT_MS,moved=walk.lastPointAt&&hav(walk.lastPointAt,lastFix)>=POINT_M&&walk.winN>=8;
  if(due||moved)flushWindow();
}
function startGPS(){
  if(!navigator.geolocation){hint("This device has no GPS. Sound is measured, but nothing can be mapped.",true);return}
  if(watchId!=null)return;$("btnLocate").classList.add("on");
  watchId=navigator.geolocation.watchPosition(p=>{
    const{latitude:la,longitude:lo,accuracy:ac}=p.coords,fix=[la,lo],now=p.timestamp||Date.now();
    showMe(la,lo,ac);
    if(ac>60&&lastFix)return;
    if(walk&&walk.active){
      if(walk.last){const d=hav(walk.last.f,fix),dt=Math.max(1,(now-walk.last.t)/1000);if(d>=3&&d/dt<12){walk.dist+=d;walk.last={f:fix,t:now}}}
      else walk.last={f:fix,t:now};
    }
    lastFix=fix;
    if(walk&&!walk.centered){walk.centered=true;map.setView(fix,Math.max(map.getZoom(),16))}
  },err=>{if(err.code===1){hint("Location is blocked, so your walk can't be mapped. Allow location in site settings.",true);stopGPS()}},{enableHighAccuracy:true,maximumAge:3000,timeout:30000});
}
function stopGPS(){if(watchId!=null){navigator.geolocation.clearWatch(watchId);watchId=null}$("btnLocate").classList.remove("on")}
function setWalkUI(){
  const on=!!walk;$("ctlIdle").hidden=on;$("ctlWalk").hidden=!on;
  const paused=on&&!walk.active;$("icPause").hidden=paused;$("icResume").hidden=!paused;$("pauseLbl").textContent=paused?"Resume":"Pause";
  const sp=$("statusPill");sp.className="pill "+(on?(paused?"sky":"red rec"):"lime");$("statusTxt").textContent=on?(paused?"Paused":"Walking"):"Ready";
  document.body.classList.toggle("is-walking",on);
  $("deck").setAttribute("aria-label",on?(paused?"Resume walk":"Pause walk"):"Tap to start a walk");
}
function updateWalkUI(){
  if(!walk)return;
  const s=walkSecs(),avg=walkAvg(walk),pts=walk.path;
  $("stDist").textContent=km(walk.dist);$("stTime").textContent=mmss(s);$("stAvg").textContent=avg==null?"--":avg.toFixed(0);$("stPts").textContent=pts.length;
  $("scrState").textContent=(walk.active?"● WALK · ":"PAUSED · ")+mmss(s);
  const p=Math.min(1,walk.dist/1000);$("ringFill").style.strokeDashoffset=(207.35*(1-p)).toFixed(1);$("ringTxt").textContent=Math.round(p*100)+"%";
  $("progRing").style.strokeDashoffset=(885.9*(1-p)).toFixed(1);
  const la=$("leqArc");if(avg!=null){la.setAttribute("d",arcPath(GMIN,Math.max(GMIN+.5,avg),89));la.setAttribute("opacity","1")}
  const dbs=pts.map(x=>x[2]);
  $("sMax").textContent=dbs.length?fmt1(Math.max(...dbs)):"--";$("sMin").textContent=dbs.length?fmt1(Math.min(...dbs)):"--";
  drawBars(dbs.slice(-24));
  const cs=cellsOf(pts),mine=myCells();let nw=0;cs.forEach(c=>{if(!mine.has(c))nw++});$("sSq").textContent=cs.size;$("sSqNew").textContent=nw+" new";
  drawVerdict(pts,avg);
}
function resetWalkUI(){
  ["stAvg"].forEach(i=>$(i).textContent="--");$("stDist").textContent="0.00";$("stTime").textContent="0:00";$("stPts").textContent="0";
  $("scrState").textContent="TAP TO START";$("scrBand").textContent="READY";$("scrBand").style.fill="";
  $("ringFill").style.strokeDashoffset="207.35";$("ringTxt").textContent="0%";$("progRing").style.strokeDashoffset="885.9";$("leqArc").setAttribute("opacity","0");
  $("sMax").textContent="--";$("sMin").textContent="--";$("sSq").textContent="0";$("sSqNew").textContent="0 new";drawBars([]);drawVerdict([],null);
  liveHist=[];drawSpark();hint("Tap Start, put the phone in your hand (not your pocket) and walk. A reading is mapped every few seconds.");
}
function drawBars(vals){
  const wrap=$("peakBars"),top=Math.max(...vals,0);while(wrap.children.length<24)wrap.appendChild(document.createElement("i"));
  [...wrap.children].forEach((el,i)=>{const v=vals[i-(24-vals.length)];el.style.setProperty("--h",v==null?"6%":Math.max(6,Math.min(100,(v-30)/80*100)).toFixed(0)+"%");el.classList.toggle("top",v!=null&&v===top&&top>0)});
}
function drawVerdict(pts,avg){
  const lim=limitFor(Date.now()),wh=isDay(Date.now())?"day":"night",el=$("verdict");
  $("gLim").style.left=((lim-30)/80*100)+"%";$("gLim").dataset.l=lim+" limit";
  if(!pts.length||avg==null){el.className="tile t-verdict wide";$("vTitle").textContent="Walk to see how your streets compare";$("vText").textContent=`Every point is checked against the ${lim} dB ${wh} limit.`;$("gFill").style.width="0";$("vTip").hidden=true;return}
  const over=pts.filter(p=>p[2]>limitFor(walk?walk.started:Date.now())).length,pct=Math.round(over/pts.length*100);
  $("gFill").style.width=Math.max(2,Math.min(100,(avg-30)/80*100))+"%";
  el.className="tile t-verdict wide "+(pct>=50?"bad":"good");
  $("vTitle").textContent=`${pct}% of your route is over the limit`;
  $("vText").textContent=`${over} of ${pts.length} points above ${lim} dB · walk average ${avg.toFixed(1)} dB.`;
  const mx=Math.max(...pts.map(p=>p[2])),tip=mx>=85?"<b>Did you know?</b> Around 85 dB and above, long exposure can damage hearing. At 100 dB the safe time is about 15 minutes (NIOSH).":
    wh==="night"&&pct>0?"<b>Did you know?</b> WHO guidance for sleep is about 45 dB outside at night, so people can sleep with windows open.":
    pct>=50?"<b>Did you know?</b> Every 10 dB sounds about twice as loud. Busy roads often sit 15–20 dB above the limit.":"<b>Did you know?</b> Quiet streets matter too: they show where the calm is, and what's worth protecting.";
  const vt=$("vTip");if(vt.dataset.t!==tip){vt.innerHTML=tip;vt.dataset.t=tip}vt.hidden=false;
}
function saveProgress(){if(!walk)return;store.set(INPROG,{started:walk.started,secs:walkSecs(),dist:walk.dist,eSum:walk.eSum,n:walk.n,max:walk.max,path:walk.path,pins:walk.pins,weighting:walk.weighting,saved:Date.now()})}
window.addEventListener("pagehide",saveProgress);

/* Knob + controls */
$("btnStart").addEventListener("click",startWalk);
$("deck").addEventListener("click",()=>walk?togglePause():startWalk());
$("btnPause").addEventListener("click",togglePause);
$("btnFinish").addEventListener("click",finishWalk);
$("btnPin").addEventListener("click",()=>{
  if(!walk)return;
  sheet(`<h3>Pin a source</h3><p>What are you hearing right now? The pin is dropped where you are, with the current level${disp!=null?` (${disp.toFixed(0)} dB)`:""}.</p>
    <div class="catgrid">${CATS.map(c=>`<button type="button" data-c="${esc(c)}">${icon(c)}${esc(c)}</button>`).join("")}</div>
    <div class="field"><label for="pinNote">Note (optional)</label><input id="pinNote" maxlength="80" placeholder="e.g. speakers on the pavement"></div>`,(w,close)=>{
    w.querySelectorAll(".catgrid button").forEach(b=>b.addEventListener("click",()=>{
      if(!lastFix){toast("Waiting for GPS · try again in a moment");return}
      walk.pins.push({lat:+lastFix[0].toFixed(5),lng:+lastFix[1].toFixed(5),cat:b.dataset.c,db:disp!=null?+disp.toFixed(1):null,note:w.querySelector("#pinNote").value.trim().slice(0,80),t:Math.round(walkSecs())});
      close();toast(`Pinned: ${b.dataset.c}`);addLivePin(walk.pins[walk.pins.length-1]);
    }))});
});

/* ---------- Build / summarise a walk ---------- */
function buildWalk(w){
  const path=w.path,dbs=path.map(p=>p[2]),start=new Date(w.started),secs=w.secs!=null?w.secs:w.elapsed/1000;
  const over=path.filter(p=>p[2]>limitFor(w.started)).length;
  return{id:uid(),local:true,title:`${partOfDay(w.started)} noise walk`,started_at:start.toISOString(),ended_at:new Date(w.started+secs*1000).toISOString(),
    duration_s:Math.round(secs),distance_m:Math.round(w.dist),avg_db:w.n?+(10*Math.log10(w.eSum/w.n)).toFixed(1):null,max_db:w.max?+w.max.toFixed(1):(dbs.length?Math.max(...dbs):null),
    min_db:dbs.length?Math.min(...dbs):null,over_pct:path.length?+(over/path.length*100).toFixed(1):0,n_points:path.length,n_cells:cellsOf(path).size,weighting:w.weighting||"A",path,pins:w.pins||[]};
}
function trimEnds(path,pins){
  if(path.length<3)return{path:[],pins:[]};
  const a=path[0],b=path[path.length-1],far=p=>hav([p[0],p[1]],[a[0],a[1]])>PRIVACY_M&&hav([p[0],p[1]],[b[0],b[1]])>PRIVACY_M;
  return{path:path.filter(far),pins:pins.filter(q=>far([q.lat,q.lng]))};
}
let pendingSummary=null,clipForSummary=null;
function confirmLeaveSummary(){toast("Save or discard your last walk first");go("summary");return false}
function openSummary(w){
  pendingSummary=w;clipForSummary=currentClip;currentClip=null;
  $("sumTitle").value=w.title;$("sumWhen").textContent=when(w.started_at);
  const prev=myCells(),cs=cellsOf(w.path);let nw=0;cs.forEach(c=>{if(!prev.has(c))nw++});w._new=nw;
  $("sumGrid").innerHTML=statGrid(w,true);
  $("sumTrail").innerHTML=trailSVG(w.path,640,400,w.pins);
  const before=badgeState(allMine()),after=badgeState([w,...allMine()]),fresh=BADGES.filter(b=>after[b.id]&&!before[b.id]);
  $("sumBadgesHead").hidden=!fresh.length;$("sumBadges").innerHTML=fresh.map(b=>badgeHTML(b,true,true)).join("");
  $("saveMsg").textContent="";$("saveMsg").className="msg";$("btnSaveWalk").disabled=false;$("btnSaveWalk").textContent=me?"Save & share with community":"Join & share with community";
  renderClipCard();go("summary");resetWalkUI();
  if(fresh.length)setTimeout(()=>toast(`Badge unlocked: ${fresh[0].name}`),500);
}
function statGrid(w,isNew){
  const over=w.over_pct!=null?Math.round(w.over_pct):"--";
  return `<div><b>${km(w.distance_m)}<small>km</small></b><span>Distance</span></div><div><b>${mmss(w.duration_s)}</b><span>Time</span></div><div><b>${fmt0(w.avg_db)}<small>dB</small></b><span>Average</span></div>
    <div><b>${fmt0(w.max_db)}<small>dB</small></b><span>Loudest</span></div><div><b>${over}<small>%</small></b><span>Over limit</span></div>
    <div><b>${w.n_cells||0}</b><span>${isNew&&w._new!=null?`Squares · ${w._new} new`:"Squares"}</span></div>`;
}
$("sumTitle").addEventListener("input",e=>{if(pendingSummary)pendingSummary.title=e.target.value.trim()||pendingSummary.title});
let discardArmed=0;
$("btnDiscard").addEventListener("click",()=>{
  if(Date.now()-discardArmed>3000){discardArmed=Date.now();$("btnDiscard").textContent="Tap again to discard";setTimeout(()=>$("btnDiscard").textContent="Discard walk",3000);return}
  freeClip(clipForSummary);clipForSummary=null;pendingSummary=null;$("btnDiscard").textContent="Discard walk";toast("Walk discarded");go("walk");
});
$("btnSaveWalk").addEventListener("click",async()=>{
  const w=pendingSummary;if(!w)return;
  w.title=($("sumTitle").value.trim()||w.title).slice(0,60);
  if(!me){const joined=await profileSheet("Pick a walker name to share this walk on the community map and leaderboard. No email needed.");if(!joined){keepLocal(w,"Saved on this phone. Join any time from You to share it.");return}}
  const btn=$("btnSaveWalk");btn.disabled=true;btn.textContent="Uploading…";
  try{
    const saved=await uploadWalk(w);
    attachClip(saved.id);pendingSummary=null;myWalks.unshift(saved);feedWalks.unshift(saved);
    toast("Walk shared · it's on the community map");renderAll();openDetail(saved,true);
  }catch(e){keepLocal(w,"You're offline or the server didn't answer. Saved on this phone; it will upload automatically.")}
});
function keepLocal(w,msg){
  pending.unshift(w);store.set(PENDING,pending);attachClip(w.id);pendingSummary=null;
  toast(msg);renderAll();openDetail(w,true);
}
function attachClip(id){if(clipForSummary){clips.set(id,clipForSummary);clipForSummary=null}}
async function uploadWalk(w){
  if(!DATA||!me)throw new Error("not ready");
  const pub=settings.hideEnds!==false?trimEnds(w.path,w.pins):{path:w.path,pins:w.pins};
  const row={title:w.title,started_at:w.started_at,ended_at:w.ended_at,duration_s:w.duration_s,distance_m:w.distance_m,avg_db:w.avg_db,max_db:w.max_db,min_db:w.min_db,
    over_pct:w.over_pct,n_points:w.n_points,n_cells:w.n_cells,weighting:w.weighting,path:pub.path,pins:pub.pins};
  return await DATA.insertWalk(row);
}
async function flushPending(){
  if(!me||!pending.length||!DATA)return;
  const left=[];let up=0;
  for(const w of pending.slice().reverse()){try{const s=await uploadWalk(w);if(clips.has(w.id)){clips.set(s.id,clips.get(w.id));clips.delete(w.id)}myWalks.unshift(s);feedWalks.unshift(s);up++}catch(e){left.unshift(w)}}
  pending=left;store.set(PENDING,pending);if(up){toast(`${up} saved walk${up>1?"s":""} uploaded`);renderAll()}
}
window.addEventListener("online",()=>{flushPending();loadFeed()});

/* Recovery banner */
(function(){const r=store.get(INPROG,null);if(!r)return;
  if(Date.now()-r.saved>12*36e5||!r.path||!r.path.length){store.del(INPROG);return}
  $("resumeBanner").hidden=false;$("resumeTxt").textContent=`Unfinished walk from ${new Date(r.started).toLocaleTimeString(undefined,{hour:"2-digit",minute:"2-digit"})} · ${km(r.dist)} km`;
  $("resumeReview").addEventListener("click",()=>{$("resumeBanner").hidden=true;store.del(INPROG);openSummary(buildWalk(r))});
  $("resumeDiscard").addEventListener("click",()=>{$("resumeBanner").hidden=true;store.del(INPROG);toast("Discarded")});
})();

/* ---------- Audio clip of the walk (memory only) ---------- */
const CLIP_MIME=(()=>{if(!window.MediaRecorder)return null;for(const m of["audio/webm;codecs=opus","audio/webm","audio/mp4;codecs=mp4a.40.2","audio/mp4","audio/ogg;codecs=opus"]){try{if(MediaRecorder.isTypeSupported(m))return m}catch(e){}}return""})();
let mr=null,mrChunks=[],currentClip=null;
function clipStart(){if(CLIP_MIME===null||!stream)return;try{mr=new MediaRecorder(stream,CLIP_MIME?{mimeType:CLIP_MIME,audioBitsPerSecond:32000}:undefined)}catch(e){mr=null;return}mrChunks=[];mr.ondataavailable=e=>{if(e.data&&e.data.size)mrChunks.push(e.data)};mr.start(1000)}
function clipPause(){try{mr&&mr.state==="recording"&&mr.pause()}catch(e){}}
function clipResume(){try{mr&&mr.state==="paused"&&mr.resume()}catch(e){}}
function clipStop(){return new Promise(res=>{if(!mr||mr.state==="inactive"){mr=null;res();return}const m=mr,secs=walkSecs()||(walk?walk.elapsed/1000:0);
  m.onstop=()=>{const type=(m.mimeType||CLIP_MIME||"audio/webm").split(";")[0],blob=new Blob(mrChunks,{type});if(blob.size)currentClip={blob,url:URL.createObjectURL(blob),type,ts:Date.now()};mr=null;res()};try{m.stop()}catch(e){mr=null;res()}})}
function freeClip(c){if(c)URL.revokeObjectURL(c.url)}
const audio=new Audio();audio.preload="auto";let playing=null,praf=0;
function playClip(c,cb){
  if(!c)return;
  if(playing===c&&!audio.paused){audio.pause();cancelAnimationFrame(praf);cb&&cb(audio.currentTime,"paused");return}
  if(playing!==c){audio.src=c.url;playing=c}
  audio.play().then(()=>{const t=()=>{cb&&cb(audio.currentTime,"playing",audio.duration);praf=requestAnimationFrame(t)};cancelAnimationFrame(praf);t()}).catch(()=>toast("This browser couldn't play the clip"));
  audio.onended=()=>{cancelAnimationFrame(praf);cb&&cb(0,"ended",audio.duration);playing=null};
}
function downloadClip(c){if(!c)return;const ext=/mp4/.test(c.type)?"m4a":/ogg/.test(c.type)?"ogg":"webm";const a=document.createElement("a");a.href=c.url;a.download=`noise-walk-${new Date(c.ts).toISOString().slice(0,16).replace(/[:T]/g,"-")}.${ext}`;document.body.appendChild(a);a.click();setTimeout(()=>a.remove(),300);toast("Audio downloaded")}
function renderClipCard(){
  const c=clipForSummary,card=$("clipCard");if(!c){card.hidden=true;return}card.hidden=false;
  const lv=pendingSummary?pendingSummary.path.map(p=>p[2]):[],w=$("clipWave"),N=48;
  if(w.children.length!==N){w.innerHTML="";for(let i=0;i<N;i++)w.appendChild(document.createElement("i"))}
  [...w.children].forEach((el,i)=>{const a=Math.floor(i*lv.length/N),b=Math.max(a+1,Math.floor((i+1)*lv.length/N)),v=lv.length?Math.max(...lv.slice(a,b)):40;el.style.setProperty("--h",Math.max(10,Math.min(100,(v-30)/70*100)).toFixed(0)+"%");el.classList.remove("on")});
  $("clipTime").textContent=`0:00 / ${mmss(pendingSummary?pendingSummary.duration_s:0)}`;card.classList.remove("playing");
}
$("clipPlay").addEventListener("click",()=>playClip(clipForSummary,(t,st,d)=>{const card=$("clipCard");card.classList.toggle("playing",st==="playing");const D=isFinite(d)?d:(pendingSummary?pendingSummary.duration_s:0);
  $("clipTime").textContent=`${mmss(st==="ended"?0:t)} / ${mmss(D)}`;[...$("clipWave").children].forEach((el,i)=>el.classList.toggle("on",st!=="ended"&&D>0&&i/48<t/D))}));
$("clipDl").addEventListener("click",()=>downloadClip(clipForSummary));

/* ---------- Trails (SVG) ---------- */
function trailSVG(path,W,H,pins){
  if(!path||path.length<2)return`<p class="empty" style="padding:30px 10px;text-align:center">${path&&path.length?"Only one point recorded.":"No route to show (the start and end were hidden, or GPS had no fix)."}</p>`;
  let la0=Infinity,la1=-Infinity,lo0=Infinity,lo1=-Infinity;path.forEach(p=>{la0=Math.min(la0,p[0]);la1=Math.max(la1,p[0]);lo0=Math.min(lo0,p[1]);lo1=Math.max(lo1,p[1])});
  const k=Math.cos((la0+la1)/2*Math.PI/180),dx=Math.max((lo1-lo0)*k,1e-5),dy=Math.max(la1-la0,1e-5),pad=24,sc=Math.min((W-2*pad)/dx,(H-2*pad)/dy);
  const ox=(W-dx*sc)/2,oy=(H-dy*sc)/2,X=lo=>ox+(lo-lo0)*k*sc,Y=la=>H-oy-(la-la0)*sc;
  let s=`<svg viewBox="0 0 ${W} ${H}" aria-hidden="true">`;
  s+=`<polyline points="${path.map(p=>X(p[1]).toFixed(1)+","+Y(p[0]).toFixed(1)).join(" ")}" fill="none" stroke="rgba(255,255,255,.12)" stroke-width="${W/40}" stroke-linecap="round" stroke-linejoin="round"/>`;
  for(let i=1;i<path.length;i++){const a=path[i-1],b=path[i];s+=`<line x1="${X(a[1]).toFixed(1)}" y1="${Y(a[0]).toFixed(1)}" x2="${X(b[1]).toFixed(1)}" y2="${Y(b[0]).toFixed(1)}" stroke="${bandOf(b[2]).hex}" stroke-width="${W/90}" stroke-linecap="round"/>`}
  const a=path[0],b=path[path.length-1];
  s+=`<circle cx="${X(a[1])}" cy="${Y(a[0])}" r="${W/80}" fill="#0b0b0a" stroke="#f4f2e9" stroke-width="2.5"/><circle cx="${X(b[1])}" cy="${Y(b[0])}" r="${W/70}" fill="#ddf240" stroke="#0b0b0a" stroke-width="2.5"/>`;
  (pins||[]).forEach(q=>{s+=`<circle cx="${X(q.lng)}" cy="${Y(q.lat)}" r="${W/90}" fill="#0b0b0a" stroke="#ddf240" stroke-width="2"/>`});
  return s+"</svg>";
}

/* ---------- Detail ---------- */
function openDetail(w,fresh){
  detailWalk=w;
  const mine=me&&w.user_id===me.id,local=!!w.local,p=w.profiles||(mine||local?me:null)||{name:"Walker",emoji:"🎧"};
  $("detAvatar").textContent=p.emoji||"🎧";$("detTitle").textContent=w.title;$("detWho").textContent=`${p.name||"You"} · ${when(w.started_at)}${local?" · on this phone, not uploaded yet":""}`;
  $("detGrid").innerHTML=statGrid(w);$("detTrail").innerHTML=trailSVG(w.path,640,400,w.pins);
  const pins=w.pins||[];$("detPinsHead").hidden=!pins.length;
  $("detPins").innerHTML=pins.map(q=>`<div class="item"><span class="ic">${icon(q.cat)}${q.db!=null?`<b style="background:${bandOf(q.db).hex}">${Math.round(q.db)}</b>`:""}</span><span class="t"><b>${esc(q.cat)}</b><small>${q.note?esc(q.note)+" · ":""}${mmss(q.t||0)} into the walk</small></span></div>`).join("");
  const kd=$("detKudos"),n=(w.kudos||[]).length,has=me&&(w.kudos||[]).some(k=>k.user_id===me.id);
  kd.hidden=local;kd.setAttribute("aria-pressed",!!has);kd.querySelector("span").textContent=n;kd.disabled=!!mine;kd.title=mine?"Kudos come from other walkers":"Give kudos";
  $("detDelete").hidden=!(mine||local);$("detDelete").textContent=local?"Remove from this phone":"Delete this walk";
  go("detail");if(fresh)showWalkOnMap(w);
  const c=clips.get(w.id),cb=$("detClip");cb.hidden=!c;cb.textContent="▶ Play walk audio";
}
$("detBack").addEventListener("click",()=>{selectedWalk=null;drawCommunity();go(isPhone()?"feed":"feed")});
$("detMap").addEventListener("click",()=>{if(detailWalk){showWalkOnMap(detailWalk);if(isPhone())go("map")}});
$("detClip").addEventListener("click",()=>{const c=detailWalk&&clips.get(detailWalk.id);if(!c)return;playClip(c,(t,st)=>{$("detClip").textContent=st==="playing"?`❚❚ ${mmss(t)}`:"▶ Play walk audio"})});
$("detClip").addEventListener("contextmenu",e=>{const c=detailWalk&&clips.get(detailWalk.id);if(c){e.preventDefault();downloadClip(c)}});
$("detShare").addEventListener("click",()=>detailWalk&&shareCard(detailWalk));
$("btnShareCard").addEventListener("click",()=>pendingSummary&&shareCard(Object.assign({},pendingSummary,{title:$("sumTitle").value.trim()||pendingSummary.title})));
$("detKudos").addEventListener("click",()=>detailWalk&&toggleKudos(detailWalk,$("detKudos")));
let delArmed=0;
$("detDelete").addEventListener("click",async()=>{
  const w=detailWalk;if(!w)return;
  if(Date.now()-delArmed>3000){delArmed=Date.now();$("detDelete").textContent="Tap again to delete";return}
  if(w.local){pending=pending.filter(x=>x.id!==w.id);store.set(PENDING,pending)}
  else{try{await DATA.deleteWalk(w.id)}catch(e){toast("Couldn't delete · check your connection");return}myWalks=myWalks.filter(x=>x.id!==w.id);feedWalks=feedWalks.filter(x=>x.id!==w.id)}
  if(clips.has(w.id)){freeClip(clips.get(w.id));clips.delete(w.id)}
  toast("Walk deleted");renderAll();go("you");
});
async function toggleKudos(w,btn){
  if(!me){const ok=await profileSheet("Join to give kudos to other walkers.");if(!ok)return}
  if(w.user_id===me.id)return;
  const has=(w.kudos||[]).some(k=>k.user_id===me.id);
  w.kudos=has?w.kudos.filter(k=>k.user_id!==me.id):[...(w.kudos||[]),{user_id:me.id}];
  const upd=()=>{document.querySelectorAll(`[data-kid="${w.id}"]`).forEach(b=>{b.setAttribute("aria-pressed",!has);b.querySelector("span").textContent=w.kudos.length});if(btn){btn.setAttribute("aria-pressed",!has);btn.querySelector("span").textContent=w.kudos.length}};
  upd();if(!has&&btn&&!reduceMotion){btn.classList.remove("pop");void btn.offsetWidth;btn.classList.add("pop")}
  try{await DATA.kudos(w.id,me.id,!has)}catch(e){w.kudos=has?[...w.kudos,{user_id:me.id}]:w.kudos.filter(k=>k.user_id!==me.id);upd();toast("Couldn't send kudos · check your connection")}
}

/* ---------- Feed ---------- */
function walkCard(w,showWho=true){
  const p=w.profiles||(w.local?me:null)||{name:"Walker",emoji:"🎧"},mine=me&&w.user_id===me.id,n=(w.kudos||[]).length,has=me&&(w.kudos||[]).some(k=>k.user_id===me.id);
  return `<article class="wcard" data-wid="${w.id}" tabindex="0">
    ${showWho?`<div class="whead"><span class="avatar">${esc(p.emoji||"🎧")}</span><span class="who"><b>${esc(p.name||"You")}${mine?" · you":""}</b><small>${ago(w.started_at)}</small></span></div>`:`<div class="whead"><span class="who"><b style="font:500 12px var(--mono);color:var(--muted)">${when(w.started_at)}${w.local?" · not uploaded yet":""}</b></span></div>`}
    <h4>${esc(w.title)}</h4>
    <div class="wstats"><div><b>${km(w.distance_m)}</b><span>km</span></div><div><b>${mmss(w.duration_s)}</b><span>time</span></div><div><b>${fmt0(w.avg_db)}</b><span>avg dB</span></div><div><b>${w.over_pct!=null?Math.round(w.over_pct)+"%":"--"}</b><span>over limit</span></div></div>
    <div class="wtrail">${trailSVG(w.path,400,200,w.pins)}</div>
    <div class="wfoot">${w.local?`<small>Saved on this phone</small>`:`<button class="kudos" type="button" data-kid="${w.id}" aria-pressed="${!!has}" ${mine?"disabled":""}>${HEART}<span>${n}</span></button>`}<small>${w.n_cells||0} squares · ${(w.pins||[]).length} pins</small></div>
  </article>`;
}
function wireCards(root,list){
  root.querySelectorAll(".wcard").forEach(el=>{const w=list.find(x=>String(x.id)===el.dataset.wid);if(!w)return;
    el.addEventListener("click",e=>{if(e.target.closest(".kudos"))return;openDetail(w,true)});el.addEventListener("keydown",e=>{if(e.key==="Enter")openDetail(w,true)});
    const k=el.querySelector(".kudos");k&&k.addEventListener("click",e=>{e.stopPropagation();toggleKudos(w,k)})});
}
function renderFeed(){
  const el=$("feedList"),list=uniq([...pending,...feedWalks]).sort((a,b)=>new Date(b.started_at)-new Date(a.started_at));
  if(feedState==="loading"&&!list.length){el.innerHTML=`<div class="emptybig"><b>Loading walks…</b></div>`;return}
  if(!list.length){el.innerHTML=`<div class="emptybig"><span class="avatar big">🚶</span><b>No walks yet</b><p>Be the first to map your streets. Start a walk, and it'll show up here for everyone.</p><button class="startbtn" type="button" data-go="walk" style="height:52px;font-size:14px">Start walk<span class="ar" style="width:38px;height:38px"><svg viewBox="0 0 12 12" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M3 9 9 3M4 3h5v5"/></svg></span></button></div>`;
    el.querySelector("[data-go]").addEventListener("click",()=>go("walk"));}
  else{el.innerHTML=list.map(w=>walkCard(w)).join("");wireCards(el,list)}
  $("feedNote").textContent=feedState==="error"?"Couldn't reach the community server. Showing what's on this phone.":list.length?"Walks from the last 90 days":"";
}
async function loadFeed(){
  if(!DATA){feedState="error";renderAll();return}
  try{feedWalks=await DATA.feed(120);feedState="ok"}catch(e){feedState="error"}
  renderAll();
}

/* ---------- Leaderboard ---------- */
async function loadBoard(){if(!DATA){boardState="error";renderBoard();return}try{boardRows=await DATA.board();boardState="ok"}catch(e){boardState="error"}renderBoard()}
document.querySelectorAll(".tabs3 button").forEach(b=>b.addEventListener("click",()=>{boardMetric=b.dataset.m;document.querySelectorAll(".tabs3 button").forEach(x=>x.setAttribute("aria-pressed",x===b));renderBoard()}));
function renderBoard(){
  const val=r=>boardMetric==="distance_m"?km(r.distance_m)+" km":boardMetric==="cells"?r.cells+" sq":r.walks+(r.walks===1?" walk":" walks");
  const rows=boardRows.slice().sort((a,b)=>b[boardMetric]-a[boardMetric]||b.distance_m-a.distance_m);
  const pod=$("podium"),list=$("boardList");
  if(boardState==="loading"&&!rows.length){pod.innerHTML="";list.innerHTML=`<div class="emptybig"><b>Loading…</b></div>`;return}
  if(!rows.length){pod.innerHTML="";list.innerHTML=`<div class="emptybig"><span class="avatar big">🏆</span><b>The board is empty</b><p>Nobody has walked in the last 7 days. One walk puts you on top.</p></div>`;$("boardNote").textContent=boardState==="error"?"Couldn't reach the community server.":"";return}
  const top=[rows[1],rows[0],rows[2]];
  pod.innerHTML=top.map((r,i)=>r?`<div class="pod ${i===1?"p1":""}"><span class="rk">${i===1?1:i===0?2:3}</span><span class="avatar">${esc(r.emoji)}</span><b>${esc(r.name)}</b><span class="val">${val(r)}</span></div>`:"<div></div>").join("");
  list.innerHTML=rows.slice(3).map((r,i)=>`<div class="lbrow ${me&&r.user_id===me.id?"me":""}"><span class="rk">${i+4}</span><span class="avatar">${esc(r.emoji)}</span><span class="nm">${esc(r.name)}${me&&r.user_id===me.id?" · you":""}</span><span class="val">${val(r)}</span></div>`).join("");
  const myRank=me?rows.findIndex(r=>r.user_id===me.id):-1;
  $("boardNote").textContent=myRank>=0?`You're #${myRank+1} of ${rows.length} this week`:me?"Walk this week to get on the board":"Join and walk to get on the board";
}

/* ---------- You: totals, streak, badges, records ---------- */
function uniq(a){const s=new Set();return a.filter(w=>!s.has(w.id)&&s.add(w.id))}
function allMine(){const ids=new Set(pending.map(w=>w.id));return uniq([...pending,...myWalks.filter(w=>!ids.has(w.id))])}
function myCells(){const s=new Set();allMine().forEach(w=>cellsOf(w.path).forEach(c=>s.add(c)));return s}
function dayKey(d){d=new Date(d);return d.getFullYear()+"-"+(d.getMonth()+1)+"-"+d.getDate()}
function streakOf(ws){const days=new Set(ws.map(w=>dayKey(w.started_at)));let s=0,d=new Date();if(!days.has(dayKey(d)))d.setDate(d.getDate()-1);while(days.has(dayKey(d))){s++;d.setDate(d.getDate()-1)}return s}
const BADGES=[
  {id:"first",e:"👟",name:"First steps",desc:"Finish your first walk",test:s=>s.walks>=1},
  {id:"km5",e:"🛣️",name:"5 km club",desc:"Walk 5 km in total",test:s=>s.dist>=5000},
  {id:"marathon",e:"🏅",name:"Marathon mapper",desc:"Walk 42.2 km in total",test:s=>s.dist>=42195},
  {id:"long",e:"🥾",name:"Long haul",desc:"One walk of 3 km or more",test:s=>s.longest>=3000},
  {id:"century",e:"💯",name:"Century",desc:"100 points in one walk",test:s=>s.maxPts>=100},
  {id:"sq25",e:"🧩",name:"Explorer",desc:"Map 25 squares",test:s=>s.cells>=25},
  {id:"sq100",e:"🗺️",name:"Cartographer",desc:"Map 100 squares",test:s=>s.cells>=100},
  {id:"night",e:"🦉",name:"Night owl",desc:"Walk after 10pm",test:s=>s.night},
  {id:"early",e:"🌅",name:"Early bird",desc:"Walk before 6am",test:s=>s.early},
  {id:"quiet",e:"🤫",name:"Quiet hunter",desc:"Find a spot under 45 dB",test:s=>s.minDb!=null&&s.minDb<45},
  {id:"loud",e:"📢",name:"Storm chaser",desc:"Record a point at 90 dB+",test:s=>s.maxDb>=90},
  {id:"pins",e:"📍",name:"Spotter",desc:"Pin 5 sources",test:s=>s.pins>=5},
  {id:"streak3",e:"🔥",name:"On a roll",desc:"Walk 3 days in a row",test:s=>s.streak>=3},
  {id:"walks10",e:"🎖️",name:"Regular",desc:"Finish 10 walks",test:s=>s.walks>=10}
];
function statsOf(ws){
  const cells=new Set();let dist=0,secs=0,longest=0,maxPts=0,maxDb=0,minDb=null,pins=0,night=false,early=false;
  ws.forEach(w=>{dist+=w.distance_m||0;secs+=w.duration_s||0;longest=Math.max(longest,w.distance_m||0);maxPts=Math.max(maxPts,w.n_points||0);
    (w.path||[]).forEach(p=>{cells.add(cellOf(p[0],p[1]));maxDb=Math.max(maxDb,p[2]);minDb=minDb==null?p[2]:Math.min(minDb,p[2])});pins+=(w.pins||[]).length;
    const h=new Date(w.started_at).getHours();if(h>=22)night=true;if(h>=4&&h<6)early=true});
  return{walks:ws.length,dist,secs,longest,maxPts,maxDb,minDb,pins,night,early,cells:cells.size,streak:streakOf(ws)};
}
function badgeState(ws){const s=statsOf(ws),o={};BADGES.forEach(b=>o[b.id]=!!b.test(s));return o}
function badgeHTML(b,got,isNew){return`<div class="badge ${got?"":"locked"} ${isNew?"new":""}"><span class="bi">${b.e}</span><b>${esc(b.name)}</b><small>${esc(b.desc)}</small></div>`}
function renderYou(){
  const ws=allMine(),s=statsOf(ws);
  $("youAvatar").textContent=me?me.emoji:"🎧";$("youName").textContent=me?me.name:"Walker";
  $("youSince").textContent=me?`Joined ${me.created_at?new Date(me.created_at).toLocaleDateString(undefined,{month:"short",year:"numeric"}):"recently"}`:"Not joined yet";
  $("btnEditProfile").textContent=me?"Edit name & avatar":"Join the walkers";
  $("youTotals").innerHTML=`<div><b>${km(s.dist)}<small>km</small></b><span>Distance</span></div><div><b>${s.walks}</b><span>Walks</span></div><div><b>${mmss(s.secs)}</b><span>Time</span></div>
    <div><b>${s.cells}</b><span>Squares</span></div><div><b>${s.pins}</b><span>Pins</span></div><div><b>${s.streak}<small>day${s.streak===1?"":"s"}</small></b><span>Streak</span></div>`;
  $("youStreak").textContent=s.streak?`🔥 ${s.streak}-day streak`:"";
  const st=badgeState(ws),got=BADGES.filter(b=>st[b.id]).length;$("badgeCount").textContent=`${got}/${BADGES.length}`;
  $("youBadges").innerHTML=BADGES.map(b=>badgeHTML(b,st[b.id])).join("");
  const longest=ws.slice().sort((a,b)=>b.distance_m-a.distance_m)[0],quiet=ws.filter(w=>w.min_db!=null).sort((a,b)=>a.min_db-b.min_db)[0],loud=ws.filter(w=>w.max_db!=null).sort((a,b)=>b.max_db-a.max_db)[0];
  $("youRecords").innerHTML=`<div><span>Longest walk</span><b>${longest?km(longest.distance_m)+" km":"--"}</b><small>${longest?esc(longest.title):"No walks yet"}</small></div>
    <div><span>Quietest spot</span><b>${quiet?fmt1(quiet.min_db)+" dB":"--"}</b><small>${quiet?esc(quiet.title):"Find some calm"}</small></div>
    <div><span>Loudest point</span><b>${loud?fmt1(loud.max_db)+" dB":"--"}</b><small>${loud?esc(loud.title):"—"}</small></div>`;
  drawWeekBars(ws);
  const el=$("youWalks");el.innerHTML=ws.length?ws.slice(0,20).map(w=>walkCard(w,false)).join(""):`<div class="emptybig"><b>No walks yet</b><p>Your walks will collect here, with your route, levels and kudos.</p></div>`;wireCards(el,ws);
  $("railBadge").hidden=!pending.length;$("railBadge").textContent=pending.length;
  $("acctNote").textContent=me?"Your account lives on this phone. If you clear the browser's data you'll start a new profile; past walks stay on the community map.":"You haven't joined yet. Walks you finish are kept on this phone until you join, then they upload.";
}
function drawWeekBars(ws){
  const W=400,H=150,P={l:6,r:6,t:20,b:22},n=8,start=new Date();start.setHours(0,0,0,0);start.setDate(start.getDate()-((start.getDay()+6)%7));
  const weeks=[...Array(n)].map((_,i)=>{const s=new Date(start);s.setDate(s.getDate()-7*(n-1-i));return{s,e:new Date(s.getTime()+7*864e5),m:0}});
  ws.forEach(w=>{const t=new Date(w.started_at);weeks.forEach(k=>{if(t>=k.s&&t<k.e)k.m+=w.distance_m||0})});
  const mx=Math.max(1000,...weeks.map(k=>k.m)),bw=(W-P.l-P.r)/n;
  let s="";weeks.forEach((k,i)=>{const h=(H-P.t-P.b)*k.m/mx,x=P.l+i*bw+bw*.18,y=H-P.b-h,last=i===n-1;
    s+=`<rect x="${x.toFixed(1)}" y="${(H-P.b-Math.max(h,2)).toFixed(1)}" width="${(bw*.64).toFixed(1)}" height="${Math.max(h,2).toFixed(1)}" rx="6" fill="${last?"#ddf240":"#3a3a33"}"/>`;
    if(k.m)s+=`<text x="${(x+bw*.32).toFixed(1)}" y="${(y-6).toFixed(1)}" text-anchor="middle" font-size="10" font-family="DM Mono,monospace" fill="${last?"#ddf240":"#8b8a80"}">${(k.m/1000).toFixed(1)}</text>`;
    s+=`<text x="${(x+bw*.32).toFixed(1)}" y="${H-6}" text-anchor="middle" font-size="9.5" font-family="DM Mono,monospace" fill="#8b8a80">${last?"This wk":k.s.toLocaleDateString(undefined,{day:"numeric",month:"short"})}</text>`});
  $("wbars").innerHTML=s;
}
function renderWeek(){
  const ws=allMine(),wk=Date.now()-7*864e5,mine=ws.filter(w=>new Date(w.started_at)>=wk),older=ws.filter(w=>new Date(w.started_at)<wk);
  const oldCells=new Set();older.forEach(w=>cellsOf(w.path).forEach(c=>oldCells.add(c)));const newCells=new Set();mine.forEach(w=>cellsOf(w.path).forEach(c=>{if(!oldCells.has(c))newCells.add(c)}));
  $("wkKm").innerHTML=km(mine.reduce((a,w)=>a+(w.distance_m||0),0))+"<small>km</small>";$("wkWalks").textContent=mine.length;$("wkSq").textContent=newCells.size;
  const st=streakOf(ws);$("streakTxt").textContent=st?`🔥 ${st}-day streak`:"Walk today to start a streak";
}

/* ---------- Did you know? ---------- */
const FACTS=[
  {tag:"Health",big:"85",unit:"dB",text:"Sound averaging 85 dB(A) over 8 hours can damage hearing. Every extra 3 dB halves the safe time: at 100 dB it is just 15 minutes.",why:"Red and purple stretches on your trail near speakers or machinery mean a real hearing risk for people who spend hours there.",src:"NIOSH / CDC",url:"https://blogs.cdc.gov/niosh-science-blog/2016/02/08/noise/"},
  {tag:"Health",big:"1 bn+",unit:"",text:"WHO says over 1 billion people aged 12–35 risk losing their hearing from loud music and other recreational sound. That hearing loss is permanent, but preventable.",why:"Loud events, speakers and clubs reach young people. Mapping them shows where turning it down would protect hearing.",src:"WHO / PAHO, 2022",url:"https://www.paho.org/en/news/2-3-2022-who-releases-new-standard-tackle-rising-threat-hearing-loss"},
  {tag:"Health",big:"30",unit:"dB",text:"For good sleep, WHO guidance is about 30 dB inside bedrooms, and 45 dB outside at night so people can sleep with windows open.",why:"Night walks earn the Night Owl badge and fill the biggest gap in the map: what streets sound like when people sleep.",src:"WHO Guidelines for Community Noise",url:"https://www.nonoise.org/library/whonoise/whonoise.htm"},
  {tag:"Health",big:"1 m+",unit:"years",text:"Traffic noise alone costs over 1 million healthy years of life every year in western Europe, through sleep disturbance, annoyance and heart disease.",why:"Noise is a public health issue. A community map built from thousands of points makes that visible.",src:"WHO Europe, 2011",url:"https://www.who.int/europe/news/item/30-03-2011-new-evidence-from-who-on-health-effects-of-traffic-related-noise-in-europe"},
  {tag:"Health",big:"55",unit:"dB",text:"WHO guidance: keep daytime noise in outdoor living areas below 55 dB to protect most people from serious annoyance (50 dB for moderate annoyance).",why:"55 dB is also Ghana's residential day limit, so 'over limit' on your walk is both a health signal and a breach.",src:"WHO Guidelines for Community Noise",url:"https://www.nonoise.org/library/whonoise/whonoise.htm"},
  {tag:"Ghana law",cls:"law",big:"55 / 48",unit:"dB",text:"Ghana's permissible ambient noise in residential areas is 55 dB(A) by day (6am–10pm) and 48 dB(A) at night. Commercial areas allow 75 / 65.",why:"Every point on your walk is checked against these limits. Change the area type under You → Settings.",src:"Ghana News Agency / EPA",url:"https://gna.org.gh/2023/04/noise-pollution-is-a-public-health-problem-epa-director/"},
  {tag:"Ghana law",cls:"law",big:"GS 1222",unit:"",text:"Ghana's Standard for Health Protection: Requirements for Ambient Noise Control (GS 1222:2018) sets limits by zone. EPA has urged religious bodies, entertainment centres and industry to comply.",why:"Name the standard when you share the community map with the EPA or your assembly. Many walkers, many days: strong evidence.",src:"Ghanaian Times, 2025",url:"https://ghanaiantimes.com.gh/epa-asks-religious-bodies-entertainment-centres-to-comply-with-prescribed-noise-limits/"},
  {tag:"Science",cls:"sci",big:"+10",unit:"dB",text:"Every 10 dB rise sounds roughly twice as loud, and every 3 dB doubles the sound energy. So 75 dB sounds about 4× as loud as 55 dB.",why:"A trail going from green to orange is a much bigger jump for your ears than the numbers suggest.",src:"",url:""},
  {tag:"Science",cls:"sci",big:"5 s",unit:"",text:"While you walk, the app averages the sound energy (Leq) over about 5 seconds or 15 metres and drops one point on the map.",why:"Walk at a normal pace and hold the phone out, mic uncovered. Wind and handling noise push readings up.",src:"",url:""}
];
function renderFacts(){
  const all=uniq(feedWalks.length?feedWalks:allMine()),pts=all.reduce((a,w)=>a+(w.n_points||0),0),dist=all.reduce((a,w)=>a+(w.distance_m||0),0);
  const over=all.reduce((a,w)=>a+(w.n_points||0)*(w.over_pct||0)/100,0);
  const you={tag:"Community",cls:"you",big:pts?Math.round(over/pts*100)+"%":"0",unit:pts?"over":"",
    text:pts?`Across ${all.length} walk${all.length>1?"s":""} and ${km(dist)} km, ${Math.round(over)} of ${pts} mapped points break the legal limit.`:"No walks mapped yet. Your first walk starts the community picture.",
    why:"Every walk adds points and fills squares. The more people walk, at different times of day, the clearer the picture.",src:"",url:""};
  const list=[you,...FACTS];
  $("facts").innerHTML=list.map((f,i)=>`<article class="fact" role="listitem"><div class="ft"><span class="ftag ${f.cls||""}">${esc(f.tag)}</span><span class="fn">${String(i+1).padStart(2,"0")}/${String(list.length).padStart(2,"0")}</span></div>
    <div class="big">${esc(f.big)}${f.unit?`<small>${esc(f.unit)}</small>`:""}</div><p>${esc(f.text)}</p><div class="why"><b>Why it matters</b><span>${esc(f.why)}</span></div>${f.url?`<a class="src" href="${f.url}" target="_blank" rel="noopener">Source: ${esc(f.src)}</a>`:""}</article>`).join("");
}
function stepFacts(dir){const w=$("facts"),c=w.querySelector(".fact");if(!c)return;w.scrollBy({left:dir*(c.getBoundingClientRect().width+12),behavior:reduceMotion?"auto":"smooth"})}
$("factPrev").addEventListener("click",()=>stepFacts(-1));$("factNext").addEventListener("click",()=>stepFacts(1));

/* ---------- Map ---------- */
const map=L.map("map",{zoomControl:false,scrollWheelZoom:false}).setView([5.6037,-0.1870],14);
map.attributionControl.setPrefix(false);
const BASES={
  map:L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png",{maxZoom:19,attribution:'&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'}),
  sat:L.layerGroup([L.tileLayer("https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}",{maxZoom:19,attribution:"Imagery &copy; Esri, Maxar"}),L.tileLayer("https://server.arcgisonline.com/ArcGIS/rest/services/Reference/World_Boundaries_and_Places/MapServer/tile/{z}/{y}/{x}",{maxZoom:19})])
};
let baseKey=BASES[settings.base]?settings.base:"map";BASES[baseKey].addTo(map);
function applyBase(){$("mapbox").classList.toggle("muted",baseKey==="map");$("btnBase").classList.toggle("on",baseKey==="sat");$("btnBase").setAttribute("aria-label",baseKey==="sat"?"Switch to street map":"Switch to satellite")}
applyBase();
$("btnBase").addEventListener("click",()=>{map.removeLayer(BASES[baseKey]);baseKey=baseKey==="map"?"sat":"map";BASES[baseKey].addTo(map);settings.base=baseKey;saveSettings();applyBase()});
$("zIn").addEventListener("click",()=>map.zoomIn());$("zOut").addEventListener("click",()=>map.zoomOut());
map.on("focus",()=>map.scrollWheelZoom.enable());map.on("blur",()=>map.scrollWheelZoom.disable());
const sqLayer=L.layerGroup(),commLayer=L.layerGroup().addTo(map),pinLayer=L.layerGroup().addTo(map),liveLayer=L.layerGroup().addTo(map);
let layerMode="noise",selectedWalk=null;
document.querySelectorAll("#layerSeg button").forEach(b=>b.addEventListener("click",()=>{layerMode=b.dataset.l;document.querySelectorAll("#layerSeg button").forEach(x=>x.setAttribute("aria-pressed",x===b));drawCommunity()}));
function segsFor(w,weight,opacity,onClick){
  const g=L.layerGroup(),p=w.path||[];
  for(let i=1;i<p.length;i++){const a=p[i-1],b=p[i];if(hav([a[0],a[1]],[b[0],b[1]])>250)continue;
    const l=L.polyline([[a[0],a[1]],[b[0],b[1]]],{color:bandOf(b[2]).hex,weight,opacity,lineCap:"round"});if(onClick)l.on("click",onClick);l.addTo(g)}
  return g;
}
function drawCommunity(){
  commLayer.clearLayers();pinLayer.clearLayers();sqLayer.clearLayers();
  const all=uniq([...pending,...feedWalks]);
  if(layerMode==="squares"){
    map.addLayer(sqLayer);
    const mine=myCells(),comm=new Set();all.forEach(w=>cellsOf(w.path).forEach(c=>comm.add(c)));
    comm.forEach(c=>{const[a,b]=c.split(":").map(Number),m=mine.has(c);L.rectangle([[a*GRID,b*GRID],[(a+1)*GRID,(b+1)*GRID]],{color:m?"#0b0b0a":"#4a4b2f",weight:1,fillColor:m?"#ddf240":"#c7a882",fillOpacity:m?.55:.35,interactive:false}).addTo(sqLayer)});
    $("mapKm").textContent=comm.size;$("mapKmLbl").textContent=`squares mapped · ${mine.size} yours`;
  }else{
    map.removeLayer(sqLayer);
    all.forEach(w=>{const sel=selectedWalk&&selectedWalk.id===w.id;segsFor(w,sel?8:5,sel?1:.85,()=>openDetail(w,false)).addTo(commLayer);
      (w.pins||[]).forEach(q=>L.marker([q.lat,q.lng],{icon:L.divIcon({className:"pin-wrap",iconSize:[28,28],iconAnchor:[14,14],html:`<span class="pin" style="--pc:${q.db!=null?bandOf(q.db).hex:"#ddf240"}">${icon(q.cat)}</span>`}),title:`${q.cat}${q.db!=null?` · ${Math.round(q.db)} dB`:""}${q.note?` · ${q.note}`:""}`}).on("click",()=>openDetail(w,false)).addTo(pinLayer))});
    const dist=all.reduce((a,w)=>a+(w.distance_m||0),0);$("mapKm").textContent=(dist/1000).toFixed(dist<100000?1:0);$("mapKmLbl").textContent=`km mapped · ${all.length} walk${all.length===1?"":"s"}`;
  }
  updateInfo();
}
function showWalkOnMap(w){
  selectedWalk=w;drawCommunity();
  const p=(w.path||[]).map(x=>[x[0],x[1]]);if(p.length)map.fitBounds(L.latLngBounds(p).pad(.25),{maxZoom:17,animate:!reduceMotion});
}
let liveLine=[];
function clearLiveTrail(){liveLayer.clearLayers();liveLine=[]}
function addLiveSeg(){
  const p=walk&&walk.path;if(!p||!p.length)return;const b=p[p.length-1];
  if(p.length>1){const a=p[p.length-2];if(hav([a[0],a[1]],[b[0],b[1]])<=250)L.polyline([[a[0],a[1]],[b[0],b[1]]],{color:bandOf(b[2]).hex,weight:7,opacity:1,lineCap:"round"}).addTo(liveLayer)}
  else L.circleMarker([b[0],b[1]],{radius:6,color:"#f4f2e9",weight:2.5,fillColor:"#0b0b0a",fillOpacity:1}).addTo(liveLayer);
  if(walk&&walk.follow!==false)map.panTo([b[0],b[1]],{animate:!reduceMotion});
}
function addLivePin(q){L.marker([q.lat,q.lng],{icon:L.divIcon({className:"pin-wrap",iconSize:[28,28],iconAnchor:[14,14],html:`<span class="pin" style="--pc:${q.db!=null?bandOf(q.db).hex:"#ddf240"}">${icon(q.cat)}</span>`})}).addTo(liveLayer)}
let meM=null,meA=null;
function showMe(la,lo,ac){
  if(!meM){meA=L.circle([la,lo],{radius:ac,color:"#4fb3ff",weight:1,fillColor:"#4fb3ff",fillOpacity:.1,interactive:false}).addTo(map);
    meM=L.marker([la,lo],{icon:L.divIcon({className:"me-wrap",html:'<span class="me"><i>You</i></span>',iconSize:[18,18],iconAnchor:[9,9]}),keyboard:false,zIndexOffset:1000}).addTo(map)}
  else{meM.setLatLng([la,lo]);meA.setLatLng([la,lo]).setRadius(ac)}
}
$("btnLocate").addEventListener("click",()=>{
  if(!navigator.geolocation){toast("No GPS on this device");return}
  navigator.geolocation.getCurrentPosition(p=>{showMe(p.coords.latitude,p.coords.longitude,p.coords.accuracy);map.setView([p.coords.latitude,p.coords.longitude],16)},()=>toast("Location is blocked"),{enableHighAccuracy:true,timeout:15000});
});
function updateInfo(){
  const t=$("minfoTxt");
  if(walk){t.textContent=`${walk.active?"Walking":"Paused"} · ${km(walk.dist)} km · ${walk.path.length} points${disp!=null?` · ${disp.toFixed(0)} dB now`:""}`;return}
  if(feedState==="loading"){t.textContent="Loading the community map…";return}
  if(feedState==="error"&&!feedWalks.length){t.textContent="Offline · showing walks saved on this phone";return}
  t.textContent=feedWalks.length||pending.length?(layerMode==="squares"?"Lime squares are yours. Walk new streets to claim more.":"Tap a trail to see the walk. Colours show loudness."):"No walks yet. Start one and put your streets on the map.";
}
setInterval(()=>{if(walk)updateInfo()},1000);

/* ---------- Share card (image) ---------- */
async function shareCard(w){
  try{await Promise.all([document.fonts.load('800 60px "Unbounded"'),document.fonts.load('500 20px "DM Mono"'),document.fonts.load('400 20px "Lexend Deca"')])}catch(e){}
  const W=1080,H=1350,c=document.createElement("canvas");c.width=W;c.height=H;const g=c.getContext("2d");
  g.fillStyle="#0b0b0a";g.fillRect(0,0,W,H);
  [[W*.85,H*.2],[W*.1,H*.75]].forEach((ct,ci)=>{for(let k=1;k<24;k++){g.beginPath();for(let a=0;a<=Math.PI*2+.01;a+=Math.PI/80){const r=k*34+Math.sin(a*3+k*.4+ci)*14,x=ct[0]+Math.cos(a)*r*1.2,y=ct[1]+Math.sin(a)*r;a?g.lineTo(x,y):g.moveTo(x,y)}g.strokeStyle=k%5===0?"rgba(221,242,64,.16)":"rgba(255,255,255,.05)";g.lineWidth=1.5;g.stroke()}});
  g.fillStyle="#8b8a80";g.font='500 26px "DM Mono",monospace';g.fillText("NOISE MAP · COMMUNITY NOISE WALK",64,96);
  const p=w.profiles||me||{name:"",emoji:""};g.fillStyle="#f4f2e9";g.font='400 30px "Lexend Deca",sans-serif';g.fillText(`${p.emoji||""} ${p.name||""} · ${new Date(w.started_at).toLocaleDateString(undefined,{day:"numeric",month:"long",year:"numeric"})}`.trim(),64,146);
  g.font='800 76px "Unbounded",sans-serif';g.fillStyle="#ddf240";
  const words=w.title.toUpperCase().split(" ");let line="",y=250;const lines=[];words.forEach(x=>{const t=(line+" "+x).trim();if(g.measureText(t).width>W-128&&line){lines.push(line);line=x}else line=t});lines.push(line);
  lines.slice(0,2).forEach((l,i)=>{g.fillStyle=i?"#ddf240":"#f4f2e9";g.fillText(l,64,y+i*86)});
  const bx=64,by=440,bw=W-128,bh=560;g.fillStyle="rgba(255,255,255,.04)";g.beginPath();g.roundRect?g.roundRect(bx,by,bw,bh,36):g.rect(bx,by,bw,bh);g.fill();
  const path=w.path||[];
  if(path.length>1){let la0=Infinity,la1=-Infinity,lo0=Infinity,lo1=-Infinity;path.forEach(q=>{la0=Math.min(la0,q[0]);la1=Math.max(la1,q[0]);lo0=Math.min(lo0,q[1]);lo1=Math.max(lo1,q[1])});
    const k=Math.cos((la0+la1)/2*Math.PI/180),dx=Math.max((lo1-lo0)*k,1e-5),dy=Math.max(la1-la0,1e-5),pad=60,sc=Math.min((bw-2*pad)/dx,(bh-2*pad)/dy),ox=bx+(bw-dx*sc)/2,oy=by+(bh-dy*sc)/2,X=lo=>ox+(lo-lo0)*k*sc,Y=la=>by+bh-(oy-by)-(la-la0)*sc;
    g.lineCap="round";g.lineJoin="round";g.strokeStyle="rgba(255,255,255,.1)";g.lineWidth=30;g.beginPath();path.forEach((q,i)=>i?g.lineTo(X(q[1]),Y(q[0])):g.moveTo(X(q[1]),Y(q[0])));g.stroke();
    g.lineWidth=13;for(let i=1;i<path.length;i++){g.strokeStyle=bandOf(path[i][2]).hex;g.beginPath();g.moveTo(X(path[i-1][1]),Y(path[i-1][0]));g.lineTo(X(path[i][1]),Y(path[i][0]));g.stroke()}
    const e=path[path.length-1];g.fillStyle="#ddf240";g.beginPath();g.arc(X(e[1]),Y(e[0]),18,0,Math.PI*2);g.fill();g.strokeStyle="#0b0b0a";g.lineWidth=5;g.stroke();}
  else{g.fillStyle="#8b8a80";g.font='400 30px "Lexend Deca",sans-serif';g.textAlign="center";g.fillText("Route hidden",W/2,by+bh/2);g.textAlign="left"}
  const st=[[km(w.distance_m),"KM"],[mmss(w.duration_s),"TIME"],[fmt0(w.avg_db),"AVG dB"],[(w.over_pct!=null?Math.round(w.over_pct):"--")+"%","OVER LIMIT"]];
  st.forEach((s,i)=>{const x=64+i*(W-128)/4;g.fillStyle="#f4f2e9";g.font='800 58px "Unbounded",sans-serif';g.fillText(String(s[0]),x,1110);g.fillStyle="#8b8a80";g.font='500 22px "DM Mono",monospace';g.fillText(s[1],x,1150)});
  g.fillStyle="#ddf240";g.fillRect(0,H-96,W,96);g.fillStyle="#0b0b0a";g.font='800 30px "Unbounded",sans-serif';g.fillText("WALK YOUR STREETS. MAP THE NOISE.",64,H-36);
  const blob=await new Promise(r=>c.toBlob(r,"image/png"));if(!blob){toast("Couldn't make the image");return}
  const file=new File([blob],"noise-walk.png",{type:"image/png"});
  try{if(navigator.canShare&&navigator.canShare({files:[file]})){await navigator.share({files:[file],title:w.title,text:`${w.title}: ${km(w.distance_m)} km of noise mapped`});return}}catch(e){if(e&&e.name==="AbortError")return}
  const a=document.createElement("a");a.href=URL.createObjectURL(blob);a.download="noise-walk.png";document.body.appendChild(a);a.click();setTimeout(()=>{URL.revokeObjectURL(a.href);a.remove()},500);toast("Share card downloaded");
}

/* ---------- Render all + boot ---------- */
function renderAll(){drawCommunity();renderWeek();renderFacts();if(view==="feed")renderFeed();if(view==="you")renderYou();$("railBadge").hidden=!pending.length;$("railBadge").textContent=pending.length}
async function boot(){
  renderAll();resetWalkUI();
  if(!DATA){feedState="error";renderAll();return}
  try{const u=await DATA.user();if(u){const p=await DATA.getProfile(u.id);if(p){me=p;store.set(PROFILE,me)}else if(me&&me.id!==u.id){me=null;store.del(PROFILE)}}else if(me){me=null;store.del(PROFILE)}}catch(e){}
  await loadFeed();
  if(me){try{myWalks=await DATA.mine(me.id)}catch(e){}flushPending()}
  const own=allMine();if(own.length&&own[0].path&&own[0].path.length)map.setView([own[0].path[0][0],own[0].path[0][1]],15);
  else if(feedWalks.length&&feedWalks[0].path&&feedWalks[0].path.length){const b=L.latLngBounds(feedWalks.slice(0,20).flatMap(w=>(w.path||[]).map(p=>[p[0],p[1]])));if(b.isValid())map.fitBounds(b.pad(.15),{maxZoom:16})}
  renderAll();
}
boot();
setInterval(placeLimit,60000);
window.addEventListener("resize",()=>map.invalidateSize());
matchMedia("(max-width:999px)").addEventListener("change",()=>{document.body.classList.remove("mapmode");setTimeout(()=>map.invalidateSize(),50)});

/* ---------- Install ---------- */
if("serviceWorker" in navigator&&location.protocol==="https:")window.addEventListener("load",()=>navigator.serviceWorker.register("sw.js").catch(()=>{}));
let installPrompt=null;
window.addEventListener("beforeinstallprompt",e=>{e.preventDefault();installPrompt=e;$("btnInstall").hidden=false});
$("btnInstall").addEventListener("click",async()=>{if(!installPrompt)return;installPrompt.prompt();try{await installPrompt.userChoice}catch(e){}installPrompt=null;$("btnInstall").hidden=true});
window.addEventListener("appinstalled",()=>{$("btnInstall").hidden=true});
window.__nm={get walk(){return walk},get me(){return me},go,shareCard};
})();
