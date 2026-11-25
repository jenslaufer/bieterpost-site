/* Solytics partner program (bieterpost marketing/copy.md 3.12, datenschutz.html section 10).
   Loads the affiliate snippet only for visitors from a partner link (?ref=) or with its
   cookie, so everybody else makes no request to affiliate.solytics.de. The snippet sets
   cookies only after consent: a partner-link visit shows the notice below. Declining
   stores nothing, not even the decision. */
(function () {
  "use strict";
  var vomPartner = new URLSearchParams(location.search).has("ref");
  if (!vomPartner && !/(?:^|; )aff_ref=/.test(document.cookie)) return;

  var s = document.createElement("script");
  s.src = "https://affiliate.solytics.de/s.js";
  s.setAttribute("data-product", "bieterpost");
  s.setAttribute("data-cookie-domain", "bieterpost.de");
  if (vomPartner) s.onload = frage;
  document.head.appendChild(s);

  function frage() {
    var stil = document.createElement("style");
    stil.textContent =
      ".aff-hinweis{position:fixed;left:0;right:0;bottom:0;z-index:100;background:var(--schwarz,#111110);" +
      "color:var(--weiss,#fff);border-top:4px solid var(--gelb,#FFC400);font:1rem/1.45 var(--f-text,Arial,sans-serif)}" +
      ".aff-hinweis__in{max-width:72rem;margin:0 auto;padding:16px var(--rand,16px);display:flex;flex-wrap:wrap;" +
      "gap:12px 24px;align-items:center;justify-content:space-between}" +
      ".aff-hinweis p{margin:0;max-width:44rem}.aff-hinweis a{color:inherit}" +
      ".aff-hinweis__knoepfe{display:flex;gap:12px}" +
      ".aff-hinweis button{min-height:44px;padding:8px 20px;font:inherit;font-weight:700;cursor:pointer;" +
      "border:3px solid var(--gelb,#FFC400);background:var(--gelb,#FFC400);color:var(--schwarz,#111110)}" +
      ".aff-hinweis button:hover{background:var(--weiss,#fff);border-color:var(--weiss,#fff)}" +
      ".aff-hinweis button:focus-visible{outline:3px solid var(--weiss,#fff);outline-offset:2px}";
    var box = document.createElement("section");
    box.className = "aff-hinweis";
    box.setAttribute("aria-label", "Empfehlung eines Partners");
    box.innerHTML =
      '<div class="aff-hinweis__in"><p>Sie kommen über die Empfehlung eines Partners. Dürfen wir das mit ' +
      "zwei Cookies festhalten? Dann erhält der Partner eine Provision, wenn Sie Bieterpost abonnieren. " +
      'Für Sie ändert sich nichts. <a href="/datenschutz.html#partnerprogramm">Mehr dazu</a></p>' +
      '<div class="aff-hinweis__knoepfe"><button type="button" data-ja>Einverstanden</button>' +
      '<button type="button">Nein danke</button></div></div>';
    box.addEventListener("click", function (e) {
      var knopf = e.target.closest("button");
      if (!knopf) return;
      if (knopf.hasAttribute("data-ja") && window.affiliate) window.affiliate.consent();
      box.remove();
    });
    document.head.appendChild(stil);
    document.body.appendChild(box);
  }
})();
