/* VicThree Vocab — Vocabulary PYQs (previous-year questions by topic & year) */
(async function(){
  const $=s=>document.querySelector(s);
  const params=new URLSearchParams(location.search);
  let type = params.get('type') || 'all';
  let year = params.get('year') || 'all';

  let pyq;
  try{ pyq = await VV.loadPYQ(); }
  catch(e){ $('#list').innerHTML='<div class="empty">Could not load PYQ data.</div>'; return; }

  const years = Array.from(new Set(pyq.map(q=>q.year))).sort((a,b)=>b-a);

  function typeCount(k){ return k==='all' ? pyq.length : pyq.filter(q=>q.type===k).length; }

  function buildFilters(){
    const ft=$('#f-type'), fy=$('#f-year');
    const types=[{key:'all',label:'All topics'}].concat(VV.PYQ_TYPES).filter(t=>t.key==='all'||typeCount(t.key)>0);
    ft.innerHTML = types.map(t=>'<option value="'+t.key+'"'+(t.key===type?' selected':'')+'>'+t.label+' ('+typeCount(t.key)+')</option>').join('');
    fy.innerHTML = ['<option value="all"'+(year==='all'?' selected':'')+'>All years</option>']
      .concat(years.map(y=>'<option value="'+y+'"'+(String(y)===year?' selected':'')+'>'+y+'</option>')).join('');
    ft.addEventListener('change',()=>{ type=ft.value; syncUrl(); renderList(); });
    fy.addEventListener('change',()=>{ year=fy.value; syncUrl(); renderList(); });
  }
  function syncUrl(){
    const p=new URLSearchParams();
    if(type!=='all') p.set('type',type);
    if(year!=='all') p.set('year',year);
    history.replaceState(null,'',location.pathname+(p.toString()?'?'+p:''));
  }

  function filtered(){
    return pyq.filter(q=>(type==='all'||q.type===type) && (year==='all'||String(q.year)===year));
  }


  // bold the tested word inside the stem (synonym/antonym/usage)
  function stemHTML(q){
    let s=VV.esc(q.stem);
    if(q.word && /^(synonym|antonym|usage|meaning)$/.test(q.type)){
      const w=q.word.split(/[\s→/(]/)[0].trim();
      if(w && w.length>2){
        try{ s=s.replace(new RegExp('\\b('+w.replace(/[.*+?^${}()|[\]\\]/g,'\\$&')+')\\b','i'),'<span class="cap">$1</span>'); }catch(e){}
      }
    }
    return s;
  }

  function renderList(){
    const list = filtered();
    $('#count').textContent = list.length+' question'+(list.length===1?'':'s')
      + (type!=='all' ? ' · '+VV.pyqTypeLabel(type) : '')
      + (year!=='all' ? ' · '+year : '');
    if(!list.length){ $('#list').innerHTML='<div class="empty">No questions for this filter.</div>'; return; }
    $('#list').innerHTML = list.map((q,i)=>{
      const opts=q.options.map((o,oi)=>
        '<div class="opt clickable" data-i="'+i+'" data-oi="'+oi+'"><span class="lt">'+VV.letter(oi)+'</span><span>'+VV.esc(o)+'</span></div>'
      ).join('');
      const dir=VV.pyqDirections(q.type);
      return '<div class="qcard" data-qi="'+i+'">'+
        '<div class="qhead"><span class="pyqtag">PYQ · '+VV.esc(q.paper)+' · '+q.year+'</span>'+
          '<span class="qtype">'+VV.esc(VV.pyqTypeLabel(q.type))+'</span></div>'+
        (dir?'<p class="pyq-directions">'+VV.esc(dir)+'</p>':'')+
        '<div class="stem">'+stemHTML(q)+'</div>'+
        '<div class="opts">'+opts+'</div>'+
        '<div class="detail" id="pd'+i+'"></div>'+
      '</div>';
    }).join('');
    const cards=$('#list').querySelectorAll('.qcard');
    $('#list').querySelectorAll('.opt').forEach(o=>o.addEventListener('click',()=>reveal(list,cards,+o.dataset.i,+o.dataset.oi)));
    window.scrollTo({top:0,behavior:'auto'});
  }

  const answered={};
  function reveal(list,cards,i,oi){
    if(answered[i]) return;
    answered[i]=true;
    const q=list[i], card=cards[i];
    const opts=card.querySelectorAll('.opt');
    opts.forEach(o=>o.classList.remove('clickable'));
    opts[q.answer].classList.add('correct');
    if(oi!==q.answer) opts[oi].classList.add('wrong');
    const verdict = oi===q.answer
      ? '<span class="pbadge got">✓ Correct</span>'
      : '<span class="pbadge missed">✗ Answer: '+VV.letter(q.answer).toUpperCase()+'</span>';
    let h='<div class="dtop"><div>'+verdict+'</div></div>';
    h+='<p class="dline"><span class="dk">Why</span> '+VV.esc(q.explanation||'')+'</p>';
    if(q.note) h+='<p class="dnote">⚠ '+VV.esc(q.note)+'</p>';
    const d=card.querySelector('.detail');
    d.innerHTML=h; d.classList.add('show');
  }

  buildFilters();
  renderList();
})();
