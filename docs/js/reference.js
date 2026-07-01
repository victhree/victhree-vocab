/* VicThree Vocab — Word Toolkit (Roots · Synonym Clusters · Confusables) */
(async function(){
  const $=s=>document.querySelector(s);
  const BASE=location.pathname.replace(/[^/]*$/,'');
  const params=new URLSearchParams(location.search);
  let tab=params.get('tab'); if(!['roots','clusters','confusables'].includes(tab)) tab='roots';

  async function j(n){ const r=await fetch(BASE+'data/'+n,{cache:'no-cache'}); return r.json(); }
  let roots, clusters, conf;
  try{ [roots,clusters,conf]=await Promise.all([j('roots.json'),j('clusters.json'),j('confusables.json')]); }
  catch(e){ $('#list').innerHTML='<div class="empty">Could not load toolkit data.</div>'; return; }

  const e=VV.esc;
  let rootKind='all', q='';

  const INTRO={
    roots:'One root unlocks a whole family of words — learn the root, decode words you’ve never seen.',
    clusters:'Exam options are usually drawn from one cluster. Learn the cluster; the opposite cluster is your antonym pool.',
    confusables:'Favourites in spelling, error-spotting and sentence-improvement questions — know the difference.'
  };

  function matches(text){ return !q || text.toLowerCase().includes(q); }

  function renderRoots(){
    let items=roots.filter(r=>rootKind==='all'||r.kind===rootKind);
    items=items.filter(r=>matches(r.term+' '+r.meaning+' '+(r.examples||[]).join(' ')+' '+r.rule));
    $('#count').textContent=items.length+' entries';
    if(!items.length){ $('#list').innerHTML='<div class="empty">No matches.</div>'; return; }
    $('#list').innerHTML=items.map(r=>
      '<div class="wcard">'+
        '<h3 class="dword">'+e(r.term)+' <span class="kindtag">'+e(r.kind)+'</span></h3>'+
        '<p class="dmeaning">'+e(r.meaning)+'</p>'+
        ((r.examples&&r.examples.length)?'<p class="dline"><span class="dk">Family</span> '+e(r.examples.join(', '))+'</p>':'')+
        (r.rule?'<div class="dtrick"><b>💡 Rule:</b> '+e(r.rule)+'</div>':'')+
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
        '<p class="dline dclust">'+c.words.map(w=>'<span class="wchip">'+e(w)+'</span>').join('')+'</p>'+
      '</div>'
    ).join('');
  }
  function renderConf(){
    let items=conf.filter(c=>matches(c.a+' '+c.b+' '+c.difference+' '+c.tip));
    $('#count').textContent=items.length+' pairs';
    if(!items.length){ $('#list').innerHTML='<div class="empty">No matches.</div>'; return; }
    $('#list').innerHTML=items.map(c=>
      '<div class="wcard">'+
        '<h3 class="dword">'+e(c.a)+' <span class="vs">vs</span> '+e(c.b)+'</h3>'+
        '<p class="dmeaning">'+e(c.difference)+'</p>'+
        (c.tip?'<div class="dtrick"><b>💡 Tip:</b> '+e(c.tip)+'</div>':'')+
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
