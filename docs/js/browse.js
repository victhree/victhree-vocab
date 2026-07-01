/* VicThree Vocab — browse word bank */
(async function(){
  const $=s=>document.querySelector(s);
  const params=new URLSearchParams(location.search);
  let words;
  try{ words=await VV.loadWords(); }
  catch(e){ $('#list').innerHTML='<div class="empty">Could not load word data.</div>'; return; }

  let kind='all', level='all', savedOnly=params.get('saved')==='1', q='';
  if(savedOnly) $('#saved-toggle')?.setAttribute('data-on','1');

  function pass(w){
    if(kind!=='all' && w.kind!==kind) return false;
    if(level!=='all' && (w.level||'').toLowerCase()!==level) return false;
    if(savedOnly && !VV.isBookmarked(w.id)) return false;
    if(q){
      const hay=[w.word,w.meaning,w.desc,w.example,w.trick,(w.syn||[]).join(' '),(w.ant||[]).join(' ')]
        .filter(Boolean).join(' ').toLowerCase();
      if(!hay.includes(q)) return false;
    }
    return true;
  }

  function render(){
    const items=words.filter(pass);
    $('#count').textContent=items.length+' '+(items.length===1?'card':'cards');
    if(!items.length){ $('#list').innerHTML='<div class="empty">No words match. Try clearing filters.</div>'; return; }
    $('#list').innerHTML=items.map(w=>{
      const st=VV.getStatus(w.id);
      const prog = st==='got'?'<span class="pbadge got">✓ got it</span>'
                 : st==='missed'?'<span class="pbadge missed">✗ missed</span>':'';
      return '<div class="wcard" data-wid="'+w.id+'">'+
        '<div class="dtop"><div>'+prog+'</div><div class="dtools">'+
          '<button class="star'+(VV.isBookmarked(w.id)?' on':'')+'" title="Bookmark">★</button>'+
          VV.dlButton()+
        '</div></div>'+
        VV.detailHTML(w)+
      '</div>';
    }).join('');
    $('#list').querySelectorAll('.wcard').forEach(card=>{
      const w=VV.wordById(card.dataset.wid);
      card.querySelector('.star').addEventListener('click',e=>{
        const on=VV.toggleBookmark(w.id); e.currentTarget.classList.toggle('on',on);
        if(savedOnly && !on) render();
      });
      card.querySelector('.dl').addEventListener('click',()=>VV.downloadCardPNG(w));
    });
  }

  // wire filter chips for kind
  $('#kind-chips').addEventListener('click',e=>{
    const c=e.target.closest('.chip'); if(!c)return;
    $('#kind-chips').querySelectorAll('.chip').forEach(x=>x.classList.remove('on'));
    c.classList.add('on'); kind=c.dataset.k; render();
  });
  $('#level').addEventListener('change',e=>{level=e.target.value;render();});
  $('#search').addEventListener('input',e=>{q=e.target.value.trim().toLowerCase();render();});
  const stog=$('#saved-toggle');
  stog.classList.toggle('on',savedOnly);
  stog.addEventListener('click',()=>{ savedOnly=!savedOnly; stog.classList.toggle('on',savedOnly); render(); });

  render();
})();
