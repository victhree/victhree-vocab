/* VicThree Vocab — quiz (word bank + PYQs, select all, submit, then reveal) */
(async function(){
  const $=s=>document.querySelector(s);
  const params=new URLSearchParams(location.search);
  const partFilter=params.get('part'); // A | B | C | null
  const mode=params.get('mode');       // 'review' | null
  const pyqType=params.get('type');    // for PYQ-scoped quizzes
  const pyqYear=params.get('year');
  const initialSrc=params.get('src')|| (mode==='review'?'words':'all'); // all | words | pyq

  let words, allQ, allPYQ;
  try{
    [words,allQ,allPYQ]=await Promise.all([VV.loadWords(),VV.loadQuestions(),VV.loadPYQ()]);
  }catch(e){ $('#stage').innerHTML='<div class="empty">Could not load quiz data.</div>'; return; }
  allPYQ.forEach(q=>q._pyq=true);

  const TYPE_LABEL={synonym:'Synonym',antonym:'Antonym',idiom:'Idiom',ows:'One-word substitution'};
  const titles={A:'Synonyms & Antonyms',B:'Idioms & Phrases',C:'One-word Substitutions'};

  const srcSel=$('#src');
  if(srcSel && ['all','words','pyq'].includes(initialSrc)) srcSel.value=initialSrc;

  let pool=[], answers=[], submitted=false;

  function setTitle(){
    const src = srcSel ? srcSel.value : initialSrc;
    $('#qtitle').textContent =
      mode==='review' ? 'Review weak words'
      : src==='pyq' ? 'PYQ Quiz'
      : partFilter ? ('Quiz · '+titles[partFilter])
      : 'English Quiz';
  }

  function buildPool(){
    const src = srcSel ? srcSel.value : initialSrc;
    let qs=[];
    if(mode==='review'){
      qs=allQ.filter(q=>VV.getStatus(q.wordId)==='missed');
      if(!qs.length){
        $('#bar').style.display='none';
        $('#stage').innerHTML='<div class="qcard result"><h2 style="margin:0 0 6px;color:var(--navy)">No weak words yet 💪</h2>'+
          '<p style="font-size:16px;margin:6px 0">Answer some questions in the English Quiz or Practice — anything you get wrong lands here for focused review.</p>'+
          '<div class="dactions"><a class="btn" href="quiz.html">📝 English Quiz</a><a class="btn outline" href="index.html">← Home</a></div></div>';
        return;
      }
    } else {
      let wb=allQ.slice();
      if(partFilter) wb=wb.filter(q=>q.part===partFilter);
      let pq=allPYQ.slice();
      if(pyqType) pq=pq.filter(q=>q.type===pyqType);
      if(pyqYear) pq=pq.filter(q=>String(q.year)===pyqYear);
      qs = src==='words' ? wb : src==='pyq' ? pq : wb.concat(pq);
    }
    const cnt=parseInt($('#count').value,10);
    qs=VV.shuffle(qs);
    if(cnt>0) qs=qs.slice(0,cnt);
    pool=qs; answers=new Array(pool.length).fill(null); submitted=false;
    $('#bar').style.display='';
    $('#result').innerHTML='';
    setTitle();
    render();
  }

  function highlightCap(stem){
    let s=VV.esc(stem);
    s=s.replace(/([A-Z][A-Z\- ]{2,})$/,'<span class="cap">$1</span>');
    s=s.replace(/(&quot;[^&]*&quot;)/,'<span class="cap">$1</span>');
    return s;
  }
  function pyqStemHTML(q){
    let s=VV.esc(q.stem);
    if(q.word && /^(synonym|antonym|usage|meaning)$/.test(q.type)){
      const w=q.word.split(/[\s→/(]/)[0].trim();
      if(w && w.length>2){ try{ s=s.replace(new RegExp('\\b('+w.replace(/[.*+?^${}()|[\]\\]/g,'\\$&')+')\\b','i'),'<span class="cap">$1</span>'); }catch(e){} }
    }
    return s;
  }
  function typeLabel(q){ return q._pyq ? VV.pyqTypeLabel(q.type) : (TYPE_LABEL[q.type]||q.type); }

  function render(){
    if(!pool.length){ $('#stage').innerHTML='<div class="empty">No questions for this selection.</div>'; return; }
    $('#stage').innerHTML=pool.map((q,i)=>{
      const opts=q.options.map((o,oi)=>
        '<div class="opt clickable" data-i="'+i+'" data-oi="'+oi+'"><span class="lt">'+VV.letter(oi)+'</span><span>'+VV.esc(o)+'</span></div>'
      ).join('');
      const tag = q._pyq ? ' <span class="pyqtag">PYQ · '+VV.esc(q.paper)+' · '+q.year+'</span>' : '';
      const dir = q._pyq ? VV.pyqDirections(q.type) : '';
      return '<div class="qcard" data-qi="'+i+'">'+
        '<div class="qhead"><span class="qnum">Q'+(i+1)+'</span>'+tag+
          '<span class="qtype">'+VV.esc(typeLabel(q))+'</span></div>'+
        (dir?'<p class="pyq-directions">'+VV.esc(dir)+'</p>':'')+
        '<div class="stem">'+(q._pyq?pyqStemHTML(q):highlightCap(q.stem))+'</div>'+
        '<div class="opts">'+opts+'</div>'+
        '<div class="detail" id="d'+i+'"></div>'+
      '</div>';
    }).join('');
    $('#stage').querySelectorAll('.opt').forEach(o=>o.addEventListener('click',()=>onSelect(+o.dataset.i,+o.dataset.oi)));
    updateBar();
  }

  function onSelect(i,oi){
    if(submitted) return;
    answers[i]=oi;
    const card=$('#stage').querySelectorAll('.qcard')[i];
    card.querySelectorAll('.opt').forEach(o=>o.classList.toggle('chosen', +o.dataset.oi===oi));
    updateBar();
  }

  function updateBar(){
    const done=answers.filter(a=>a!==null).length;
    $('#prog').textContent=done+' / '+pool.length+' answered';
    $('#submit').textContent='Submit test';
  }

  function submit(){
    if(submitted) return;
    submitted=true;
    let correct=0;
    const cards=$('#stage').querySelectorAll('.qcard');
    pool.forEach((q,i)=>{
      const card=cards[i];
      const opts=card.querySelectorAll('.opt');
      opts.forEach(o=>o.classList.remove('clickable'));
      opts[q.answer].classList.add('correct');
      const chosen=answers[i];
      const ok = chosen===q.answer;
      if(chosen!==null && !ok) opts[chosen].classList.add('wrong');
      if(ok) correct++;
      const d=card.querySelector('.detail');
      if(q._pyq){
        d.innerHTML=pyqDetail(q, ok, chosen===null);
      } else {
        const w=VV.wordById(q.wordId);
        if(w) VV.setStatus(w.id, ok?'got':'missed');
        d.innerHTML=detailWithActions(w, ok, chosen===null);
        bindDetail(card,w);
      }
      d.classList.add('show');
    });
    const pct=Math.round(correct/pool.length*100);
    $('#result').innerHTML='<div class="qcard result">'+
      '<h2 style="margin:0 0 6px;color:var(--navy)">Test complete 🎉</h2>'+
      '<p style="font-size:18px;margin:6px 0">You scored <b>'+correct+'</b> / '+pool.length+'  ·  <b>'+pct+'%</b></p>'+
      '<div class="scorebar" style="position:static;margin:12px 0"><div class="track"><div class="fill" style="width:'+pct+'%"></div></div></div>'+
      '<div class="dactions"><button class="btn" id="again">🔀 New set</button>'+
      '<a class="btn outline" href="quiz.html?mode=review">🎯 Review weak words</a>'+
      '<a class="btn outline" href="index.html">← Home</a></div></div>';
    $('#again').addEventListener('click',buildPool);
    $('#submit').disabled=true; $('#submit').textContent='Submitted ✓';
    window.scrollTo({top:0,behavior:'smooth'});
  }

  function pyqDetail(q,ok,skipped){
    const verdict = ok ? '<span class="pbadge got">✓ Correct</span>'
      : (skipped ? '<span class="pbadge missed">— Not answered · Ans '+VV.letter(q.answer).toUpperCase()+'</span>'
                 : '<span class="pbadge missed">✗ Answer: '+VV.letter(q.answer).toUpperCase()+'</span>');
    let h='<div class="dtop"><div>'+verdict+'</div></div>';
    h+='<p class="dline"><span class="dk">Why</span> '+VV.esc(q.explanation||'')+'</p>';
    if(q.note) h+='<p class="dnote">⚠ '+VV.esc(q.note)+'</p>';
    return h;
  }

  function detailWithActions(w,ok,skipped){
    if(!w) return '<p class="dmeaning">Details unavailable.</p>';
    const verdict = ok ? '<span class="pbadge got">✓ Correct</span>'
      : (skipped ? '<span class="pbadge missed">— Not answered</span>' : '<span class="pbadge missed">✗ Review this one</span>');
    let h='<div class="dtop"><div>'+verdict+'</div><div class="dtools">'+
      '<button class="star'+(VV.isBookmarked(w.id)?' on':'')+'" title="Bookmark">★</button>'+
      VV.dlButton()+'</div></div>';
    h+=VV.detailHTML(w);
    return h;
  }
  function bindDetail(card,w){
    if(!w) return;
    const star=card.querySelector('.star');
    if(star) star.addEventListener('click',()=>{ const on=VV.toggleBookmark(w.id); star.classList.toggle('on',on); });
    const dl=card.querySelector('.dl');
    if(dl) dl.addEventListener('click',()=>VV.downloadCardPNG(w));
  }

  if(srcSel) srcSel.addEventListener('change',buildPool);
  $('#count').addEventListener('change',buildPool);
  $('#reshuffle').addEventListener('click',buildPool);
  $('#submit').addEventListener('click',submit);
  buildPool();
})();
