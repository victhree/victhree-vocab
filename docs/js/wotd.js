/* VicThree Vocab — Vocabulary of the Day */
(async function(){
  const $=s=>document.querySelector(s);
  let days;
  try{ days = await VV.loadWOTD(); }
  catch(e){ $('#list').innerHTML='<div class="empty">Could not load the daily words.</div>'; return; }
  if(!Array.isArray(days) || !days.length){ $('#list').innerHTML='<div class="empty">Today\'s words aren\'t ready yet — check back in the morning.</div>'; return; }

  const params=new URLSearchParams(location.search);
  let idx = 0;
  const wantDate = params.get('date');
  if(wantDate){ const i=days.findIndex(d=>d.date===wantDate); if(i>=0) idx=i; }

  // day selector
  $('#f-day').innerHTML = days.map((d,i)=>
    '<option value="'+i+'"'+(i===idx?' selected':'')+'>'+VV.esc(d.label||d.date)+(i===0?' (today)':'')+'</option>'
  ).join('');
  $('#f-day').addEventListener('change',()=>{ idx=+$('#f-day').value; render(); });

  function card(w){
    const syn = Array.isArray(w.synonyms) ? w.synonyms.join(', ') : (w.synonyms||'');
    let h='<div class="wcard">';
    h+='<div class="dtop"><h3 class="dword" style="margin:0">'+VV.esc(w.word)+'</h3>'+
       (w.pos?'<span class="qtype">'+VV.esc(w.pos)+'</span>':'')+'</div>';
    h+='<p class="dmeaning">'+VV.esc(w.meaning)+'</p>';
    if(syn) h+='<p class="dline dsyn"><span class="dk">Synonyms</span> '+VV.esc(syn)+'</p>';
    if(w.example) h+='<p class="dex">“'+VV.esc(w.example)+'”</p>';
    if(w.source){
      const src = '📰 '+VV.esc(w.source);
      h+='<p class="wotd-src">'+src+(w.headline?' <span class="wotd-hl">— '+VV.esc(w.headline)+'</span>':'')+'</p>';
    }
    h+='</div>';
    return h;
  }

  function render(){
    const d = days[idx];
    $('#count').textContent = (d.words?d.words.length:0)+' words · '+(d.label||d.date);
    let intro='';
    if(d.seed) intro='<div class="dnote">⭐ Starter set — the daily news-sourced words begin once the automated job runs each morning.</div>';
    $('#list').innerHTML = intro + (d.words||[]).map(card).join('');
    window.scrollTo({top:0,behavior:'auto'});
  }

  render();
})();
