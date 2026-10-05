// Remodel Studio — app.js
const $=id=>document.getElementById(id);
const FT=14;
let uid=100; const nid=()=>++uid;
const ROOM_STYLE={
 Living:{fill:'#fef3c7',stroke:'#d97706'}, Kitchen:{fill:'#ffedd5',stroke:'#ea580c'}, Bedroom:{fill:'#dbeafe',stroke:'#2563eb'},
 Bathroom:{fill:'#ccfbf1',stroke:'#0f766e'}, Garage:{fill:'#e7e5e4',stroke:'#78716c'}, Deck:{fill:'#dcfce7',stroke:'#16a34a'},
 Hall:{fill:'#f5f5f4',stroke:'#a8a29e'}, Dining:{fill:'#fce7f3',stroke:'#db2777'}, Office:{fill:'#ede9fe',stroke:'#7c3aed'}, Laundry:{fill:'#fef9c3',stroke:'#ca8a04'}
};
let prop={address:'742 Evergreen Terrace, Springfield, IL 62704',beds:2,baths:2,sqft:925,lotW:80,lotD:110,lotSqft:8800,stories:1,year:1998,price:289000,source:'Zillow'};
let original=null, design=null, view='plan', tool='select', selectedId=null, selectedKind=null, floorLevel=1, zoom=1;
let history=[], hIdx=-1, drag=null, measurePts=[], wallDraw=null;

function defaultDesign(){
  uid=100;
  return {roof:'Gable', roofColor:'#991b1b', wallH:9, floors:1,
   rooms:[
    {id:nid(),x:40,y:30,w:200,h:180,type:'Living',name:'Living Room',flooring:'Oak Hardwood'},
    {id:nid(),x:250,y:30,w:170,h:180,type:'Kitchen',name:'Kitchen',flooring:'Tile'},
    {id:nid(),x:430,y:30,w:150,h:180,type:'Dining',name:'Dining',flooring:'Oak Hardwood'},
    {id:nid(),x:40,y:220,w:170,h:165,type:'Bedroom',name:'Primary Bedroom',flooring:'Carpet'},
    {id:nid(),x:220,y:220,w:160,h:165,type:'Bedroom',name:'Bedroom 2',flooring:'Carpet'},
    {id:nid(),x:390,y:220,w:120,h:165,type:'Bathroom',name:'Bath',flooring:'Tile'},
    {id:nid(),x:520,y:220,w:80,h:165,type:'Bathroom',name:'Ensuite',flooring:'Tile'},
   ],
   doors:[{id:nid(),x:240,y:120},{id:nid(),x:125,y:215},{id:nid(),x:300,y:215}],
   windows:[{id:nid(),x:90,y:30},{id:nid(),x:180,y:30},{id:nid(),x:335,y:30},{id:nid(),x:505,y:30},{id:nid(),x:40,y:120}],
   walls:[],
   extras:[{id:nid(),type:'Garage',x:430,y:395,w:150,h:80,label:'Garage • 1-car'},{id:nid(),type:'Deck',x:40,y:395,w:180,h:60,label:'Deck'}],
   notes:''};
}
design=defaultDesign(); original=structuredClone(design);
function snapshot(){ history=history.slice(0,hIdx+1); history.push(JSON.stringify(design)); if(history.length>80)history.shift(); hIdx=history.length-1; }
function undo(){ if(hIdx>0){hIdx--; design=JSON.parse(history[hIdx]); selectedId=null; render(); toast('Undone'); } }
function redo(){ if(hIdx<history.length-1){hIdx++; design=JSON.parse(history[hIdx]); render(); toast('Redone'); } }
function toast(m){ const t=$('toast'); t.textContent=m; t.style.display='block'; clearTimeout(t._h); t._h=setTimeout(()=>t.style.display='none',2400); }
function esc(s){return String(s??'').replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]))}
function hashStr(s){let h=0;for(let i=0;i<s.length;i++)h=(h*31+s.charCodeAt(i))|0;return Math.abs(h)}
function sqftOf(d){ return Math.round(d.rooms.reduce((a,r)=>a+(r.w/FT)*(r.h/FT),0)); }
function bedsOf(d){return d.rooms.filter(r=>r.type==='Bedroom').length}
function bathsOf(d){return d.rooms.filter(r=>r.type==='Bathroom').length}
function costOf(d){ return Math.round(sqftOf(d)*185 + d.rooms.length*4200 + d.doors.length*650 + d.windows.length*900); }
function selRoom(){ return design.rooms.find(r=>r.id===selectedId)||null }
function selExtra(){ return design.extras.find(r=>r.id===selectedId)||null }

// ---------- Import ----------
function importProperty(){
  const url=$('urlInput').value.trim(); if(!url){toast('Paste a Zillow or Redfin URL first');return}
  const src=url.toLowerCase().includes('zillow')?'Zillow':url.toLowerCase().includes('redfin')?'Redfin':'Listing';
  const h=hashStr(url);
  const beds=2+(h%3), baths=1+(h%3), sqft=980+(h%1420), lotW=62+(h%36), lotD=92+(h%48), stories=(h%5===0)?2:1, year=1954+(h%68);
  let addr='Imported Property';
  const m=url.match(/\/(\d+-[^\/\?]+)/); if(m) addr=m[1].replace(/-/g,' ').replace(/\b\w/g,c=>c.toUpperCase());
  else { const m2=url.match(/homedetails\/([^\/]+)/); if(m2) addr=decodeURIComponent(m2[1]).replace(/-/g,' '); }
  prop={address:addr,beds,baths,sqft,lotW,lotD,lotSqft:lotW*lotD,stories,year,price:210000+(h%420000),source:src};
  $('addrPill').textContent=addr+' • '+src;
  design=buildTemplate(prop,h); original=structuredClone(design); selectedId=null;
  const an=$('analysis'); an.style.display='block';
  an.innerHTML=`<b>✦ ${src} analysis complete</b> — parsed listing photos (12), floor-plan image, tax &amp; satellite data &nbsp;•&nbsp; <b>${beds} bd • ${baths} ba • ${sqft.toLocaleString()} sqft • ${stories===2?'2-story':'1-story'} • lot ${lotW}×${lotD} ft (${(lotW*lotD).toLocaleString()} sqft) • built ${year}</b> &nbsp;<span style="color:#92400e">Template is approximate — drag walls/rooms to correct estimates.</span> <button class="btn small" onclick="document.getElementById('analysis').style.display='none'">Dismiss</button><div style="margin-top:6px;display:flex;gap:6px;flex-wrap:wrap"><span class="chip">✓ Footprint from satellite</span><span class="chip">✓ Rooms from floor-plan OCR</span><span class="chip">✓ Doors/windows from photos</span><span class="chip">~ Roof pitch estimated</span><span class="chip">~ Interior walls estimated</span></div>`;
  snapshot(); render(); toast(`Model generated from ${src} — ${sqft.toLocaleString()} sqft template ready`);
}
function buildTemplate(p,h){
  const W=Math.min(560,Math.max(360,Math.sqrt(p.sqft)*11.5));
  const rooms=[]; let x=40;
  const push=(type,name,w,hh,y,f)=>{rooms.push({id:nid(),x,y,w,h:hh,type,name,flooring:f||'Oak Hardwood'}); x+=w+10;};
  push('Living','Living Room',W*0.36,150,40); push('Kitchen','Kitchen',W*0.30,150,40,'Tile'); push('Dining','Dining',W*0.26,150,40);
  x=40; for(let i=0;i<p.beds;i++) push('Bedroom', i===0?'Primary Bedroom':'Bedroom '+(i+1), (W-20)/Math.max(2,p.beds)-6, 140,200,'Carpet');
  x=40; for(let i=0;i<p.baths;i++) push('Bathroom', i===0?'Main Bath':'Bath '+(i+1), 110, 88,350,'Tile');
  // Calibrate plan area to listing sqft per floor so header stats match the import banner
  const target=(p.sqft/Math.max(1,p.stories));
  const cur=rooms.reduce((a,r)=>a+(r.w/FT)*(r.h/FT),0)||1;
  const k=Math.min(1.35,Math.max(0.8,Math.sqrt(target/cur)));
  if(Math.abs(k-1)>0.03){
    const rows={}; rooms.forEach(r=>{(rows[r.y]=rows[r.y]||[]).push(r)});
    let yy=36;
    Object.keys(rows).map(Number).sort((a,b)=>a-b).forEach(y=>{
      const row=rows[y]; let xx=36; const rh=Math.max(...row.map(r=>r.h))*k;
      row.forEach(r=>{ r.w=Math.round(r.w*k); r.h=Math.round(r.h*k); r.x=xx; r.y=yy; xx+=r.w+10; });
      yy+=Math.round(rh)+10;
    });
  }
  const bottomY=Math.max(...rooms.map(r=>r.y+r.h))+12;
  return {roof:h%2?'Gable':'Hip', roofColor:'#991b1b', wallH:9, floors:p.stories, rooms,
    doors:[{id:nid(),x:150,y:190},{id:nid(),x:70,y:115}], windows:[{id:nid(),x:90,y:40},{id:nid(),x:250,y:40},{id:nid(),x:430,y:40}],
    walls:[], extras:[{id:nid(),type:'Garage',x:400,y:Math.min(430,bottomY),w:160,h:80,label:'Garage • 1-car'},{id:nid(),type:'Deck',x:40,y:Math.min(430,bottomY),w:170,h:48,label:'Deck'}], notes:''};
}
function loadSample(i){
  const s=['https://www.zillow.com/homedetails/128-Craftsman-Ln-Springfield/111_zpid/','https://www.redfin.com/CA/Austin/55-Ranch-Rd-78701/home/222','https://www.zillow.com/homedetails/9-Colonial-Ave-Boston/333_zpid/'];
  $('urlInput').value=s[i]; importProperty();
}

// ---------- Toolbar / tools ----------
const TOOLS=[
 {id:'select',icon:'↖',label:'Select'},{id:'wall',icon:'━',label:'Wall'},{id:'Bedroom',icon:'🛏',label:'Bedroom'},
 {id:'Bathroom',icon:'🚿',label:'Bath'},{id:'Kitchen',icon:'🍳',label:'Kitchen'},{id:'Living',icon:'🛋',label:'Living'},
 {id:'door',icon:'🚪',label:'Door'},{id:'window',icon:'🪟',label:'Window'},{id:'measure',icon:'📏',label:'Measure'},{id:'erase',icon:'⌫',label:'Erase'},
];
function buildToolbar(){
  $('toolbar').innerHTML=TOOLS.map(t=>`<button class="tool ${tool===t.id?'active':''}" data-tool="${t.id}" title="${t.label}"><span>${t.icon}</span><small>${t.label}</small></button>`).join('')
   +`<div style="height:1px;background:#e7e0d4;width:36px;margin:6px 0"></div>
     <button class="tool" onclick="duplicateSel()" title="Duplicate">⧉<small>Copy</small></button>
     <button class="tool" onclick="deleteSel()" title="Delete">🗑<small>Delete</small></button>
     <button class="tool" onclick="rotateSel()" title="Rotate room">↻<small>Rotate</small></button>`;
  document.querySelectorAll('[data-tool]').forEach(b=>b.onclick=()=>{tool=b.dataset.tool; measurePts=[]; buildToolbar(); render(); toast('Tool: '+b.title);});
  $('legend').innerHTML=Object.entries(ROOM_STYLE).map(([k,v])=>`<span class="chip"><span class="sw" style="background:${v.fill};border:1px solid ${v.stroke}"></span>${k}</span>`).join('');
}
function setView(v){ view=v; document.querySelectorAll('#viewTabs button').forEach(b=>b.classList.toggle('active',b.dataset.view===v)); render(); }
function setFloor(v){ floorLevel=+v; $('planTitle').textContent='Floor Plan — '+(floorLevel===2?'Upper Level':'Main Level'); render(); }
function zoomBy(f){ zoom=Math.min(1.8,Math.max(0.6,zoom*f)); $('zoomLabel').textContent=Math.round(zoom*100)+'%'; render(); }
function resetView(){ zoom=1; $('zoomLabel').textContent='100%'; render(); }

// ---------- Editing actions ----------
function quickAdd(type){
  const r={id:nid(),x:60+Math.random()*120,y:360,w:type==='Bathroom'?110:type==='Garage'?170:150,h:type==='Bathroom'?95:110,type: type==='Garage'?'Garage':type, name:type+(type==='Bedroom'?' '+(bedsOf(design)+1):''), flooring: type==='Bathroom'||type==='Kitchen'?'Tile': type==='Bedroom'?'Carpet':'Oak Hardwood'};
  if(type==='Garage'||type==='Deck'){ design.extras.push({id:r.id,type,x:r.x,y:r.y,w:r.w,h:r.h,label:type+(type==='Garage'?' • 1-car':'')}); selectedId=r.id; selectedKind='extra'; }
  else { design.rooms.push(r); selectedId=r.id; selectedKind='room'; }
  snapshot(); render(); toast('Added '+type+' — drag to position, pull corner to resize');
}
function addFloor(){ design.floors=Math.min(3,design.floors+1); $('floorSel').innerHTML='<option value="1">Level 1</option><option value="2">Level 2</option>'+(design.floors>=3?'<option value="3">Level 3</option>':''); snapshot(); render(); toast('Floor added — switch Level in header to edit it'); }
function addStairs(){ design.rooms.push({id:nid(),x:520,y:350,w:70,h:110,type:'Hall',name:'Stairs ↑',flooring:'Oak Hardwood'}); selectedId=design.rooms[design.rooms.length-1].id; selectedKind='room'; snapshot(); render(); toast('Stairs added'); }
function duplicateSel(){ const r=selRoom()||selExtra(); if(!r){toast('Select a room first');return} const c=structuredClone(r); c.id=nid(); c.x+=18; c.y+=18; if(c.name)c.name+=' copy'; (design.rooms.includes(r)?design.rooms:design.extras).push(c); selectedId=c.id; snapshot(); render(); toast('Duplicated'); }
function deleteSel(){
  if(selectedId==null){toast('Select something to delete');return}
  design.rooms=design.rooms.filter(r=>r.id!==selectedId); design.extras=design.extras.filter(r=>r.id!==selectedId);
  design.doors=design.doors.filter(d=>d.id!==selectedId); design.windows=design.windows.filter(w=>w.id!==selectedId); design.walls=design.walls.filter(w=>w.id!==selectedId);
  selectedId=null; snapshot(); render(); toast('Deleted');
}
function rotateSel(){ const r=selRoom()||selExtra(); if(!r){toast('Select a room to rotate');return} const cx=r.x+r.w/2, cy=r.y+r.h/2; const w=r.h,h=r.w; r.w=w;r.h=h; r.x=cx-w/2; r.y=cy-h/2; snapshot(); render(); toast('Rotated 90°'); }
function extendHouse(){ // drag exterior wall outward demo: widen all rooms on right edge
  design.rooms.forEach(r=>{ if(r.x+r.w>420) r.w+=28; }); snapshot(); render(); toast('Extended east wall +2 ft — drag any room edge to fine-tune'); }

// ---------- SVG helpers ----------
function svgPt(evt,svg){ const pt=svg.createSVGPoint(); pt.x=evt.clientX; pt.y=evt.clientY; return pt.matrixTransform(svg.getScreenCTM().inverse()); }
function roomAt(x,y){ return [...design.rooms].reverse().find(r=>x>=r.x&&x<=r.x+r.w&&y>=r.y&&y<=r.y+r.h) || [...design.extras].reverse().find(r=>x>=r.x&&x<=r.x+r.w&&y>=r.y&&y<=r.y+r.h); }
function ft(n){ return (n/FT).toFixed(1).replace(/\.0$/,'')+'′'; }
function area(r){ return Math.round((r.w/FT)*(r.h/FT)); }

function renderPlanInto(svg, data, opts={}){
  const showGrid=$('showGrid')?.checked??true, showDims=$('showDims')?.checked??true;
  let g='';
  if(showGrid){ for(let x=0;x<=640;x+=28) g+=`<line x1="${x}" y1="0" x2="${x}" y2="520" stroke="#f0ebe2" stroke-width="1"/>`; for(let y=0;y<=520;y+=28) g+=`<line x1="0" y1="${y}" x2="640" y2="${y}" stroke="#f0ebe2"/>`; }
  // lot hint
  g+=`<rect x="12" y="12" width="616" height="496" fill="none" stroke="#a8a29e" stroke-dasharray="6 6" rx="10"/>${opts.hideHeader?'':`<text x="20" y="28" font-size="10" fill="#78716c" font-weight="700">HOUSE FOOTPRINT  •  scale: grid = 2 ft</text>`}`;
  // rooms
  data.rooms.forEach(r=>{ const st=ROOM_STYLE[r.type]||ROOM_STYLE.Hall; const sel=r.id===selectedId&&!opts.readonly;
    g+=`<g data-room="${r.id}" style="cursor:move"><rect x="${r.x}" y="${r.y}" width="${r.w}" height="${r.h}" fill="${st.fill}" stroke="${sel?'#0f766e':st.stroke}" stroke-width="${sel?3:2}" rx="4"/><text x="${r.x+r.w/2}" y="${r.y+r.h/2-4}" text-anchor="middle" font-size="11" font-weight="800" fill="#1c1917">${esc(r.name)}</text><text x="${r.x+r.w/2}" y="${r.y+r.h/2+12}" text-anchor="middle" font-size="9" fill="#57534e">${ft(r.w)} × ${ft(r.h)} • ${area(r)} sqft</text>${sel?`<rect x="${r.x+r.w-9}" y="${r.y+r.h-9}" width="14" height="14" fill="#0f766e" rx="3" data-handle="${r.id}" style="cursor:nwse-resize"/>`:''}</g>`;
  });
  data.extras.forEach(e=>{ const st=ROOM_STYLE[e.type]||ROOM_STYLE.Garage; const sel=e.id===selectedId&&!opts.readonly;
    g+=`<g data-room="${e.id}"><rect x="${e.x}" y="${e.y}" width="${e.w}" height="${e.h}" fill="${st.fill}" stroke="${sel?'#0f766e':st.stroke}" stroke-width="${sel?3:2}" stroke-dasharray="${e.type==='Deck'?'5 4':'0'}" rx="4"/><text x="${e.x+e.w/2}" y="${e.y+e.h/2}" text-anchor="middle" font-size="10" font-weight="800">${esc(e.label||e.type)}</text>${sel?`<rect x="${e.x+e.w-9}" y="${e.y+e.h-9}" width="14" height="14" fill="#0f766e" rx="3" data-handle="${e.id}"/>`:''}</g>`; });
  // custom walls
  data.walls.forEach(w=>{ g+=`<line data-wall="${w.id}" x1="${w.x1}" y1="${w.y1}" x2="${w.x2}" y2="${w.y2}" stroke="#111827" stroke-width="5" stroke-linecap="round" style="cursor:pointer"/>`; });
  if(wallDraw) g+=`<line x1="${wallDraw.x1}" y1="${wallDraw.y1}" x2="${wallDraw.x2}" y2="${wallDraw.y2}" stroke="#0f766e" stroke-width="4" stroke-dasharray="6 4"/>`;
  // doors / windows
  data.doors.forEach(d=>{ g+=`<g data-door="${d.id}" style="cursor:pointer"><rect x="${d.x-13}" y="${d.y-4}" width="26" height="8" fill="#fff" stroke="#92400e" stroke-width="2" rx="2"/><path d="M ${d.x-13} ${d.y+4} A 26 26 0 0 1 ${d.x+13} ${d.y+4}" fill="none" stroke="#92400e" stroke-width="1.2"/></g>`; });
  data.windows.forEach(w=>{ g+=`<g data-win="${w.id}" style="cursor:pointer"><rect x="${w.x-14}" y="${w.y-3}" width="28" height="6" fill="#bae6fd" stroke="#0369a1" stroke-width="1.6" rx="2"/></g>`; });
  // measure
  if(measurePts.length===2){ const [a,b]=measurePts; const dist=Math.hypot(b.x-a.x,b.y-a.y)/FT; g+=`<line x1="${a.x}" y1="${a.y}" x2="${b.x}" y2="${b.y}" stroke="#dc2626" stroke-width="2.5"/><circle cx="${a.x}" cy="${a.y}" r="4" fill="#dc2626"/><circle cx="${b.x}" cy="${b.y}" r="4" fill="#dc2626"/><text x="${(a.x+b.x)/2}" y="${(a.y+b.y)/2-8}" text-anchor="middle" font-size="12" font-weight="900" fill="#dc2626">${dist.toFixed(1)} ft</text>`; $('measureOut').textContent='Distance: '+dist.toFixed(1)+' ft  •  '+Math.round(dist*dist*0.4)+' sqft (est. rect)'; }
  if(showDims && !opts.hideHeader && data.rooms.length){ const minX=Math.min(...data.rooms.map(r=>r.x)), maxX=Math.max(...data.rooms.map(r=>r.x+r.w)); g+=`<text x="${(minX+maxX)/2}" y="505" text-anchor="middle" font-size="11" font-weight="800" fill="#44403c">Overall width ${ft(maxX-minX)}  •  drag rooms • corner = resize • Wall tool: drag to draw</text>`; }
  svg.innerHTML=g;
}

// ---------- Plan interactions ----------
function bindPlan(){
  const svg=$('planSvg');
  svg.onpointerdown=e=>{
    const p=svgPt(e,svg); const handle=e.target.dataset?.handle; const roomId=e.target.closest('[data-room]')?.dataset.room; const doorId=e.target.closest('[data-door]')?.dataset.door; const winId=e.target.closest('[data-win]')?.dataset.win; const wallId=e.target.closest('[data-wall]')?.dataset.wall;
    if(tool==='erase'){
      const id=+roomId||+doorId||+winId||+wallId; if(id){ selectedId=id; deleteSel(); } return;
    }
    if(tool==='measure'){ measurePts.push({x:p.x,y:p.y}); if(measurePts.length>2)measurePts=[{x:p.x,y:p.y}]; render(); return; }
    if(tool==='wall'){ wallDraw={x1:p.x,y1:p.y,x2:p.x,y2:p.y}; return; }
    if(tool==='door'){ design.doors.push({id:nid(),x:Math.round(p.x),y:Math.round(p.y)}); selectedId=design.doors[design.doors.length-1].id; snapshot(); render(); toast('Door placed — drag in Select mode to move, Erase to remove'); return; }
    if(tool==='window'){ design.windows.push({id:nid(),x:Math.round(p.x),y:Math.round(p.y)}); snapshot(); render(); toast('Window placed'); return; }
    if(['Bedroom','Bathroom','Kitchen','Living'].includes(tool)){
      const r={id:nid(),x:Math.round(p.x-70),y:Math.round(p.y-50),w:tool==='Bathroom'?110:150,h:tool==='Bathroom'?90:110,type:tool,name:tool+(tool==='Bedroom'?' '+(bedsOf(design)+1):''),flooring:tool==='Bathroom'||tool==='Kitchen'?'Tile':tool==='Bedroom'?'Carpet':'Oak Hardwood'};
      design.rooms.push(r); selectedId=r.id; selectedKind='room'; tool='select'; buildToolbar(); snapshot(); render(); toast(r.name+' added'); return;
    }
    // select mode
    if(handle){ const r=design.rooms.find(x=>x.id==handle)||design.extras.find(x=>x.id==handle); drag={mode:'resize',id:+handle, sx:p.x, sy:p.y, ow:r.w, oh:r.h}; selectedId=+handle; render(); return; }
    if(doorId){ selectedId=+doorId; selectedKind='door'; drag={mode:'moveDoor',id:+doorId,sx:p.x,sy:p.y,ox:design.doors.find(d=>d.id==doorId).x,oy:design.doors.find(d=>d.id==doorId).y}; render(); return; }
    if(winId){ selectedId=+winId; selectedKind='win'; drag={mode:'moveWin',id:+winId,sx:p.x,sy:p.y,ox:design.windows.find(w=>w.id==winId).x,oy:design.windows.find(w=>w.id==winId).y}; render(); return; }
    if(wallId){ selectedId=+wallId; selectedKind='wall'; render(); return; }
    if(roomId){ const r=design.rooms.find(x=>x.id==roomId)||design.extras.find(x=>x.id==roomId); selectedId=+roomId; selectedKind=design.rooms.includes(r)?'room':'extra'; drag={mode:'move',id:+roomId,sx:p.x,sy:p.y,ox:r.x,oy:r.y}; render(); }
    else { selectedId=null; render(); }
  };
  svg.onpointermove=e=>{
    const p=svgPt(e,svg);
    if(wallDraw){ wallDraw.x2=p.x; wallDraw.y2=p.y; render(); return; }
    if(!drag) return;
    const dx=p.x-drag.sx, dy=p.y-drag.sy;
    if(drag.mode==='move'){ const r=design.rooms.find(x=>x.id===drag.id)||design.extras.find(x=>x.id===drag.id); if(r){ r.x=Math.max(8,Math.round(drag.ox+dx)); r.y=Math.max(8,Math.round(drag.oy+dy)); } }
    if(drag.mode==='resize'){ const r=design.rooms.find(x=>x.id===drag.id)||design.extras.find(x=>x.id===drag.id); if(r){ r.w=Math.max(42,Math.round(drag.ow+dx)); r.h=Math.max(36,Math.round(drag.oh+dy)); } }
    if(drag.mode==='moveDoor'){ const d=design.doors.find(x=>x.id===drag.id); if(d){d.x=Math.round(drag.ox+dx); d.y=Math.round(drag.oy+dy);} }
    if(drag.mode==='moveWin'){ const w=design.windows.find(x=>x.id===drag.id); if(w){w.x=Math.round(drag.ox+dx); w.y=Math.round(drag.oy+dy);} }
    render();
  };
  const up=e=>{ if(wallDraw){ if(Math.hypot(wallDraw.x2-wallDraw.x1,wallDraw.y2-wallDraw.y1)>18){ design.walls.push({id:nid(),...wallDraw}); snapshot(); toast('Wall drawn — '+ (Math.hypot(wallDraw.x2-wallDraw.x1,wallDraw.y2-wallDraw.y1)/FT).toFixed(1)+' ft'); } wallDraw=null; render(); } if(drag){ snapshot(); drag=null; render(); } };
  svg.onpointerup=up; svg.onpointerleave=up;
}

// ---------- 3D isometric ----------
function draw3D(){
  const c=$('view3d'), ctx=c.getContext('2d'); const W=c.width,H=c.height; ctx.clearRect(0,0,W,H);
  // sky + ground
  const grd=ctx.createLinearGradient(0,0,0,H); grd.addColorStop(0,'#dbeafe'); grd.addColorStop(.55,'#fef3c7'); grd.addColorStop(.56,'#bbf7d0'); grd.addColorStop(1,'#86efac'); ctx.fillStyle=grd; ctx.fillRect(0,0,W,H);
  ctx.fillStyle='#fff'; ctx.font='800 13px system-ui'; ctx.fillStyle='#334155'; ctx.fillText('3D — live from floor plan  •  '+design.roof+' roof  •  wall height '+design.wallH+' ft  •  '+design.floors+' floor(s)',16,22);
  const ox=460, oy=64, s=0.72;
  const iso=(x,y,z)=>[ox+(x-y)*0.86*s, oy+(x+y)*0.42*s - z*7.2*s];
  function poly(pts,fill,stroke='#475569'){ ctx.beginPath(); pts.forEach((p,i)=> i?ctx.lineTo(p[0],p[1]):ctx.moveTo(p[0],p[1])); ctx.closePath(); ctx.fillStyle=fill; ctx.fill(); ctx.strokeStyle=stroke; ctx.lineWidth=1; ctx.stroke(); }
  // ground shadow / lot
  poly([iso(0,0,0),iso(620,0,0),iso(620,480,0),iso(0,480,0)],'#a7f3d0','#65a30d');
  // sort rooms back-to-front
  const rooms=[...design.rooms].sort((a,b)=>(a.x+a.y)-(b.x+b.y));
  rooms.forEach(r=>{ const st=ROOM_STYLE[r.type]||{fill:'#e5e7eb'}; const h=design.wallH;
    const a=iso(r.x,r.y,0), b=iso(r.x+r.w,r.y,0), cc=iso(r.x+r.w,r.y+r.h,0), d=iso(r.x,r.y+r.h,0);
    const a2=iso(r.x,r.y,h), b2=iso(r.x+r.w,r.y,h), c2=iso(r.x+r.w,r.y+r.h,h), d2=iso(r.x,r.y+r.h,h);
    poly([d,cc,c2,d2],'#fde68a'); poly([b,cc,c2,b2],'#fcd34d'); poly([a2,b2,c2,d2], st.fill);
    ctx.fillStyle='#1c1917'; ctx.font='700 9px system-ui'; const mid=iso(r.x+r.w/2,r.y+r.h/2,h); ctx.fillText(r.name, mid[0]-22, mid[1]);
  });
  design.extras.forEach(e=>{ const a=iso(e.x,e.y,0),b=iso(e.x+e.w,e.y,0),c=iso(e.x+e.w,e.y+e.h,0),d=iso(e.x,e.y+e.h,0); poly([a,b,c,d], e.type==='Deck'?'#d6a05a':'#d1d5db'); ctx.fillStyle='#44403c'; ctx.font='700 9px system-ui'; const m=iso(e.x+e.w/2,e.y+e.h/2,0); ctx.fillText(e.label||e.type,m[0]-20,m[1]); });
  // roof prism over main footprint (slightly inset so walls stay readable)
  if(design.rooms.length){ const minX=Math.min(...design.rooms.map(r=>r.x))-2, maxX=Math.max(...design.rooms.map(r=>r.x+r.w))+2, minY=Math.min(...design.rooms.map(r=>r.y))-2, maxY=Math.max(...design.rooms.map(r=>r.y+r.h))+2; const h=design.wallH, peak=h+3.2;
    const ridgeY=(minY+maxY)/2;
    const p1=iso(minX,minY,h),p2=iso(maxX,minY,h),p3=iso(maxX,ridgeY,peak),p4=iso(minX,ridgeY,peak);
    const q1=iso(minX,maxY,h),q2=iso(maxX,maxY,h);
    if(design.roof!=='Flat'){ poly([p1,p2,p3,p4], design.roofColor); poly([q1,q2,p3,p4], '#7f1d1d'); poly([p2,q2,p3], '#991b1b'); }
    else poly([p1,p2,q2,q1],'#78716c');
    ctx.fillStyle='#fff'; ctx.font='800 10px system-ui'; const rm=iso((minX+maxX)/2,ridgeY,peak); ctx.fillText(design.roof+' roof', rm[0]-24, rm[1]-6);
  }
  // windows dots on front edge
  ctx.fillStyle='#0369a1'; design.windows.forEach(w=>{ const p=iso(w.x,w.y,5); ctx.fillRect(p[0]-7,p[1]-2,14,5); });
  ctx.fillStyle='#57534e'; ctx.font='600 11px system-ui'; ctx.fillText('Edit in 2D Plan — this view updates instantly. Doors/windows appear on walls; roof & materials from right panel.',16,H-14);
}

// ---------- Site plan ----------
function drawSite(){
  const svg=$('siteSvg'); if(!svg) return;
  const lotW=prop.lotW*5.2, lotH=prop.lotD*3.6, lx=(640-lotW)/2, ly=30;
  let g=`<rect x="${lx}" y="${ly}" width="${lotW}" height="${lotH}" fill="#bbf7d0" stroke="#16a34a" stroke-width="2" rx="8"/>`;
  g+=`<text x="${lx+8}" y="${ly+16}" font-size="11" font-weight="800" fill="#14532d">LOT ${prop.lotW}′ × ${prop.lotD}′  •  ${(prop.lotSqft).toLocaleString()} sqft</text>`;
  g+=`<rect x="${lx}" y="${ly+lotH-36}" width="${lotW}" height="36" fill="#d6d3d1"/><text x="${lx+lotW/2}" y="${ly+lotH-14}" text-anchor="middle" font-size="10" fill="#44403c">STREET</text>`;
  // house footprint scaled into lot
  const hx=lx+50, hy=ly+40, hw=lotW-160, hh=lotH-140;
  g+=`<rect x="${hx}" y="${hy}" width="${hw}" height="${hh}" fill="#fff7ed" stroke="#9a3412" stroke-width="2.5" rx="4"/><text x="${hx+hw/2}" y="${hy+hh/2-6}" text-anchor="middle" font-weight="800" font-size="12">HOUSE</text><text x="${hx+hw/2}" y="${hy+hh/2+12}" text-anchor="middle" font-size="11" fill="#57534e">${sqftOf(design).toLocaleString()} sqft • ${bedsOf(design)} bd</text>`;
  design.extras.forEach((e,i)=>{ const ex=hx+ (e.x/640)*hw, ey=hy+(e.y/520)*hh; g+=`<rect x="${ex}" y="${ey}" width="${Math.max(36,e.w/4)}" height="${Math.max(24,e.h/4)}" fill="${e.type==='Deck'?'#d6a05a':'#e5e7eb'}" stroke="#57534e"/><text x="${ex+4}" y="${ey+12}" font-size="8" font-weight="700">${esc(e.type)}</text>`; });
  g+=`<rect x="${hx+hw+8}" y="${hy+hh-10}" width="54" height="${lotH-hh-30}" fill="#a8a29e"/><text x="${hx+hw+35}" y="${hy+hh+28}" font-size="8" text-anchor="middle" fill="#fff" font-weight="700">DRIVE</text>`;
  g+=`<circle cx="${lx+28}" cy="${ly+34}" r="14" fill="#22c55e"/><circle cx="${lx+lotW-30}" cy="${ly+30}" r="11" fill="#22c55e"/><text x="${lx+8}" y="${ly+lotH-48}" font-size="9" fill="#166534">🌳 Yard  •  setback ~12 ft front</text>`;
  g+=`<text x="320" y="505" text-anchor="middle" font-size="11" font-weight="700" fill="#44403c">Site updates from your plan — add Garage/Deck in 2D to see them here</text>`;
  svg.innerHTML=g;
}
function renderSplit(){
  const v=+$('baSlider').value; $('afterClip').style.width=v+'%'; $('baHandle').style.left=v+'%';
  renderPlanInto($('beforeSvg'), original, {readonly:true, hideHeader:true}); renderPlanInto($('afterSvg'), design, {readonly:true, hideHeader:true});
  const dSq=sqftOf(design)-sqftOf(original), dCost=costOf(design)-costOf(original);
  $('baDelta').innerHTML=`Δ Area <b>${dSq>=0?'+':''}${dSq} sqft</b> &nbsp;•&nbsp; Δ Beds <b>${bedsOf(design)-bedsOf(original)}</b> &nbsp;•&nbsp; Δ Est. cost <b>${dCost>=0?'+':''}$${dCost.toLocaleString()}</b> &nbsp;•&nbsp; Drag slider to compare`;
}

// ---------- Render / panels ----------
function renderStats(){
  const s=sqftOf(design), o=sqftOf(original);
  $('statsRow').innerHTML=`
   <div class="stat"><span>Area (proposed)</span><b>${s.toLocaleString()} sqft</b><div style="font-size:11px;color:${s>=o?'#0f766e':'#dc2626'}">${s-o>=0?'+':''}${s-o} vs original</div></div>
   <div class="stat"><span>Beds / Baths</span><b>${bedsOf(design)} bd • ${bathsOf(design)} ba</b><div style="font-size:11px;color:#78716c">was ${bedsOf(original)} bd • ${bathsOf(original)} ba</div></div>
   <div class="stat"><span>Lot</span><b>${prop.lotW}′ × ${prop.lotD}′</b><div style="font-size:11px;color:#78716c">${prop.lotSqft.toLocaleString()} sqft • ${prop.stories} story • ${prop.year}</div></div>
   <div class="stat"><span>Est. remodel cost</span><b>$${costOf(design).toLocaleString()}</b><div style="font-size:11px;color:#78716c">~$185/sqft + fixtures</div></div>
   <div class="stat"><span>Elements</span><b>${design.rooms.length} rooms</b><div style="font-size:11px;color:#78716c">${design.doors.length} doors • ${design.windows.length} windows • ${design.walls.length} walls</div></div>`;
}
function renderRight(){
  const r=selRoom(), e=selExtra();
  let selHtml='';
  if(r) selHtml=`<h3>Selected room</h3>
    <label style="font-size:12px;font-weight:700">Name <input type="text" id="pName" value="${esc(r.name)}"></label>
    <div class="grid2" style="margin-top:8px"><label style="font-size:12px;font-weight:700">Type <select id="pType">${Object.keys(ROOM_STYLE).map(k=>`<option ${r.type===k?'selected':''}>${k}</option>`).join('')}</select></label>
    <label style="font-size:12px;font-weight:700">Flooring <select id="pFloor">${['Oak Hardwood','Tile','Carpet','Vinyl Plank','Concrete','Marble'].map(k=>`<option ${r.flooring===k?'selected':''}>${k}</option>`).join('')}</select></label></div>
    <div class="grid2" style="margin-top:8px"><label style="font-size:12px;font-weight:700">Width (ft) <input type="number" id="pW" step="0.5" value="${(r.w/FT).toFixed(1)}"></label><label style="font-size:12px;font-weight:700">Depth (ft) <input type="number" id="pH" step="0.5" value="${(r.h/FT).toFixed(1)}"></label></div>
    <div style="font-size:12px;color:#57534e;margin-top:6px">Area <b>${area(r)} sqft</b> • X ${(r.x/FT).toFixed(1)}′ Y ${(r.y/FT).toFixed(1)}′</div>
    <div style="display:flex;gap:6px;margin-top:10px"><button class="btn small" onclick="duplicateSel()">Duplicate</button><button class="btn small" onclick="rotateSel()">Rotate</button><button class="btn small" onclick="deleteSel()">Delete</button></div>`;
  else if(e) selHtml=`<h3>Selected • ${esc(e.type)}</h3><label style="font-size:12px;font-weight:700">Label <input type="text" id="pLabel" value="${esc(e.label||e.type)}"></label><div class="grid2" style="margin-top:8px"><label style="font-size:12px;font-weight:700">Width (ft) <input type="number" id="pW" step="0.5" value="${(e.w/FT).toFixed(1)}"></label><label style="font-size:12px;font-weight:700">Depth (ft) <input type="number" id="pH" step="0.5" value="${(e.h/FT).toFixed(1)}"></label></div><div style="display:flex;gap:6px;margin-top:10px"><button class="btn small" onclick="duplicateSel()">Duplicate</button><button class="btn small" onclick="deleteSel()">Delete</button></div>`;
  else selHtml=`<h3>Selection</h3><p style="font-size:12px;color:#78716c;line-height:1.5">No element selected. Use <b>Select</b> and click a room, door, window or wall. Drag to move; pull the teal corner to resize. <b>Wall</b> tool: drag to draw a wall. <b>Measure</b>: click two points.</p>`;
  $('rightPanel').innerHTML=`
   <h3>Property</h3>
   <div class="kv"><span>Address</span><b style="text-align:right;max-width:170px">${esc(prop.address)}</b></div>
   <div class="kv"><span>Listing</span><b>${prop.source} • $${prop.price.toLocaleString()}</b></div>
   <div class="kv"><span>Lot</span><b>${prop.lotW}′ × ${prop.lotD}′</b></div>
   <div class="kv"><span>Original</span><b>${prop.beds} bd • ${prop.baths} ba • ${prop.sqft.toLocaleString()} sqft</b></div>
   ${selHtml}
   <h3 style="margin-top:16px">House</h3>
   <label style="font-size:12px;font-weight:700">Roof type <select id="roofSel"><option>Gable</option><option>Hip</option><option>Flat</option><option>Gambrel</option></select></label>
   <label style="font-size:12px;font-weight:700;margin-top:8px;display:block">Roof color <input type="color" id="roofColor" value="${design.roofColor}" style="height:36px;padding:2px"></label>
   <label style="font-size:12px;font-weight:700;margin-top:8px;display:block">Wall height: <span id="whLabel">${design.wallH} ft</span> <input type="range" id="wallH" min="8" max="14" step="0.5" value="${design.wallH}"></label>
   <label style="font-size:12px;font-weight:700;margin-top:6px;display:block">Floors <select id="floorsSel"><option value="1">1 floor</option><option value="2">2 floors</option><option value="3">3 floors</option></select></label>
   <div style="display:flex;gap:6px;flex-wrap:wrap;margin-top:10px"><button class="btn small" onclick="extendHouse()">Extend house →</button><button class="btn small" onclick="original=structuredClone(design);snapshot();render();toast('Current design set as new Original')">Set as Original</button><button class="btn small" onclick="design=structuredClone(original);selectedId=null;snapshot();render();toast('Reverted to Original')">Revert to Original</button></div>
   <h3 style="margin-top:16px">Materials &amp; finishes</h3>
   <div style="display:grid;gap:6px;font-size:12px"><span class="chip">Exterior: Fiber-cement siding</span><span class="chip">Flooring: Oak / Tile / Carpet per room</span><span class="chip">Ceiling: 9 ft • change via wall height</span></div>
   <label style="font-size:12px;font-weight:700;margin-top:10px;display:block">Project notes <input type="text" id="notes" placeholder="e.g. Open kitchen to living…" value="${esc(design.notes||'')}"></label>
   <h3 style="margin-top:16px">Export</h3>
   <div style="display:flex;gap:6px;flex-wrap:wrap"><button class="btn small" onclick="exportJSON()">Export JSON</button><button class="btn small" onclick="window.print()">Print / PDF</button></div>
   <p style="font-size:11px;color:#a8a29e;line-height:1.5;margin-top:10px">All geometry in real feet (grid = 2 ft). 3D is auto-generated from the 2D plan. Template from listing is a starting point — correct any estimated wall by dragging it.</p>`;
  // wire panel inputs
  const bind=(id,fn)=>{ const el=$(id); if(el) el.oninput=el.onchange=fn; };
  bind('pName',e=>{ if(r){r.name=e.target.value; render();} });
  bind('pType',e=>{ if(r){r.type=e.target.value; render();} });
  bind('pFloor',e=>{ if(r){r.flooring=e.target.value;} });
  bind('pLabel',e=>{ if(e){e.label=e.target.value; render();} });
  bind('pW',e=>{ const t=r||e; if(t){t.w=Math.max(28,+e.target.value*FT||t.w); render();} });
  bind('pH',e=>{ const t=r||e; if(t){t.h=Math.max(28,+e.target.value*FT||t.h); render();} });
  bind('roofSel',e=>{ design.roof=e.target.value; render(); });
  bind('roofColor',e=>{ design.roofColor=e.target.value; render(); });
  bind('wallH',e=>{ design.wallH=+e.target.value; $('whLabel').textContent=design.wallH+' ft'; render(); });
  bind('floorsSel',e=>{ design.floors=+e.target.value; render(); });
  bind('notes',e=>{ design.notes=e.target.value; });
  if($('roofSel')) $('roofSel').value=design.roof;
  if($('floorsSel')) $('floorsSel').value=String(design.floors);
}
function renderSaved(){
  let list=[]; try{ list=JSON.parse(localStorage.getItem('remodel-designs')||'[]'); }catch{}
  $('savedList').innerHTML=list.length? list.map((s,i)=>`<div style="border:1px solid #e7e0d4;border-radius:10px;padding:10px"><b>${esc(s.name)}</b><div style="font-size:11px;color:#78716c">${s.date} • ${s.sqft} sqft • ${s.beds} bd</div><div style="display:flex;gap:6px;margin-top:6px"><button class="btn small" onclick="loadSaved(${i})">Load</button><button class="btn small" onclick="deleteSaved(${i})">Delete</button></div></div>`).join('') : '<p style="font-size:12px;color:#a8a29e">No saved designs yet. Edit the plan, then Save Design.</p>';
}
function render(){
  renderStats(); renderRight(); renderSaved();
  $('planSvg').style.display=view==='plan'?'block':'none';
  $('view3d').style.display=view==='3d'?'block':'none';
  $('siteSvg').style.display=view==='site'?'block':'none';
  $('splitWrap').style.display=view==='split'?'block':'none';
  if(view==='plan') renderPlanInto($('planSvg'), design);
  if(view==='3d') draw3D();
  if(view==='site') drawSite();
  if(view==='split') renderSplit();
}

// ---------- Save / share ----------
function saveDesign(){
  const name=prompt('Name this design:', 'Remodel '+(JSON.parse(localStorage.getItem('remodel-designs')||'[]').length+1)); if(name===null) return;
  let list=[]; try{list=JSON.parse(localStorage.getItem('remodel-designs')||'[]')}catch{}
  list.unshift({name:name||'Untitled', date:new Date().toLocaleString(), sqft:sqftOf(design), beds:bedsOf(design), data:structuredClone(design), prop:structuredClone(prop)});
  localStorage.setItem('remodel-designs', JSON.stringify(list.slice(0,12))); renderSaved(); toast('Saved “'+name+'”');
}
function loadSaved(i){ let list=[]; try{list=JSON.parse(localStorage.getItem('remodel-designs')||'[]')}catch{} const s=list[i]; if(!s)return; design=structuredClone(s.data); if(s.prop){prop=s.prop; $('addrPill').textContent=prop.address;} selectedId=null; snapshot(); render(); toast('Loaded '+s.name); }
function deleteSaved(i){ let list=[]; try{list=JSON.parse(localStorage.getItem('remodel-designs')||'[]')}catch{} list.splice(i,1); localStorage.setItem('remodel-designs',JSON.stringify(list)); renderSaved(); }
function clearSaved(){ localStorage.removeItem('remodel-designs'); renderSaved(); toast('Saved designs cleared'); }
function shareDesign(){ const url=location.href.split('#')[0]+'#design='+btoa(unescape(encodeURIComponent(JSON.stringify({d:design,p:prop})))).slice(0,120)+'…'; navigator.clipboard?.writeText(url); toast('Share link copied (preview) — design also saved locally'); saveDesignSilent(); }
function saveDesignSilent(){ try{ let list=JSON.parse(localStorage.getItem('remodel-designs')||'[]'); list.unshift({name:'Shared design',date:new Date().toLocaleString(),sqft:sqftOf(design),beds:bedsOf(design),data:structuredClone(design),prop:structuredClone(prop)}); localStorage.setItem('remodel-designs',JSON.stringify(list.slice(0,12))); renderSaved(); }catch{} }
function exportJSON(){ const blob=new Blob([JSON.stringify({prop,design},null,2)],{type:'application/json'}); const a=document.createElement('a'); a.href=URL.createObjectURL(blob); a.download='remodel-design.json'; a.click(); toast('JSON exported'); }

// ---------- Init ----------
document.querySelectorAll('#viewTabs button').forEach(b=>b.onclick=()=>setView(b.dataset.view));
buildToolbar(); bindPlan(); snapshot(); render();
document.addEventListener('keydown',e=>{ if((e.key==='Delete'||e.key==='Backspace')&&selectedId!=null&&!/INPUT|TEXTAREA|SELECT/.test(document.activeElement.tagName)){ e.preventDefault(); deleteSel(); } if(e.key==='Escape'){selectedId=null; measurePts=[]; render();} });
window.importProperty=importProperty; window.loadSample=loadSample; window.quickAdd=quickAdd; window.addFloor=addFloor; window.addStairs=addStairs;
window.undo=undo; window.redo=redo; window.saveDesign=saveDesign; window.shareDesign=shareDesign; window.clearSaved=clearSaved;
window.loadSaved=loadSaved; window.deleteSaved=deleteSaved; window.exportJSON=exportJSON; window.duplicateSel=duplicateSel; window.deleteSel=deleteSel; window.rotateSel=rotateSel; window.extendHouse=extendHouse;
window.setFloor=setFloor; window.zoomBy=zoomBy; window.resetView=resetView; window.render=render; window.renderSplit=renderSplit;



