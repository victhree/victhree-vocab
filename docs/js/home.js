/* VicThree Vocab — home hub */
(async function(){
  const $=s=>document.querySelector(s);
  let words=[], qs=[];
  try{ [words,qs]=await Promise.all([VV.loadWords(),VV.loadQuestions()]); }
  catch(e){ $('#stats').innerHTML='<span class="stat"><b>!</b><span>load error</span></span>'; return; }

  const nWords=words.filter(w=>w.kind==='word').length;
  const nIdiom=words.filter(w=>w.kind==='idiom').length;
  const nOws=words.filter(w=>w.kind==='ows').length;
  const ps=VV.progressStats();

  $('#stats').innerHTML=[
    ['#'+qs.length,'quiz questions'],
    [nWords,'words'],
    [nIdiom,'idioms'],
    [nOws,'1-word subs'],
    [ps.got,'mastered'],
    [VV.bookmarkCount(),'★ saved']
  ].map(s=>'<div class="stat"><b>'+s[0]+'</b><span>'+s[1]+'</span></div>').join('');

  // counts per category for the quiz tiles
  const cnt=p=>qs.filter(q=>q.part===p).length;
  const tiles=[
    {h:'Full Quiz',p:'All 737 questions, shuffled',ic:'📝',href:'quiz.html'},
    {h:'Synonyms & Antonyms',p:cnt('A')+' questions',ic:'🔁',href:'quiz.html?part=A'},
    {h:'Idioms & Phrases',p:cnt('B')+' questions',ic:'💬',href:'quiz.html?part=B'},
    {h:'One-word Substitutions',p:cnt('C')+' questions',ic:'🎯',href:'quiz.html?part=C'},
    {h:'Browse Word Bank',p:words.length+' detail cards',ic:'📚',href:'browse.html'},
    {h:'★ Bookmarked',p:VV.bookmarkCount()+' saved words',ic:'⭐',href:'browse.html?saved=1'},
  ];
  $('#tiles').innerHTML=tiles.map(t=>
    '<a class="tile" href="'+t.href+'"><div class="ic">'+t.ic+'</div><h3>'+t.h+'</h3><p>'+t.p+'</p></a>'
  ).join('');
})();
