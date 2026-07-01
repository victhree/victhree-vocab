/* VicThree Vocab — quiz (one question at a time) */
(async function(){
  const $=s=>document.querySelector(s);
  const params=new URLSearchParams(location.search);
  const partFilter=params.get('part'); // A | B | C | null

  let words, allQ;
  try{ [words,allQ]=await Promise.all([VV.loadWords(),VV.loadQuestions()]); }
  catch(e){ $('#stage').innerHTML='<div class="empty">Could not load quiz data.</div>'; return; }

  const TYPE_LABEL={synonym:'Synonym',antonym:'Antonym',idiom:'Idiom',ows:'One-word substitution'};
  let pool=[], idx=0, answered=0, correct=0, locked=false;

  function buildPool(){
    let qs=allQ.slice();
    if(partFilter) qs=qs.filter(q=>q.part===partFilter);
    const cnt=parseInt($('#count').value,10);
    qs=VV.shuffle(qs);
    if(cnt>0) qs=qs.slice(0,cnt);
    pool=qs; idx=0; answered=0; correct=0; locked=false;
    renderQuestion();
  }

  function renderQuestion(){
    const stage=$('#stage');
    if(!pool.length){ stage.innerHTML='<div class="empty">No questions.</div>'; updateBar(); return; }
    const q=pool[idx];
    const w=VV.wordById(q.wordId);
    const opts=q.options.map((o,oi)=>
      '<div class="opt clickable" data-oi="'+oi+'"><span class="lt">'+VV.letter(oi)+'</span><span>'+VV.esc(o)+'</span></div>'
    ).join('');
    stage.innerHTML=
      '<div class="qcard" data-wid="'+(w?w.id:'')+'">'+
        '<div class="qhead">'+
          '<span class="qnum">Q'+(idx+1)+' / '+pool.length+'</span>'+
          '<span class="qtype">'+(TYPE_LABEL[q.type]||q.type)+'</span></div>'+
        '<div class="stem">'+highlightCap(q.stem)+'</div>'+
        '<div class="opts">'+opts+'</div>'+
        '<div class="detail" id="detail"></div>'+
        '<div class="navrow" id="navrow"></div>'+
      '</div>';
    locked=false;
    stage.querySelectorAll('.opt').forEach(o=>o.addEventListener('click',()=>onPick(+o.dataset.oi)));
    updateBar();
    window.scrollTo({top:0,behavior:'smooth'});
  }

  function highlightCap(stem){
    let s=VV.esc(stem);
    s=s.replace(/([A-Z][A-Z\- ]{2,})$/,'<span class="cap">$1</span>');
    s=s.replace(/(&quot;[^&]*&quot;)/,'<span class="cap">$1</span>');
    return s;
  }

  function onPick(oi){
    if(locked) return;
    locked=true;
    const q=pool[idx];
    const card=$('#stage .qcard');
    card.classList.add('answered');
    const opts=card.querySelectorAll('.opt');
    opts.forEach(o=>o.classList.remove('clickable'));
    opts[q.answer].classList.add('correct');
    const ok = oi===q.answer;
    if(!ok) opts[oi].classList.add('wrong');
    answered++; if(ok) correct++;

    const w=VV.wordById(q.wordId);
    const d=$('#detail');
    d.innerHTML=detailWithActions(w,ok);
    d.classList.add('show');
    bindDetail(card,w);
    if(w) VV.setStatus(w.id, ok?'got':'missed');

    // nav buttons
    const last = idx>=pool.length-1;
    $('#navrow').innerHTML = last
      ? '<button class="btn" id="next">See results →</button>'
      : '<button class="btn" id="next">Next question →</button>';
    $('#next').addEventListener('click',()=>{
      if(last){ showResults(); } else { idx++; renderQuestion(); }
    });
    updateBar();
    d.scrollIntoView({behavior:'smooth',block:'nearest'});
  }

  function detailWithActions(w,ok){
    if(!w) return '<p class="dmeaning">Details unavailable.</p>';
    const verdict = ok
      ? '<span class="pbadge got">✓ Correct</span>'
      : '<span class="pbadge missed">✗ Review this one</span>';
    let h='<div class="dtop"><div>'+verdict+'</div><div class="dtools">'+
      '<button class="star'+(VV.isBookmarked(w.id)?' on':'')+'" title="Bookmark">★</button>'+
      VV.dlButton()+'</div></div>';
    h+=VV.detailHTML(w);
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
    $('#sb-fill').style.width=(total?(idx+(locked?1:0))/total*100:0)+'%';
  }

  function showResults(){
    const total=pool.length;
    const pct= total? Math.round(correct/total*100):0;
    $('#stage').innerHTML=
      '<div class="qcard result">'+
        '<h2 style="margin:0 0 6px;color:var(--navy)">Quiz complete 🎉</h2>'+
        '<p style="font-size:18px;margin:6px 0">You scored <b>'+correct+'</b> / '+total+'  ·  <b>'+pct+'%</b></p>'+
        '<div class="scorebar" style="position:static;margin:14px 0"><div class="track"><div class="fill" style="width:'+pct+'%"></div></div></div>'+
        '<div class="dactions">'+
          '<button class="btn" id="again">🔀 New set</button>'+
          '<a class="btn outline" href="browse.html?saved=1">★ Review saved words</a>'+
          '<a class="btn outline" href="index.html">← Home</a>'+
        '</div>'+
      '</div>';
    $('#again').addEventListener('click',buildPool);
    $('#sb-fill').style.width='100%';
    window.scrollTo({top:0,behavior:'smooth'});
  }

  const titles={A:'Synonyms & Antonyms',B:'Idioms & Phrases',C:'One-word Substitutions'};
  $('#qtitle').textContent= partFilter? ('Quiz · '+titles[partFilter]) : 'Random Quiz';

  $('#count').addEventListener('change',buildPool);
  $('#reshuffle').addEventListener('click',buildPool);
  buildPool();
})();
