/* VicThree Vocab — shared data + storage + PNG renderer */
(function(){
  "use strict";
  const VV = window.VV = {};
  const BASE = location.pathname.replace(/[^/]*$/,'');

  /* ---------- data loading ---------- */
  let _words=null, _questions=null, _byId=null;
  async function fetchJSON(name){
    const r = await fetch(BASE+'data/'+name, {cache:'no-cache'});
    if(!r.ok) throw new Error('Failed to load '+name);
    return r.json();
  }
  VV.loadWords = async function(){
    if(_words) return _words;
    _words = await fetchJSON('words.json');
    _byId = {}; _words.forEach(w=>_byId[w.id]=w);
    return _words;
  };
  VV.loadQuestions = async function(){
    if(_questions) return _questions;
    _questions = await fetchJSON('questions.json');
    return _questions;
  };
  VV.wordById = id => _byId ? _byId[id] : null;

  /* ---------- localStorage: bookmarks + progress ---------- */
  const BK='vv_bookmarks', PR='vv_progress';
  function read(k){ try{return JSON.parse(localStorage.getItem(k)||'{}');}catch(e){return {};} }
  function write(k,v){ try{localStorage.setItem(k,JSON.stringify(v));}catch(e){} }

  VV.getBookmarks = ()=>read(BK);
  VV.isBookmarked = id=>!!read(BK)[id];
  VV.toggleBookmark = function(id){
    const b=read(BK); if(b[id]) delete b[id]; else b[id]=1; write(BK,b); return !!b[id];
  };
  VV.bookmarkCount = ()=>Object.keys(read(BK)).length;

  // progress: id -> 'got' | 'missed'
  VV.getProgress = ()=>read(PR);
  VV.getStatus = id=>read(PR)[id]||'';
  VV.setStatus = function(id,status){
    const p=read(PR); if(status) p[id]=status; else delete p[id]; write(PR,p);
  };
  VV.progressStats = function(){
    const p=read(PR); let got=0,missed=0;
    Object.values(p).forEach(v=>{ if(v==='got')got++; else if(v==='missed')missed++; });
    return {got,missed,seen:got+missed};
  };
  VV.resetProgress = ()=>write(PR,{});

  // seen set (for no-repeat Learn/Practice mode) — id -> 1
  const SN='vv_seen';
  VV.isSeen = id=>!!read(SN)[id];
  VV.markSeen = function(id){ const s=read(SN); s[id]=1; write(SN,s); };
  VV.seenCount = ()=>Object.keys(read(SN)).length;
  VV.resetSeen = function(ids){ // ids array -> clear those; no arg -> clear all
    if(!ids){ write(SN,{}); return; }
    const s=read(SN); ids.forEach(id=>delete s[id]); write(SN,s);
  };

  /* ---------- helpers ---------- */
  VV.shuffle = function(a){ a=a.slice(); for(let i=a.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[a[i],a[j]]=[a[j],a[i]];} return a; };
  VV.esc = s => (s==null?'':String(s)).replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
  VV.letter = i => 'abcd'[i];
  VV.levelClass = lv => 'lvl-'+(lv||'').toLowerCase();
  // display title for any detail record
  VV.titleOf = w => w ? w.word : '';
  VV.kindLabel = k => ({word:'Word', idiom:'Idiom', ows:'One-word substitution'}[k]||k);

  /* ---------- detail card HTML (shared by browse + quiz) ---------- */
  VV.detailHTML = function(w){
    if(!w) return '';
    const e=VV.esc;
    let h='<div class="dword"><h3>'+e(w.word)+'</h3>';
    h+='<span class="badge">'+e(VV.kindLabel(w.kind))+'</span>';
    if(w.tier) h+='<span class="badge">'+e(w.tier)+'</span>';
    if(w.level) h+='<span class="badge '+VV.levelClass(w.level)+'">'+e(w.level)+'</span>';
    h+='</div>';
    if(w.kind==='ows'){
      h+='<p class="dmeaning"><span style="color:var(--muted)">Definition:</span> '+e(w.desc)+'</p>';
    } else if(w.meaning){
      h+='<p class="dmeaning">'+e(w.meaning)+'</p>';
    }
    if(w.example) h+='<p class="drow ex">“'+e(w.example)+'”</p>';
    if(w.syn && w.syn.length){
      h+='<div class="drow"><span class="k">Synonyms</span><span class="tags">'+
        w.syn.map(s=>'<span class="tag syn">'+e(s)+'</span>').join('')+'</span></div>';
    }
    if(w.ant && w.ant.length){
      h+='<div class="drow"><span class="k">Antonyms</span><span class="tags">'+
        w.ant.map(s=>'<span class="tag ant">'+e(s)+'</span>').join('')+'</span></div>';
    }
    if(w.trick){
      const k = w.kind==='ows' ? 'Memory hook' : 'Rule to remember';
      h+='<div class="trick"><span class="k">💡 '+k+': </span>'+e(w.trick)+'</div>';
    }
    return h;
  };

  /* ---------- Canvas -> PNG (dependency-free) ---------- */
  VV.downloadCardPNG = function(w){
    const W=820, pad=46, scale=2;
    const cv=document.createElement('canvas');
    const ctx=cv.getContext('2d');
    const FS={title:46, badge:18, label:20, body:24, italic:23, trick:22, brand:22, foot:16};
    const FF='"Segoe UI",system-ui,Arial,sans-serif';
    const navy='#0B1F3A', gold='#C9A24B', ink='#1b2c45', muted='#5b6b82', green='#1e9e5a', red='#d23b48';

    function font(px,wt){ return (wt||'')+' '+px+'px '+FF; }
    function wrap(text,maxW,px,wt){
      ctx.font=font(px,wt);
      const words=String(text).split(/\s+/); const lines=[]; let line='';
      words.forEach(wd=>{
        const t=line?line+' '+wd:wd;
        if(ctx.measureText(t).width>maxW && line){ lines.push(line); line=wd; }
        else line=t;
      });
      if(line) lines.push(line);
      return lines;
    }
    // ---- measure pass to compute height ----
    const innerW=W-pad*2;
    let y=0; const ops=[]; // recorded draw ops, replayed after sizing
    function push(type,data,h){ ops.push({type,data,y:y}); y+=h; }

    y=pad+64; // header band space
    // title
    ops.push({type:'title',data:w.word,y:y}); y+=FS.title+10;
    // badges line (kind / tier / level) drawn as text
    let badges=[VV.kindLabel(w.kind)];
    if(w.tier)badges.push(w.tier);
    if(w.level)badges.push(w.level);
    ops.push({type:'badges',data:badges,y:y}); y+=FS.badge+22;

    function block(label,text,style){
      if(!text) return;
      if(label){ ops.push({type:'label',data:label,y:y}); y+=FS.label+6; }
      const px = style==='italic'?FS.italic:(style==='trick'?FS.trick:FS.body);
      const lines=wrap(text, innerW - (style==='trick'?28:0), px, style==='trick'?'':'');
      ops.push({type:style||'body',data:lines,y:y}); y+= lines.length*(px+8) + 12;
    }
    if(w.kind==='ows') block('DEFINITION', w.desc);
    else block('MEANING', w.meaning);
    block(w.kind==='idiom'?'EXAMPLE':'EXAMPLE', w.example?('“'+w.example+'”'):'', 'italic');
    if(w.syn&&w.syn.length) block('SYNONYMS', w.syn.join(',  '));
    if(w.ant&&w.ant.length) block('ANTONYMS', w.ant.join(',  '));
    if(w.trick) block(null, (w.kind==='ows'?'💡 Memory hook: ':'💡 Rule to remember: ')+w.trick, 'trick');

    y+=pad+30; // footer space
    const H=y;

    // ---- size canvas ----
    cv.width=W*scale; cv.height=H*scale; ctx.scale(scale,scale);
    cv.style.width=W+'px';

    // ---- paint ----
    ctx.fillStyle='#ffffff'; ctx.fillRect(0,0,W,H);
    // header band
    ctx.fillStyle=navy; ctx.fillRect(0,0,W,8);
    // brand top-right
    ctx.textBaseline='alphabetic';
    ctx.font=font(FS.brand,'bold'); ctx.fillStyle=gold; ctx.textAlign='right';
    ctx.fillText('VicThree • Vocab', W-pad, pad+8);
    ctx.textAlign='left';

    ops.forEach(op=>{
      if(op.type==='title'){
        ctx.font=font(FS.title,'800'); ctx.fillStyle=navy;
        ctx.fillText(op.data, pad, op.y+FS.title*0.85);
      } else if(op.type==='badges'){
        let x=pad; ctx.font=font(FS.badge,'600');
        op.data.forEach(b=>{
          const tw=ctx.measureText(b).width;
          ctx.fillStyle='#eef1f6'; roundRect(x,op.y-2,tw+22,FS.badge+12,8); ctx.fill();
          ctx.fillStyle=muted; ctx.fillText(b, x+11, op.y+FS.badge+2);
          x+=tw+30;
        });
      } else if(op.type==='label'){
        ctx.font=font(FS.label,'700'); ctx.fillStyle=gold;
        ctx.fillText(op.data, pad, op.y+FS.label*0.85);
      } else if(op.type==='body'||op.type==='italic'){
        const px= op.type==='italic'?FS.italic:FS.body;
        ctx.font=font(px, op.type==='italic'?'italic':''); ctx.fillStyle= op.type==='italic'?'#3a4a63':ink;
        op.data.forEach((ln,i)=>ctx.fillText(ln, pad, op.y+px*0.85+i*(px+8)));
      } else if(op.type==='trick'){
        const px=FS.trick; const h=op.data.length*(px+8)+18;
        ctx.fillStyle='#fbf6e9'; roundRect(pad,op.y-6,innerW,h,10); ctx.fill();
        ctx.strokeStyle=gold; ctx.setLineDash([5,4]); ctx.strokeRect(pad,op.y-6,innerW,h); ctx.setLineDash([]);
        ctx.font=font(px,''); ctx.fillStyle='#7a5d12';
        op.data.forEach((ln,i)=>ctx.fillText(ln, pad+14, op.y+px*0.85+i*(px+8)+4));
      }
    });
    // footer
    ctx.font=font(FS.foot,''); ctx.fillStyle=muted;
    ctx.fillText('CDS & AFCAT English Vocabulary  •  victhree.github.io/victhree-vocab', pad, H-pad+10);

    function roundRect(x,y2,w2,h2,r){
      ctx.beginPath();
      ctx.moveTo(x+r,y2); ctx.arcTo(x+w2,y2,x+w2,y2+h2,r); ctx.arcTo(x+w2,y2+h2,x,y2+h2,r);
      ctx.arcTo(x,y2+h2,x,y2,r); ctx.arcTo(x,y2,x+w2,y2,r); ctx.closePath();
    }

    // download
    cv.toBlob(function(blob){
      const a=document.createElement('a');
      const fn=(w.word||'card').replace(/[^a-z0-9]+/gi,'_');
      a.href=URL.createObjectURL(blob); a.download='vocab_'+fn+'.png';
      document.body.appendChild(a); a.click();
      setTimeout(()=>{URL.revokeObjectURL(a.href); a.remove();},1000);
    },'image/png');
  };

  /* ---------- service worker ---------- */
  if('serviceWorker' in navigator){
    window.addEventListener('load',()=>navigator.serviceWorker.register(BASE+'sw.js').catch(()=>{}));
  }
})();
