/* VicThree Vocab — quiz */
(async function(){
  const $=s=>document.querySelector(s);
  const params=new URLSearchParams(location.search);
  const partFilter=params.get('part'); // A | B | C | null

  let words, allQ;
  try{ [words,allQ]=await Promise.all([VV.loadWords(),VV.loadQuestions()]); }
  catch(e){ $('#list').innerHTML='<div class="empty">Could not load quiz data.</div>'; return; }

  const TYPE_LABEL={synonym:'Synonym',antonym:'Antonym',idiom:'Idiom',ows:'One-word substitution'};
  let pool=[], answered=0, correct=0;

  function buildPool(){
    let qs=allQ.slice();
    if(partFilter) qs=qs.filter(q=>q.part===partFilter);
    const cnt=parseInt($('#count').value,10);
    qs=VV.shuffle(qs);
    if(cnt>0) qs=qs.slice(0,cnt);
    pool=qs; answered=0; correct=0;
    render();
  }

  function render(){
    const list=$('#list');
    if(!pool.length){ list.innerHTML='<div class="empty">No questions.</div>'; return; }
    list.innerHTML=pool.map((q,i)=>cardHTML(q,i)).join('');
    updateBar();
    // bind
    list.querySelectorAll('.qcard').forEach(card=>{
      const qi=+card.dataset.qi;
      card.querySelectorAll('.opt').forEach(o=>o.addEventListener('click',()=>onPick(card,qi,+o.dataset.oi)));
      const star=card.querySelector('.star');
      if(star) star.addEventListener('click',()=>{
        const on=VV.toggleBookmark(card.dataset.wid); star.classList.toggle('on',on);
      });
      const dl=card.querySelector('.dl');
      if(dl) dl.addEventListener('click',()=>VV.downloadCardPNG(VV.wordById(card.dataset.wid)));
    });
  }

  function cardHTML(q,i){
    const w=VV.wordById(q.wordId);
    const stem=highlightCap(q.stem);
    const opts=q.options.map((o,oi)=>
      '<div class="opt clickable" data-oi="'+oi+'"><span class="lt">'+VV.letter(oi)+'</span><span>'+VV.esc(o)+'</span></div>'
    ).join('');
    return '<div class="qcard" data-qi="'+i+'" data-wid="'+(w?w.id:'')+'">'+
      '<div class="qhead"><span class="qnum">Q'+(i+1)+'</span>'+
        '<span class="qtype">'+(TYPE_LABEL[q.type]||q.type)+'</span></div>'+
      '<div class="stem">'+stem+'</div>'+
      '<div class="opts">'+opts+'</div>'+
      '<div class="detail" id="d'+i+'"></div>'+
    '</div>';
  }
  // bold the trailing CAPITALISED word / quoted phrase in the stem
  function highlightCap(stem){
    let s=VV.esc(stem);
    s=s.replace(/([A-Z][A-Z\- ]{2,})$/,'<span class="cap">$1</span>');
    s=s.replace(/(&quot;[^&]*&quot;)/,'<span class="cap">$1</span>');
    return s;
  }

  function onPick(card,qi,oi){
    if(card.classList.contains('answered')) return;
    card.classList.add('answered');
    const q=pool[qi];
    const opts=card.querySelectorAll('.opt');
    opts.forEach(o=>o.classList.remove('clickable'));
    opts[q.answer].classList.add('correct');
    const ok = oi===q.answer;
    if(!ok) opts[oi].classList.add('wrong');
    answered++; if(ok) correct++;

    // reveal detail card
    const w=VV.wordById(q.wordId);
    const d=card.querySelector('.detail');
    d.innerHTML=detailWithActions(w,ok);
    d.classList.add('show');
    bindDetail(card,w);

    // record progress on the linked word
    if(w) VV.setStatus(w.id, ok?'got':'missed');
    updateBar();
  }

  function detailWithActions(w,ok){
    if(!w) return '<p class="dmeaning">Details unavailable.</p>';
    const verdict = ok
      ? '<span class="pbadge got">✓ Correct</span>'
      : '<span class="pbadge missed">✗ Review this one</span>';
    let h='<div style="display:flex;align-items:center;gap:10px;margin-bottom:4px">'+verdict+
      '<button class="star'+(VV.isBookmarked(w.id)?' on':'')+'" title="Bookmark">★</button></div>';
    h+=VV.detailHTML(w);
    h+='<div class="dactions">'+
       '<button class="btn sm outline dl">⬇ Download card (PNG)</button>'+
       '</div>';
    return h;
  }
  function bindDetail(card,w){
    if(!w) return;
    const star=card.querySelector('.star');
    if(star) star.addEventListener('click',()=>{
      const on=VV.toggleBookmark(w.id); star.classList.toggle('on',on);
    });
    const dl=card.querySelector('.dl');
    if(dl) dl.addEventListener('click',()=>VV.downloadCardPNG(w));
  }

  function updateBar(){
    const total=pool.length;
    $('#sb-done').textContent=answered;
    $('#sb-total').textContent=total;
    $('#sb-score').textContent=correct;
    const pct= answered? Math.round(correct/answered*100):0;
    $('#sb-pct').textContent=pct+'%';
    $('#sb-fill').style.width=(total?answered/total*100:0)+'%';
  }

  // title
  const titles={A:'Synonyms & Antonyms',B:'Idioms & Phrases',C:'One-word Substitutions'};
  $('#qtitle').textContent= partFilter? ('Quiz · '+titles[partFilter]) : 'Full Quiz';

  $('#count').addEventListener('change',buildPool);
  $('#reshuffle').addEventListener('click',buildPool);
  buildPool();
})();
