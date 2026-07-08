/* VicThree Vocab — Vocabulary of the Day */
(async function(){
  const $=s=>document.querySelector(s);
  let days;
  try{ days = await VV.loadWOTD(); }
  catch(e){ $('#list').innerHTML='<div class="empty">Could not load the daily words.</div>'; return; }
  if(!Array.isArray(days) || !days.length){ $('#list').innerHTML='<div class="empty">Today\'s words aren\'t ready yet — check back in the morning.</div>'; return; }

  const params=new URLSearchParams(location.search);
  let sel = '0'; // index string, or 'all'
  const wantDate = params.get('date');
  if(wantDate){ const i=days.findIndex(d=>d.date===wantDate); if(i>=0) sel=String(i); }

  // "Wednesday, 8 July 2026" from an ISO date; falls back to the batch label
  function dateline(d){
    if(d && d.date && /^\d{4}-\d{2}-\d{2}$/.test(d.date)){
      const p=d.date.split('-');
      const dt=new Date(+p[0], +p[1]-1, +p[2]);
      if(!isNaN(dt)){
        const datePart=dt.toLocaleDateString('en-GB',{day:'numeric',month:'long',year:'numeric'});
        const weekday=dt.toLocaleDateString('en-GB',{weekday:'long'});
        return datePart+', '+weekday;   // date first, day later
      }
    }
    return (d&&d.label)||'';
  }

  // day selector: each day (newest first, "today" marked) + "All days"
  $('#f-day').innerHTML =
    days.map((d,i)=>'<option value="'+i+'"'+(String(i)===sel?' selected':'')+'>'+
      VV.esc(d.label||d.date)+(i===0?' · Today':'')+'</option>').join('') +
    (days.length>1 ? '<option value="all"'+(sel==='all'?' selected':'')+'>All days</option>' : '');
  $('#f-day').addEventListener('change',()=>{ sel=$('#f-day').value; render(); });

  function card(w){
    const syn = Array.isArray(w.synonyms) ? w.synonyms.join(', ') : (w.synonyms||'');
    let h='<div class="wcard">';
    h+='<div class="dtop"><h3 class="dword" style="margin:0">'+VV.esc(w.word)+'</h3>'+
       (w.pos?'<span class="qtype">'+VV.esc(w.pos)+'</span>':'')+'</div>';
    h+='<p class="dmeaning">'+VV.esc(w.meaning)+'</p>';
    if(syn) h+='<p class="dline dsyn"><span class="dk">Synonyms</span> '+VV.esc(syn)+'</p>';
    if(w.example) h+='<p class="dex">“'+VV.esc(w.example)+'”</p>';
    if(w.source){
      h+='<p class="wotd-src">📰 '+VV.esc(w.source)+(w.headline?' <span class="wotd-hl">— '+VV.esc(w.headline)+'</span>':'')+'</p>';
    }
    h+='</div>';
    return h;
  }

  function render(){
    if(sel==='all'){
      $('#dateline').textContent='All days';
      let total=0, html='';
      days.forEach(d=>{
        total += (d.words?d.words.length:0);
        html += '<div class="wotd-daysep">'+VV.esc(dateline(d))+'</div>';
        if(d.seed) html+='<div class="dnote">⭐ Starter set.</div>';
        html += (d.words||[]).map(card).join('');
      });
      $('#count').textContent = total+' words · '+days.length+' days';
      $('#list').innerHTML = html;
    } else {
      const d = days[+sel] || days[0];
      $('#dateline').textContent = dateline(d);
      $('#count').textContent = (d.words?d.words.length:0)+' words';
      let intro = d.seed ? '<div class="dnote">⭐ Starter set — the daily news-sourced words begin once the automated job runs each morning.</div>' : '';
      $('#list').innerHTML = intro + (d.words||[]).map(card).join('');
    }
    window.scrollTo({top:0,behavior:'auto'});
  }

  render();
})();
