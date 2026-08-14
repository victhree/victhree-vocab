/* VicThree Vocab — welcome popup / lead capture.
   Shows a one-time gate asking for name, phone and email, then posts the
   details to a Google Form (set in config.js). Once submitted, it never shows
   again for that visitor (localStorage). A personalised typewriter greeting is
   shown on the homepage to visitors who have given their name. */
(function () {
  "use strict";

  var KEY = "vv_lead_done";
  var DATA_KEY = "vv_lead_data";
  var GREET_KEY = "vv_greet_i";
  var CFG = window.VV_CONFIG || {};

  // Resolve the banner from THIS script's own location, so it loads from any
  // page depth (lead.js lives in js/, banner in assets/).
  var SCRIPT_SRC = (function () {
    var s = document.currentScript;
    if (!s) {
      var all = document.getElementsByTagName("script");
      for (var i = all.length - 1; i >= 0; i--) {
        if (/lead\.js/.test(all[i].src)) { s = all[i]; break; }
      }
    }
    return (s && s.src) ? s.src : "";
  })();
  var BANNER = SCRIPT_SRC ? new URL("../assets/banner.png", SCRIPT_SRC).href : "assets/banner.png";

  // Has this visitor already given their details?
  var done = false;
  try { done = !!localStorage.getItem(KEY); } catch (e) {}

  function el(tag, cls, html) {
    var n = document.createElement(tag);
    if (cls) n.className = cls;
    if (html != null) n.innerHTML = html;
    return n;
  }

  function esc(s) {
    return String(s).replace(/[&<>"']/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c];
    });
  }

  // Personalised motivating lines shown on the homepage to returning visitors.
  // [big line with {name}, smaller line below]. Rotated one per visit.
  var GREETINGS = [
    ["Welcome back, {name}.", "A stronger vocabulary is built one word at a time, and today is another word."],
    ["Good to see you, {name}.", "The officer who reads widely rarely runs short of the right word."],
    ["Sharp mind, {name}.", "Every synonym you master is one less mark you leave on the table."],
    ["Keep at it, {name}.", "Words are the ammunition of a clear thinker, so stock up today."],
    ["{name}, precision wins papers.", "Learn the exact word, not the nearest one."],
    ["Steady progress, {name}.", "Ten honest minutes of vocabulary today is a mark saved tomorrow."],
    ["Back for more, {name}?", "The English paper rewards the reader who never stopped being curious."],
    ["{name}, command the language.", "An officer speaks with clarity, and clarity begins with the right word."]
  ];

  function firstName() {
    var raw = "";
    try { raw = (JSON.parse(localStorage.getItem(DATA_KEY) || "{}").name) || ""; } catch (e) {}
    raw = raw.trim();
    if (!raw) return "";
    var f = raw.split(/\s+/)[0];
    return f.charAt(0).toUpperCase() + f.slice(1);
  }

  function typeGreeting(g, bigSegs, smallText) {
    var bigEl = g.querySelector(".greet-big");
    var smallEl = g.querySelector(".greet-small");

    // Render the final text once to lock in the card height (no layout jump),
    // then clear it and type it back out.
    bigEl.innerHTML = bigSegs.map(function (s) {
      return s.gold ? '<span class="greet-name">' + esc(s.text) + "</span>" : esc(s.text);
    }).join("");
    smallEl.textContent = smallText;
    g.style.minHeight = g.offsetHeight + "px";
    bigEl.textContent = "";
    smallEl.textContent = "";

    // Flatten to per-character steps.
    var steps = [];
    bigSegs.forEach(function (s) {
      for (var i = 0; i < s.text.length; i++) steps.push({ ch: s.text[i], gold: s.gold, small: false });
    });
    for (var j = 0; j < smallText.length; j++) steps.push({ ch: smallText[j], gold: false, small: true });

    var caret = el("span", "greet-caret");
    bigEl.appendChild(caret);

    var goldSpan = null, k = 0, SPEED = 60;
    function tick() {
      if (k >= steps.length) { caret.remove(); return; }
      var st = steps[k++];
      var line = st.small ? smallEl : bigEl;
      if (st.gold) {
        if (!goldSpan) { goldSpan = el("span", "greet-name"); line.appendChild(goldSpan); }
        goldSpan.appendChild(document.createTextNode(st.ch));
      } else {
        goldSpan = null;
        line.appendChild(document.createTextNode(st.ch));
      }
      line.appendChild(caret); // move caret to the end of the active line
      setTimeout(tick, SPEED);
    }
    setTimeout(tick, 260);
  }

  function renderGreeting() {
    var anchor = document.querySelector(".titlebar"); // homepage main heading only
    if (!anchor || document.querySelector(".greet")) return;
    var name = firstName();
    if (!name) return;

    var i = 0;
    try { i = parseInt(localStorage.getItem(GREET_KEY) || "0", 10) || 0; } catch (e) {}
    var msg = GREETINGS[i % GREETINGS.length];
    try { localStorage.setItem(GREET_KEY, String((i + 1) % GREETINGS.length)); } catch (e) {}

    var parts = msg[0].split("{name}");
    var bigSegs = [
      { text: parts[0] || "", gold: false },
      { text: name, gold: true },
      { text: parts[1] || "", gold: false }
    ];
    var smallText = msg[1];

    var g = el("div", "greet");
    g.innerHTML = '<p class="greet-big"></p><p class="greet-small"></p>';
    anchor.parentNode.insertBefore(g, anchor);

    var reduce = false;
    try { reduce = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches; } catch (e) {}
    if (reduce) {
      g.querySelector(".greet-big").innerHTML =
        esc(bigSegs[0].text) + '<span class="greet-name">' + esc(name) + "</span>" + esc(bigSegs[2].text);
      g.querySelector(".greet-small").textContent = smallText;
      return;
    }
    typeGreeting(g, bigSegs, smallText);
  }

  function build() {
    var overlay = el("div", "lead-overlay");
    overlay.setAttribute("role", "dialog");
    overlay.setAttribute("aria-modal", "true");
    overlay.setAttribute("aria-labelledby", "lead-title");

    var card = el("div", "lead-card");
    card.innerHTML =
      '<div class="lead-banner"><img src="' + BANNER + '" alt="VicThree Defence, by Anmol Sharma"></div>' +
      '<div class="lead-body">' +
        '<i class="lead-tick tl"></i><i class="lead-tick tr"></i>' +
        '<i class="lead-tick bl"></i><i class="lead-tick br"></i>' +
        '<h2 id="lead-title" class="lead-title">Welcome to VicThree Defence</h2>' +
        '<form class="lead-form" novalidate>' +
          '<label class="lead-field"><span>Name</span>' +
            '<input type="text" name="name" autocomplete="name" required></label>' +
          '<label class="lead-field"><span>Phone number</span>' +
            '<input type="tel" name="phone" autocomplete="tel" inputmode="numeric" required></label>' +
          '<label class="lead-field"><span>Email address</span>' +
            '<input type="email" name="email" autocomplete="email" required></label>' +
          '<p class="lead-error" role="alert"></p>' +
          '<button type="submit" class="lead-btn"><span class="lead-dot"></span>Launch</button>' +
        '</form>' +
      '</div>';

    overlay.appendChild(card);
    return overlay;
  }

  function post(data) {
    // Google Form (no server to deploy). Blank-safe: if unconfigured, do nothing.
    var gf = CFG.googleForm;
    if (gf && gf.action && gf.fields && gf.fields.name) {
      var fb = new URLSearchParams();
      fb.set(gf.fields.name, data.name);
      if (gf.fields.phone) fb.set(gf.fields.phone, data.phone);
      if (gf.fields.email) fb.set(gf.fields.email, data.email);
      return fetch(gf.action, { method: "POST", mode: "no-cors", body: fb }).catch(function () {});
    }
    return Promise.resolve();
  }

  // Keep the popup pinned to the area the on-screen keyboard leaves visible.
  function fitToViewport(overlay) {
    var vv = window.visualViewport; if (!vv) return function () {};
    function apply() { overlay.style.height = vv.height + "px"; overlay.style.top = vv.offsetTop + "px"; overlay.style.bottom = "auto"; }
    apply(); vv.addEventListener("resize", apply); vv.addEventListener("scroll", apply);
    return function () { vv.removeEventListener("resize", apply); vv.removeEventListener("scroll", apply); overlay.style.height = ""; overlay.style.top = ""; overlay.style.bottom = ""; };
  }

  function show() {
    var overlay = build();
    document.body.appendChild(overlay);
    document.documentElement.classList.add("lead-open");

    var form = overlay.querySelector(".lead-form");
    var errBox = overlay.querySelector(".lead-error");
    var btn = overlay.querySelector(".lead-btn");
    var nameEl = form.name, phoneEl = form.phone, emailEl = form.email;

    // Pin to the visible viewport, and ease a tapped field into view.
    var cleanupVV = fitToViewport(overlay);
    overlay.addEventListener("focusin", function (e) {
      setTimeout(function () { try { e.target.scrollIntoView({ block: "center", behavior: "smooth" }); } catch (x) {} }, 260);
    });

    // Auto-focus only on desktop / fine-pointer devices, so touch keyboards do
    // not pop up and hide the lower part of the popup on open.
    var finePointer = window.matchMedia && window.matchMedia("(pointer: fine)").matches;
    if (finePointer) setTimeout(function () { try { nameEl.focus(); } catch (e) {} }, 60);

    function fail(msg, field) {
      errBox.textContent = msg;
      if (field) try { field.focus(); } catch (e) {}
    }

    form.addEventListener("submit", function (ev) {
      ev.preventDefault();
      errBox.textContent = "";

      var name = (nameEl.value || "").trim();
      var email = (emailEl.value || "").trim();
      var phoneRaw = (phoneEl.value || "").trim();
      var digits = phoneRaw.replace(/[^\d]/g, "");

      if (name.length < 2) return fail("Please enter your name.", nameEl);
      if (digits.length < 10 || digits.length > 13)
        return fail("Please enter a valid phone number.", phoneEl);
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))
        return fail("Please enter a valid email address.", emailEl);

      btn.disabled = true;
      btn.textContent = "Just a moment...";

      var data = { name: name, phone: phoneRaw, email: email };
      try { localStorage.setItem(DATA_KEY, JSON.stringify(data)); } catch (e) {}

      post(data).then(function () {
        try { localStorage.setItem(KEY, "1"); } catch (e) {}
        overlay.classList.add("lead-closing");
        setTimeout(function () {
          if (cleanupVV) cleanupVV();
          overlay.remove();
          document.documentElement.classList.remove("lead-open");
          renderGreeting(); // welcome them by name straight away
        }, 260);
      });
    });
  }

  // Show the popup 5 seconds after a new visitor lands on the site.
  var DELAY = 5000;
  function schedule() { setTimeout(show, DELAY); }

  function boot() {
    renderGreeting();          // returning visitors: greet by name
    if (!done) schedule();     // new visitors: popup after 5s
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", boot);
  } else {
    boot();
  }
})();
