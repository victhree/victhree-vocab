/* VicThree Vocab service worker */
const CACHE = 'vv-v66';
const SHELL = [
  './','./index.html','./quiz.html','./learn.html','./browse.html','./reference.html','./pyq.html','./wotd.html',
  './css/styles.css?v=66',
  './js/data.js?v=66','./js/quiz.js?v=66','./js/learn.js?v=66','./js/browse.js?v=66','./js/reference.js?v=66','./js/pyq.js?v=66','./js/wotd.js?v=66',
  './js/config.js?v=66','./js/lead.js?v=66',
  './manifest.webmanifest',
  './assets/banner.png?v=66',
  './assets/DSEG7Classic-Bold.woff2',
  './assets/camo.jpg',
  './assets/shield-192.png','./assets/shield-512.png','./assets/shield-180.png'
];
self.addEventListener('install', e=>{
  e.waitUntil(caches.open(CACHE).then(c=>c.addAll(SHELL)).then(()=>self.skipWaiting()).catch(()=>{}));
});
self.addEventListener('activate', e=>{
  e.waitUntil(caches.keys().then(ks=>Promise.all(ks.filter(k=>k!==CACHE).map(k=>caches.delete(k)))).then(()=>self.clients.claim()));
});
self.addEventListener('fetch', e=>{
  const req=e.request;
  if(req.method!=='GET') return;
  const url=new URL(req.url);
  if(req.mode==='navigate' || url.pathname.endsWith('.json') || url.pathname.endsWith('.html')){
    e.respondWith(fetch(req).then(r=>{const c=r.clone();caches.open(CACHE).then(x=>x.put(req,c));return r;}).catch(()=>caches.match(req)));
  } else {
    e.respondWith(caches.match(req).then(r=>r||fetch(req).then(rr=>{const c=rr.clone();caches.open(CACHE).then(x=>x.put(req,c));return rr;})));
  }
});
