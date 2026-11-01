/* Arabii — a dependency-free, static self-study Arabic course.
 * Content lives in content/*.json; this file renders it.
 * Routes (hash-based so it works on GitHub Pages):
 *   #/              tracks + progress
 *   #/lesson/<id>   a lesson
 *   #/quiz/<id>     quiz generated from a lesson's vocab
 *   #/review        spaced-repetition flashcards for every lesson you've opened
 */
(() => {
  'use strict';

  const app = document.getElementById('app');
  const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const shuffle = a => { a = a.slice(); for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };
  const DAY = 86400000;
  const BOX_DAYS = [0, 1, 3, 7, 16, 35]; // Leitner intervals by box (1..5)

  // ---------- storage (safe if localStorage is blocked) ----------
  const store = {
    get(k, d) { try { const v = localStorage.getItem('arabii:' + k); return v ? JSON.parse(v) : d; } catch { return d; } },
    set(k, v) { try { localStorage.setItem('arabii:' + k, JSON.stringify(v)); } catch { /* ignore */ } }
  };
  const getProgress = () => store.get('progress', {});   // { lessonId: { visited, done, best } }
  const setProgress = p => store.set('progress', p);
  const getCards = () => store.get('cards', {});         // { "lessonId:index": { box, due } }
  const setCards = c => store.set('cards', c);

  // ---------- content loading ----------
  let tracksData = null;
  const lessons = {};
  async function loadTracks() {
    if (!tracksData) {
      const r = await fetch('content/tracks.json');
      if (!r.ok) throw new Error('Could not load the course index.');
      tracksData = await r.json();
    }
    return tracksData;
  }
  async function loadLesson(id) {
    if (!/^[\w-]+$/.test(id || '')) throw new Error('Unknown lesson.');
    if (!lessons[id]) {
      const r = await fetch(`content/lessons/${id}.json`);
      if (!r.ok) throw new Error(`Lesson "${id}" was not found.`);
      lessons[id] = await r.json();
    }
    return lessons[id];
  }
  function findInTracks(id) {
    for (const t of tracksData.tracks) {
      const i = t.lessons.findIndex(l => l.id === id);
      if (i >= 0) return { track: t, index: i, next: t.lessons[i + 1] };
    }
    return null;
  }

  // ---------- speech (uses an Arabic voice if the device has one) ----------
  function speak(text) {
    if (!('speechSynthesis' in window)) return;
    const u = new SpeechSynthesisUtterance(text);
    u.lang = 'ar-SA';
    u.rate = 0.8;
    const v = speechSynthesis.getVoices().find(v => v.lang && v.lang.toLowerCase().startsWith('ar'));
    if (v) u.voice = v;
    speechSynthesis.cancel();
    speechSynthesis.speak(u);
  }
  document.addEventListener('click', e => {
    const b = e.target.closest('[data-speak]');
    if (b) { e.preventDefault(); e.stopPropagation(); speak(b.dataset.speak); }
  });
  const speakBtn = text => `<button class="speak" data-speak="${esc(text)}" title="Listen" aria-label="Listen">▶</button>`;

  // ---------- review deck ----------
  function seedCards(lessonId, vocab) {
    const cards = getCards();
    let changed = false;
    (vocab || []).forEach((_, i) => {
      const k = `${lessonId}:${i}`;
      if (!cards[k]) { cards[k] = { box: 1, due: Date.now() }; changed = true; }
    });
    if (changed) setCards(cards);
  }
  function dueCount() {
    const now = Date.now();
    return Object.values(getCards()).filter(c => c.due <= now).length;
  }
  function updateBadge() {
    const b = document.getElementById('due-badge');
    const n = dueCount();
    b.hidden = n === 0;
    b.textContent = n > 99 ? '99+' : n;
  }

  // ---------- views ----------
  async function renderHome() {
    const data = await loadTracks();
    const prog = getProgress();
    const all = data.tracks.flatMap(t => t.lessons);
    const done = all.filter(l => prog[l.id]?.done).length;
    const words = Object.keys(getCards()).length;
    const due = dueCount();

    app.innerHTML = `
      <section class="hero">
        <h1>${esc(data.title)}</h1>
        <p class="muted">${esc(data.tagline)}</p>
        <div class="stats">
          <div class="stat"><b>${done}/${all.length}</b><span class="muted">lessons complete</span></div>
          <div class="stat"><b>${words}</b><span class="muted">words in your deck</span></div>
          <div class="stat"><b>${due}</b><span class="muted">cards due today</span></div>
        </div>
        ${due ? `<a class="btn" href="#/review">Review ${due} card${due === 1 ? '' : 's'}</a>` : ''}
      </section>
      ${data.tracks.map(t => {
        const tDone = t.lessons.filter(l => prog[l.id]?.done).length;
        const pct = t.lessons.length ? Math.round(100 * tDone / t.lessons.length) : 0;
        return `
        <section class="track">
          <div class="track-head">
            <div><h2 style="margin-top:0">${esc(t.title)}</h2><p class="muted" style="margin:0">${esc(t.description)}</p></div>
            <span class="ar" lang="ar">${esc(t.ar)}</span>
          </div>
          <div class="progressbar" aria-label="${pct}% complete"><span style="width:${pct}%"></span></div>
          <ol class="lesson-list">
            ${t.lessons.map(l => `
              <li><a href="#/lesson/${esc(l.id)}">
                <span class="check ${prog[l.id]?.done ? 'done' : ''}">${prog[l.id]?.done ? '✓' : ''}</span>
                <span><strong>${esc(l.title)}</strong><br><span class="muted">${esc(l.summary)}</span></span>
              </a></li>`).join('')}
          </ol>
        </section>`;
      }).join('')}`;
  }

  const NON_JOINING = new Set('اأإآدذرزوؤة');
  function letterForms(ch) {
    const T = 'ـ'; // tatweel, so the browser shows the joined shape
    return NON_JOINING.has(ch)
      ? { isolated: ch, initial: ch, medial: T + ch, final: T + ch }
      : { isolated: ch, initial: ch + T, medial: T + ch + T, final: T + ch };
  }

  function renderSection(s) {
    switch (s.type) {
      case 'text':
        return `<div class="prose">${s.body}</div>`;
      case 'note':
        return `<div class="note">${s.body}</div>`;
      case 'heading':
        return `<h2>${esc(s.text)}</h2>`;
      case 'letters':
        return `<p class="muted">Tap a letter to see its initial, middle and final forms.</p>
          <div class="grid">${s.items.map(l => {
            const f = letterForms(l.ar);
            return `<button class="tile" data-tile>
              <div class="big ar" lang="ar">${esc(l.ar)}</div>
              <strong>${esc(l.name)}</strong>
              <small>${esc(l.sound)}</small>
              <div class="forms ar" lang="ar" title="initial · medial · final">
                <span>${f.initial}</span><span>${f.medial}</span><span>${f.final}</span>
              </div>
            </button>`;
          }).join('')}</div>`;
      case 'table':
        return `<div class="table-wrap"><table>
          <thead><tr>${s.headers.map(h => `<th>${esc(h)}</th>`).join('')}</tr></thead>
          <tbody>${s.rows.map(r => `<tr>${r.map((c, i) =>
            (s.arCols || []).includes(i)
              ? `<td class="ar" lang="ar">${esc(c)} ${speakBtn(c)}</td>`
              : `<td>${esc(c)}</td>`).join('')}</tr>`).join('')}</tbody>
        </table></div>`;
      case 'ayat':
        return `<ol class="ayat">${s.items.map(a => `
          <li><span class="quran" lang="ar">${esc(a.ar)} <span class="num">﴿${Number(a.n).toLocaleString('ar-EG')}﴾</span></span>
          <div class="muted" style="font-size:1rem;text-align:left;font-family:Inter,sans-serif;direction:ltr">${a.n}. ${esc(a.en)}</div></li>`).join('')}</ol>`;
      default:
        return '';
    }
  }

  function renderVocab(vocab, quranic) {
    if (!vocab?.length) return '';
    return `<h2>Words to learn</h2><div class="vocab">${vocab.map(w => `
      <div class="word">
        <div class="word-top">${speakBtn(w.ar)}<span class="${quranic ? 'quran' : 'ar'}" lang="ar">${esc(w.ar)}</span></div>
        <span class="tr">${esc(w.tr)}</span>
        <span>${esc(w.en)}</span>
      </div>`).join('')}</div>`;
  }

  async function renderLesson(id) {
    await loadTracks();
    const lesson = await loadLesson(id);
    const where = findInTracks(id);
    const prog = getProgress();
    prog[id] = { ...(prog[id] || {}), visited: true };
    setProgress(prog);
    seedCards(id, lesson.vocab);
    updateBadge();

    const canQuiz = (lesson.vocab || []).length >= 4;
    const done = prog[id].done;
    app.innerHTML = `
      <div class="crumb"><a href="#/">Tracks</a> › ${esc(where?.track.title || '')}</div>
      <h1>${esc(lesson.title)}</h1>
      <p class="muted">${esc(lesson.summary || '')}</p>
      ${(lesson.sections || []).map(renderSection).join('')}
      ${lesson.hideVocab ? '' : renderVocab(lesson.vocab, lesson.quranic)}
      <div class="actions">
        ${canQuiz ? `<a class="btn" href="#/quiz/${esc(id)}">Take the quiz</a>` : ''}
        <button class="btn ghost" id="mark">${done ? '✓ Completed' : 'Mark complete'}</button>
        ${where?.next ? `<a class="btn ghost" href="#/lesson/${esc(where.next.id)}">Next: ${esc(where.next.title)} →</a>` : ''}
      </div>
      ${prog[id].best != null ? `<p class="muted">Best quiz score: ${prog[id].best}%</p>` : ''}`;

    app.querySelectorAll('[data-tile]').forEach(t => t.addEventListener('click', () => t.classList.toggle('open')));
    document.getElementById('mark').addEventListener('click', e => {
      const p = getProgress();
      p[id] = { ...(p[id] || {}), done: !p[id]?.done };
      setProgress(p);
      e.target.textContent = p[id].done ? '✓ Completed' : 'Mark complete';
    });
  }

  function buildQuestions(vocab, mode, count) {
    const pool = shuffle(vocab).slice(0, Math.min(count, vocab.length));
    return pool.map(w => {
      const dir = mode === 'ar-en' ? 'ar-en' : mode === 'en-ar' ? 'en-ar' : (Math.random() < 0.6 ? 'ar-en' : 'en-ar');
      const distractors = shuffle(vocab.filter(v => v !== w && v.en !== w.en && v.ar !== w.ar)).slice(0, 3);
      return { word: w, dir, options: shuffle([w, ...distractors]) };
    });
  }

  async function renderQuiz(id) {
    await loadTracks();
    const lesson = await loadLesson(id);
    const vocab = lesson.vocab || [];
    if (vocab.length < 4) throw new Error('This lesson has no quiz yet.');
    const qs = buildQuestions(vocab, lesson.quizMode, 10);
    let i = 0, score = 0;

    const show = () => {
      if (i >= qs.length) return finish();
      const q = qs[i];
      const prompt = q.dir === 'ar-en'
        ? `What does this mean? <span class="${lesson.quranic ? 'quran' : 'ar'}" lang="ar">${esc(q.word.ar)}</span>`
        : `Which is <strong>“${esc(q.word.en)}”</strong>?`;
      app.innerHTML = `
        <div class="crumb"><a href="#/lesson/${esc(id)}">‹ ${esc(lesson.title)}</a></div>
        <div class="quiz-card">
          <div class="meta"><span>Question ${i + 1} of ${qs.length}</span><span>Score ${score}</span></div>
          <div class="prompt">${prompt}</div>
          <div class="options">${q.options.map((o, k) => q.dir === 'ar-en'
            ? `<button class="option" data-k="${k}">${esc(o.en)}</button>`
            : `<button class="option ar" lang="ar" data-k="${k}">${esc(o.ar)}</button>`).join('')}</div>
          <div class="actions" id="next-wrap" hidden><button class="btn" id="next">${i + 1 < qs.length ? 'Next' : 'See results'}</button></div>
        </div>`;
      const buttons = [...app.querySelectorAll('.option')];
      buttons.forEach(b => b.addEventListener('click', () => {
        const pick = q.options[+b.dataset.k];
        const ok = pick === q.word;
        if (ok) score++;
        buttons.forEach(x => {
          x.disabled = true;
          if (q.options[+x.dataset.k] === q.word) x.classList.add('right');
        });
        if (!ok) b.classList.add('wrong');
        speak(q.word.ar);
        document.getElementById('next-wrap').hidden = false;
        document.getElementById('next').focus();
      }));
      document.getElementById('next').addEventListener('click', () => { i++; show(); });
    };

    const finish = () => {
      const pct = Math.round(100 * score / qs.length);
      const p = getProgress();
      const prev = p[id] || {};
      p[id] = { ...prev, visited: true, best: Math.max(prev.best ?? 0, pct), done: prev.done || pct >= 80 };
      setProgress(p);
      const where = findInTracks(id);
      app.innerHTML = `
        <div class="quiz-card center">
          <h1>${pct}%</h1>
          <p>${score} of ${qs.length} correct. ${pct >= 80 ? 'Lesson marked complete. ' : 'Score 80% or more to complete the lesson.'}</p>
          <div class="actions" style="justify-content:center">
            <a class="btn ghost" href="#/quiz/${esc(id)}" id="again">Try again</a>
            <a class="btn ghost" href="#/lesson/${esc(id)}">Back to lesson</a>
            ${where?.next ? `<a class="btn" href="#/lesson/${esc(where.next.id)}">Next lesson →</a>` : `<a class="btn" href="#/">All tracks</a>`}
          </div>
        </div>`;
      // same-hash link wouldn't re-render, so restart explicitly
      document.getElementById('again').addEventListener('click', e => { e.preventDefault(); renderQuiz(id); });
    };
    show();
  }

  async function renderReview() {
    await loadTracks();
    const cards = getCards();
    const now = Date.now();
    const dueKeys = shuffle(Object.keys(cards).filter(k => cards[k].due <= now)).slice(0, 25);

    if (!dueKeys.length) {
      const total = Object.keys(cards).length;
      app.innerHTML = `<div class="flash center">
        <h1>All caught up</h1>
        <p class="muted">${total ? `Nothing is due right now. You have ${total} words in your deck — come back tomorrow.` : 'Open a lesson and its words will be added to your review deck.'}</p>
        <a class="btn" href="#/">Go to lessons</a></div>`;
      return;
    }

    // resolve card keys to words
    const items = [];
    for (const k of dueKeys) {
      const [lid, idx] = k.split(':');
      try {
        const l = await loadLesson(lid);
        const w = l.vocab?.[+idx];
        if (w) items.push({ k, w, quranic: l.quranic });
        else { delete cards[k]; } // lesson content changed; drop the stale card
      } catch { delete cards[k]; }
    }
    setCards(cards);

    let i = 0, known = 0;
    const show = () => {
      if (i >= items.length) {
        updateBadge();
        app.innerHTML = `<div class="flash center"><h1>Session done</h1>
          <p>${known} of ${items.length} remembered. Missed cards will come back soon.</p>
          <a class="btn" href="#/">Back to tracks</a></div>`;
        return;
      }
      const { k, w, quranic } = items[i];
      app.innerHTML = `
        <div class="flash">
          <div class="meta"><span>Card ${i + 1} of ${items.length}</span><span>Box ${cards[k]?.box ?? 1}</span></div>
          <span class="${quranic ? 'quran' : 'ar'}" lang="ar">${esc(w.ar)}</span>
          <div class="center">${speakBtn(w.ar)}</div>
          <div class="answer" id="ans" hidden><div class="tr">${esc(w.tr)}</div><div class="en">${esc(w.en)}</div></div>
          <div class="actions" style="justify-content:center" id="reveal-wrap"><button class="btn" id="reveal">Show answer</button></div>
          <div class="actions" style="justify-content:center" id="grade" hidden>
            <button class="btn ghost" data-g="0">Again</button>
            <button class="btn" data-g="1">Got it</button>
          </div>
        </div>`;
      document.getElementById('reveal').addEventListener('click', () => {
        document.getElementById('ans').hidden = false;
        document.getElementById('reveal-wrap').hidden = true;
        document.getElementById('grade').hidden = false;
      });
      document.querySelectorAll('[data-g]').forEach(b => b.addEventListener('click', () => {
        const c = getCards();
        const card = c[k] || { box: 1 };
        if (b.dataset.g === '1') {
          known++;
          card.box = Math.min(card.box + 1, BOX_DAYS.length - 1);
          card.due = Date.now() + BOX_DAYS[card.box] * DAY;
        } else {
          card.box = 1;
          card.due = Date.now() + 10 * 60 * 1000; // back in 10 minutes
        }
        c[k] = card;
        setCards(c);
        i++;
        show();
      }));
    };
    show();
  }

  // ---------- router ----------
  async function route() {
    const parts = (location.hash.slice(1) || '/').split('/').filter(Boolean);
    try {
      if (parts[0] === 'lesson') await renderLesson(parts[1]);
      else if (parts[0] === 'quiz') await renderQuiz(parts[1]);
      else if (parts[0] === 'review') await renderReview();
      else await renderHome();
    } catch (e) {
      app.innerHTML = `<p class="error">${esc(e.message)}</p><a class="btn ghost" href="#/">Back to tracks</a>`;
    }
    updateBadge();
    window.scrollTo(0, 0);
  }

  document.getElementById('reset').addEventListener('click', () => {
    if (confirm('Reset all lesson progress and flashcards in this browser?')) {
      store.set('progress', {});
      store.set('cards', {});
      route();
    }
  });
  if ('speechSynthesis' in window) speechSynthesis.getVoices(); // warm up voice list
  window.addEventListener('hashchange', route);
  route();
})();
