/* VicThree Vocab — Word Toolkit (Roots · Synonym Clusters · Confusables) */
(async function(){
  const $=s=>document.querySelector(s);
  const BASE=location.pathname.replace(/[^/]*$/,'');
  const params=new URLSearchParams(location.search);
  let tab=params.get('tab'); if(!['roots','clusters','confusables'].includes(tab)) tab='roots';

  async function j(n){ const r=await fetch(BASE+'data/'+n,{cache:'no-cache'}); return r.json(); }
  let roots, clusters, conf, words;
  try{ [roots,clusters,conf,words]=await Promise.all([j('roots.json'),j('clusters.json'),j('confusables.json'),VV.loadWords()]); }
  catch(e){ $('#list').innerHTML='<div class="empty">Could not load toolkit data.</div>'; return; }

  const e=VV.esc;
  let rootKind='all', q='';

  // map cluster words -> word-bank records (so cluster words open their card)
  const byWord={};
  words.forEach(w=>{ const k=(w.word||'').toLowerCase().trim(); if(k && !byWord[k]) byWord[k]=w.id; });

  const INTRO={
    roots:'One root unlocks a whole family of words — learn the root, decode words you’ve never seen.',
    clusters:'Exam options are usually drawn from one cluster. Learn the cluster; the opposite cluster is your antonym pool.',
    confusables:'Favourites in spelling, error-spotting and sentence-improvement questions — know the difference.'
  };

  function matches(text){ return !q || text.toLowerCase().includes(q); }

  function renderRoots(){
    let items=roots.filter(r=>rootKind==='all'||r.kind===rootKind);
    items=items.filter(r=>matches(r.term+' '+r.meaning+' '+(r.examples||[]).join(' ')+' '+(r.example||'')));
    $('#count').textContent=items.length+' entries';
    if(!items.length){ $('#list').innerHTML='<div class="empty">No matches.</div>'; return; }
    $('#list').innerHTML=items.map(r=>
      '<div class="wcard">'+
        '<h3 class="dword">'+e(r.term)+' <span class="meaningtag">'+e(r.meaning)+'</span></h3>'+
        ((r.examples&&r.examples.length)?'<p class="dline"><span class="dk">Family</span> '+e(r.examples.join(', '))+'</p>':'')+
        (r.example?'<p class="dex">“'+e(r.example)+'”</p>':'')+
      '</div>'
    ).join('');
  }
  function renderClusters(){
    let items=clusters.filter(c=>matches(c.group+' '+(c.words||[]).join(' ')));
    $('#count').textContent=items.length+' clusters';
    if(!items.length){ $('#list').innerHTML='<div class="empty">No matches.</div>'; return; }
    $('#list').innerHTML=items.map(c=>
      '<div class="wcard">'+
        '<h3 class="dword">'+e(c.group)+'</h3>'+
        '<p class="dline dclust">'+c.words.map(w=>{
          const id=byWord[(w||'').toLowerCase().trim()];
          return id ? '<button class="wchip link" data-wid="'+id+'">'+e(w)+'</button>'
                    : '<span class="wchip">'+e(w)+'</span>';
        }).join('')+'</p>'+
      '</div>'
    ).join('');
    $('#list').querySelectorAll('.wchip.link').forEach(b=>b.addEventListener('click',()=>openModal(b.dataset.wid)));
  }

  // ---- word-card popup (opened from a cluster word) ----
  function openModal(id){
    const w=VV.wordById(id); if(!w) return;
    $('#modal-card').innerHTML=
      '<div class="dtop"><div></div><div class="dtools">'+
        '<button class="star'+(VV.isBookmarked(w.id)?' on':'')+'" title="Bookmark">★</button>'+
        VV.dlButton()+
        '<button class="iconbtn" id="mclose" title="Close" aria-label="Close">✕</button>'+
      '</div></div>'+VV.detailHTML(w);
    const card=$('#modal-card');
    const star=card.querySelector('.star');
    if(star) star.addEventListener('click',()=>{ const on=VV.toggleBookmark(w.id); star.classList.toggle('on',on); });
    const dl=card.querySelector('.dl');
    if(dl) dl.addEventListener('click',()=>VV.downloadCardPNG(w));
    card.querySelector('#mclose').addEventListener('click',closeModal);
    $('#modal').hidden=false;
  }
  function closeModal(){ $('#modal').hidden=true; }
  $('#modal').addEventListener('click',ev=>{ if(ev.target.id==='modal') closeModal(); });
  document.addEventListener('keydown',ev=>{ if(ev.key==='Escape') closeModal(); });
  function renderConf(){
    let items=conf.filter(c=>matches(c.a+' '+c.b+' '+c.am+' '+c.bm+' '+(c.ae||'')+' '+(c.be||'')));
    $('#count').textContent=items.length+' pairs';
    if(!items.length){ $('#list').innerHTML='<div class="empty">No matches.</div>'; return; }
    const one=(word,mean,ex)=>
      '<div class="confrow">'+
        '<p class="dline"><span class="cw">'+e(word)+'</span> — '+e(mean)+'</p>'+
        (ex?'<p class="dex">“'+e(ex)+'”</p>':'')+
      '</div>';
    $('#list').innerHTML=items.map(c=>
      '<div class="wcard">'+
        '<h3 class="dword">'+e(c.a)+' <span class="vs">vs</span> '+e(c.b)+'</h3>'+
        one(c.a,c.am,c.ae)+
        one(c.b,c.bm,c.be)+
      '</div>'
    ).join('');
  }

  function render(){
    $('#intro').textContent=INTRO[tab];
    $('#rootkinds').style.display = tab==='roots' ? 'flex' : 'none';
    if(tab==='roots') renderRoots();
    else if(tab==='clusters') renderClusters();
    else renderConf();
  }

  // tab chips
  $('#tabs').querySelectorAll('.chip').forEach(c=>{
    c.classList.toggle('on', c.dataset.tab===tab);
    c.addEventListener('click',()=>{
      tab=c.dataset.tab;
      $('#tabs').querySelectorAll('.chip').forEach(x=>x.classList.toggle('on',x===c));
      render();
    });
  });
  $('#rootkinds').querySelectorAll('.chip').forEach(c=>{
    c.addEventListener('click',()=>{
      rootKind=c.dataset.k;
      $('#rootkinds').querySelectorAll('.chip').forEach(x=>x.classList.toggle('on',x===c));
      render();
    });
  });
  $('#search').addEventListener('input',ev=>{ q=ev.target.value.trim().toLowerCase(); render(); });

  render();
})();
