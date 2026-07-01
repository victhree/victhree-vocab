/* VicThree Vocab — Learn / Practice mode (one word at a time, no repeats) */
(async function(){
  const $=s=>document.querySelector(s);
  const params=new URLSearchParams(location.search);
  const part=params.get('part')||'A'; // A | B | C

  let words, allQ;
  try{ [words,allQ]=await Promise.all([VV.loadWords(),VV.loadQuestions()]); }
  catch(e){ $('#stage').innerHTML='<div class="empty">Could not load data.</div>'; return; }

  const TYPE_LABEL={synonym:'Synonym',antonym:'Antonym',idiom:'Idiom',ows:'One-word substitution'};
  const TITLES={A:'Synonyms & Antonyms',B:'Idioms & Phrases',C:'One-word Substitutions'};
  const partQs = allQ.filter(q=>q.part===part);
  const total = partQs.length;
  const partWordIds = partQs.map(q=>q.wordId);
  let queue=[], locked=false;

  $('#ltitle').textContent = 'Practice · '+(TITLES[part]||'Vocabulary');

  function remainingList(){ return partQs.filter(q=>!VV.isSeen(q.wordId)); }
  function refill(){ queue = VV.shuffle(remainingList()); }

  function nextWord(){
    if(!queue.length) refill();
    if(!queue.length){ showDone(); return; }
    renderWord(queue.shift());
  }

  function renderWord(q){
    const w=VV.wordById(q.wordId);
    const opts=q.options.map((o,oi)=>
      '<div class="opt clickable" data-oi="'+oi+'"><span class="lt">'+VV.letter(oi)+'</span><span>'+VV.esc(o)+'</span></div>'
    ).join('');
    $('#stage').innerHTML=
      '<div class="qcard" data-wid="'+(w?w.id:'')+'">'+
        '<div class="qhead"><span class="qtype">'+(TYPE_LABEL[q.type]||q.type)+'</span></div>'+
        '<div class="stem">'+highlightCap(q.stem)+'</div>'+
        '<div class="opts">'+opts+'</div>'+
        '<div class="detail" id="detail"></div>'+
        '<div class="navrow" id="navrow"></div>'+
      '</div>';
    locked=false;
    $('#stage').querySelectorAll('.opt').forEach(o=>o.addEventListener('click',()=>onPick(q,+o.dataset.oi)));
    window.scrollTo({top:0,behavior:'smooth'});
  }

  function highlightCap(stem){
    let s=VV.esc(stem);
    s=s.replace(/([A-Z][A-Z\- ]{2,})$/,'<span class="cap">$1</span>');
    s=s.replace(/(&quot;[^&]*&quot;)/,'<span class="cap">$1</span>');
    return s;
  }

  function onPick(q,oi){
    if(locked) return;
    locked=true;
    const card=$('#stage .qcard');
    card.classList.add('answered');
    const opts=card.querySelectorAll('.opt');
    opts.forEach(o=>o.classList.remove('clickable'));
    opts[q.answer].classList.add('correct');
    const ok = oi===q.answer;
    if(!ok) opts[oi].classList.add('wrong');

    const w=VV.wordById(q.wordId);
    if(w){ VV.markSeen(w.id); VV.setStatus(w.id, ok?'got':'missed'); }

    const d=$('#detail');
    d.innerHTML=detailWithActions(w,ok);
    d.classList.add('show');
    bindDetail(card,w);

    $('#navrow').innerHTML='<button class="btn" id="next">Next word →</button>';
    $('#next').addEventListener('click',nextWord);
    // bring the answer card into view (it opens below the options)
    d.scrollIntoView({behavior:'smooth',block:'nearest'});
  }

  function detailWithActions(w,ok){
    if(!w) return '<p class="dmeaning">Details unavailable.</p>';
    const verdict = ok
      ? '<span class="pbadge got">✓ Correct</span>'
      : '<span class="pbadge missed">✗ Review this one</span>';
    let h='<div style="display:flex;align-items:center;gap:10px;margin-bottom:4px">'+verdict+
      '<button class="star'+(VV.isBookmarked(w.id)?' on':'')+'" title="Bookmark">★</button></div>';
    h+=VV.detailHTML(w);
    h+='<div class="dactions"><button class="btn sm outline dl">⬇ Download card (PNG)</button></div>';
    return h;
  }
  function bindDetail(card,w){
    if(!w) return;
    const star=card.querySelector('.star');
    if(star) star.addEventListener('click',()=>{ const on=VV.toggleBookmark(w.id); star.classList.toggle('on',on); });
    const dl=card.querySelector('.dl');
    if(dl) dl.addEventListener('click',()=>VV.downloadCardPNG(w));
  }

  function showDone(){
    $('#stage').innerHTML=
      '<div class="qcard result">'+
        '<h2 style="margin:0 0 6px;color:var(--navy)">All done 🎉</h2>'+
        '<p style="font-size:16px;margin:6px 0">You\'ve reviewed all <b>'+total+'</b> '+(TITLES[part]||'')+' words.</p>'+
        '<div class="dactions">'+
          '<button class="btn" id="restart">↺ Start over</button>'+
          '<a class="btn outline" href="quiz.html">📝 Take the quiz</a>'+
          '<a class="btn outline" href="index.html">← Home</a>'+
        '</div>'+
      '</div>';
    $('#restart').addEventListener('click',doReset);
  }

  function doReset(){ VV.resetSeen(partWordIds); refill(); nextWord(); }

  const rt=$('#restart-top');
  if(rt) rt.addEventListener('click',()=>{
    if(confirm('Restart this set? Words you\'ve already seen in '+(TITLES[part]||'this set')+' will come up again.')) doReset();
  });

  refill();
  nextWord();
})();
