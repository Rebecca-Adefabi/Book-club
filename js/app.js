/* =====================================================================
   THE NAME OF THIS APP IS A SECRET — interactions
   - Disguise <-> Archive reveal toggle (persisted)
   - Redaction lift (click/tap to declassify)
   - Reading log (Case Files) via localStorage
   - Mobile nav
   No build step, no backend. GitHub Pages friendly.
   ===================================================================== */

(function () {
  'use strict';

  /* ---------- Disguise <-> Archive reveal ---------- */
  var REVEAL_KEY = 'tnotaias_archive';
  // Default to archive mode in the wireframe so the approved direction is visible.
  var stored = localStorage.getItem(REVEAL_KEY);
  var archive = stored === null ? true : stored === '1';

  function applyMode(isArchive) {
    document.body.classList.toggle('disguise', !isArchive);
    var btn = document.getElementById('revealToggle');
    if (btn) {
      btn.textContent = isArchive ? 'View as Book Club' : 'Reveal the Archive';
      btn.setAttribute('aria-pressed', String(isArchive));
    }
  }

  document.addEventListener('DOMContentLoaded', function () {
    applyMode(archive);
    var btn = document.getElementById('revealToggle');
    if (btn) {
      btn.addEventListener('click', function () {
        archive = !archive;
        localStorage.setItem(REVEAL_KEY, archive ? '1' : '0');
        applyMode(archive);
      });
    }

    /* ---------- Mobile nav ---------- */
    var navToggle = document.getElementById('navToggle');
    var navLinks = document.getElementById('navLinks');
    if (navToggle && navLinks) {
      navToggle.addEventListener('click', function () {
        navLinks.classList.toggle('open');
      });
    }

    initRedaction();
    initCaseFiles();
  });

  /* ---------- Redaction lift ---------- */
  function initRedaction() {
    document.querySelectorAll('.redaction').forEach(function (el) {
      el.setAttribute('tabindex', '0');
      el.setAttribute('role', 'button');
      el.setAttribute('aria-label', 'Classified — activate to declassify');
      var lift = function () { el.classList.toggle('lifted'); };
      el.addEventListener('click', lift);
      el.addEventListener('keydown', function (e) {
        if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); lift(); }
      });
    });
  }

  /* ---------- Reading log (Case Files) ---------- */
  var CF_KEY = 'tnotaias_casefiles';
  var MEMBER_KEY = 'tnotaias_member';

  function getCaseFiles() {
    try { return JSON.parse(localStorage.getItem(CF_KEY)) || {}; }
    catch (e) { return {}; }
  }
  function saveCaseFiles(cf) { localStorage.setItem(CF_KEY, JSON.stringify(cf)); }
  function ensureMember() {
    var m = localStorage.getItem(MEMBER_KEY);
    if (!m) {
      m = assignMember();
      localStorage.setItem(MEMBER_KEY, m);
    }
    return m;
  }
  var CODENAMES = ['Nightjar','Foxglove','Cinder','Moth','Quill','Heron','Salt','Ember','Wren','Vellum'];
  function assignMember() {
    var name = CODENAMES[Math.floor(Math.random() * CODENAMES.length)];
    var num = String(Math.floor(Math.random() * 900) + 100);
    return { codename: 'Operative ' + name, number: '#' + num };
  }

  function updateFile(id, status, verdict) {
    var cf = getCaseFiles();
    var cur = cf[id] || { added: Date.now() };
    if (status) cur.status = status;
    if (verdict !== undefined && verdict !== null) cur.verdict = verdict;
    cf[id] = cur;
    saveCaseFiles(cf);
    syncStatusUI(id, cur);
  }

  function syncStatusUI(id, file) {
    // status pills
    document.querySelectorAll('[data-casefile="' + id + '"] .pill').forEach(function (p) {
      p.classList.toggle('active', p.getAttribute('data-status') === file.status);
    });
    // verdict field
    var v = document.querySelector('[data-casefile="' + id + '"] [data-verdict]');
    if (v && file.verdict) v.value = file.verdict;
    // badges
    document.querySelectorAll('[data-status-badge="' + id + '"]').forEach(function (b) {
      b.textContent = file.status ? statusLabel(file.status) : '';
    });
    // log count
    renderMember();
  }

  function statusLabel(s) {
    return ({ want: 'On the wish list', reading: 'Reading now', finished: 'Read & logged' })[s] || '';
  }

  function initCaseFiles() {
    // member identity
    renderMember();

    // status pills
    document.querySelectorAll('.pill[data-status]').forEach(function (p) {
      var wrapper = p.closest('[data-casefile]');
      if (!wrapper) return;
      var id = wrapper.getAttribute('data-casefile');
      p.addEventListener('click', function () {
        var cf = getCaseFiles();
        var cur = cf[id] || { added: Date.now() };
        // toggle off if same status
        var next = cur.status === p.getAttribute('data-status') ? null : p.getAttribute('data-status');
        updateFile(id, next, null);
      });
    });

    // add buttons
    document.querySelectorAll('[data-add]').forEach(function (b) {
      b.addEventListener('click', function () {
        updateFile(b.getAttribute('data-add'), b.getAttribute('data-status') || 'want', null);
        var orig = b.textContent;
        b.textContent = 'Logged to case files';
        b.disabled = true;
        setTimeout(function () { b.textContent = orig; b.disabled = false; }, 1400);
      });
    });

    // verdict autosave
    document.querySelectorAll('[data-verdict]').forEach(function (ta) {
      var wrapper = ta.closest('[data-casefile]');
      if (!wrapper) return;
      var id = wrapper.getAttribute('data-casefile');
      var t;
      ta.addEventListener('input', function () {
        clearTimeout(t);
        t = setTimeout(function () { updateFile(id, null, ta.value); }, 500);
      });
    });

    // restore existing states
    var cf = getCaseFiles();
    Object.keys(cf).forEach(function (id) { syncStatusUI(id, cf[id]); });

    // log page list
    renderLogPage();
  }

  function renderMember() {
    var m = ensureMember();
    var mEls = document.querySelectorAll('[data-member-codename]');
    var nEls = document.querySelectorAll('[data-member-number]');
    mEls.forEach(function (e) { e.textContent = m.codename; });
    nEls.forEach(function (e) { e.textContent = m.number; });

    var countEl = document.querySelector('[data-case-count]');
    if (countEl) {
      var cf = getCaseFiles();
      var n = Object.keys(cf).length;
      countEl.textContent = n + (n === 1 ? ' file' : ' files') + ' on record';
    }
  }

  // Book catalogue used by the log page to render titles/links.
  var CATALOGUE = {
    '0042': { title: 'Annihilation', author: 'Jeff VanderMeer', href: 'dossier.html' },
    '0117': { title: 'Roadside Picnic', author: 'Arkady & Boris Strugatsky', href: 'dossier.html?id=0117' },
    '0204': { title: 'Piranesi', author: 'Susanna Clarke', href: 'dossier.html?id=0204' },
    '0089': { title: 'The Left Hand of Darkness', author: 'Ursula K. Le Guin', href: 'dossier.html?id=0089' }
  };

  function renderLogPage() {
    var list = document.getElementById('caseList');
    var empty = document.getElementById('caseEmpty');
    if (!list) return;
    var cf = getCaseFiles();
    var ids = Object.keys(cf);
    if (!ids.length) {
      list.classList.add('hidden');
      if (empty) empty.classList.remove('hidden');
      return;
    }
    list.classList.remove('hidden');
    if (empty) empty.classList.add('hidden');
    list.innerHTML = '';
    ids.forEach(function (id) {
      var file = cf[id];
      var book = CATALOGUE[id] || { title: 'File ' + id, author: '', href: '#' };
      var card = document.createElement('article');
      card.className = 'case-card';
      card.innerHTML =
        '<div class="sheet">' +
          '<div class="case-meta">FILE ' + id + '</div>' +
          '<a class="case-title" href="' + book.href + '">' + book.title + '</a>' +
          '<div class="case-author">' + book.author + '</div>' +
          '<div class="case-status">' + statusLabel(file.status || 'filed') + '</div>' +
          (file.verdict ? '<p class="italic muted" style="margin:.4rem 0 0;font-size:.95rem;">“' + escapeHtml(file.verdict) + '”</p>' : '') +
        '</div>';
      list.appendChild(card);
    });
  }

  function escapeHtml(s) {
    return s.replace(/[&<>"']/g, function (c) {
      return ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c];
    });
  }
})();
