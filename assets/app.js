/* Arabii — Arabic from A to Z.
 * Static, dependency-free. Course data: content/course.json + content/lessons/<id>.json
 * Every lesson: Learn → Understand → Read → Practice → Check. Passing Check (80%) unlocks the next
 * lesson and sends the lesson's words to spaced review. scripts/check_content.py guarantees nothing
 * is practised or tested before the lesson (or an earlier one) has taught it.
 */
(() => {
  'use strict';
  const app = document.getElementById('app');
  const DAY = 864e5;
  const BOX_DAYS = [0, 1, 3, 7, 16, 35, 90];
  const PASS = 0.8;
  const STEPS = [
    { id: 'learn', label: 'Learn', sub: 'new words' },
    { id: 'understand', label: 'Understand', sub: 'the rule' },
    { id: 'read', label: 'Read', sub: 'a passage' },
    { id: 'practice', label: 'Practice', sub: 'with hints' },
    { id: 'check', label: 'Check', sub: 'to unlock' }
  ];

  // ---------- helpers ----------
  const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const shuffle = a => { a = a.slice(); for (let i = a.length - 1; i > 0; i--) { const j = Math.random() * (i + 1) | 0; [a[i], a[j]] = [a[j], a[i]]; } return a; };
  const isArabic = s => /[؀-ۿ]/.test(String(s));
  const arSpan = (s, cls = '') => `<span class="ar ${cls}" lang="ar">${esc(s)}</span>`;

  // ---------- state ----------
  const KEY = 'arabii-v2';
  const blank = () => ({ done: {}, steps: {}, cards: {}, unlockAll: false });
  let S;
  try { S = Object.assign(blank(), JSON.parse(localStorage.getItem(KEY) || '{}')); } catch { S = blank(); }
  const save = () => { try { localStorage.setItem(KEY, JSON.stringify(S)); } catch { /* storage blocked */ } };

  // ---------- content ----------
  let course;
  const lessons = {};
  async function getCourse() {
    if (!course) {
      const r = await fetch('content/course.json');
      if (!r.ok) throw new Error('Could not load the course.');
      course = await r.json();
      course.order = course.stages.flatMap(s => s.lessons.map(l => ({ ...l, stage: s })));
    }
    return course;
  }
  async function getLesson(id) {
    if (!/^[\w-]+$/.test(id || '')) throw new Error('Unknown lesson.');
    if (!lessons[id]) {
      const r = await fetch(`content/lessons/${id}.json`);
      if (!r.ok) throw new Error(`Lesson "${id}" not found.`);
      lessons[id] = await r.json();
    }
    return lessons[id];
  }
  const indexOf = id => course.order.findIndex(l => l.id === id);
  const isUnlocked = id => {
    const i = indexOf(id);
    return S.unlockAll || i <= 0 || !!S.done[course.order[i - 1].id];
  };
  const nextLessonId = () => (course.order.find(l => !S.done[l.id]) || {}).id;

  // ---------- speech ----------
  function speak(text) {
    if (!('speechSynthesis' in window)) return;
    const u = new SpeechSynthesisUtterance(text);
    u.lang = 'ar-SA'; u.rate = 0.75;
    const v = speechSynthesis.getVoices().find(v => (v.lang || '').toLowerCase().startsWith('ar'));
    if (v) u.voice = v;
    speechSynthesis.cancel(); speechSynthesis.speak(u);
  }
  document.addEventListener('click', e => {
    const b = e.target.closest('[data-speak]');
    if (b) { e.preventDefault(); e.stopPropagation(); speak(b.dataset.speak); }
  });
  const speakBtn = t => `<button class="speak" data-speak="${esc(t)}" aria-label="Listen" title="Listen">▶</button>`;

  // ---------- review deck ----------
  function seedCards(lessonId, words) {
    (words || []).forEach((w, i) => {
      if (w.noCard) return;
      const k = `${lessonId}:${i}`;
      if (!S.cards[k]) S.cards[k] = { box: 1, due: Date.now() + DAY / 2 };
    });
    save();
  }
  const dueKeys = () => Object.keys(S.cards).filter(k => S.cards[k].due <= Date.now());
  function updateChrome(route) {
    const n = dueKeys().length, b = document.getElementById('due-badge');
    b.hidden = !n; b.textContent = n > 99 ? '99+' : n;
    document.querySelectorAll('[data-nav]').forEach(a => a.classList.toggle('on', a.dataset.nav === route));
  }

  // ---------- known words (for distractors) ----------
  async function knownWordsUpTo(lessonId) {
    const out = [];
    for (const l of course.order.slice(0, indexOf(lessonId) + 1)) {
      const L = await getLesson(l.id);
      (L.words || []).forEach(w => { if (!w.noQuiz) out.push({ ...w, lesson: l.id }); });
    }
    return out;
  }

  // =========================================================
  // PATH (home)
  // =========================================================
  async function renderPath() {
    await getCourse();
    const total = course.order.length;
    const done = course.order.filter(l => S.done[l.id]).length;
    const nextId = nextLessonId();
    const next = course.order.find(l => l.id === nextId);
    const due = dueKeys().length;

    app.innerHTML = `
      <section class="hero">
        <h1>${esc(course.title)}</h1>
        <p class="muted">${esc(course.tagline)}</p>
        ${next ? `<div class="card continue">
            <div><div class="muted small">${done ? 'Continue with' : 'Start here'} · ${esc(next.stage.title)}</div>
            <strong style="font-size:1.15rem">${esc(next.title)}</strong></div>
            <span class="ar" lang="ar">${esc(next.ar)}</span>
            <a class="btn" href="#/lesson/${next.id}">${done ? 'Continue' : 'Begin'} →</a>
          </div>` : `<div class="card"><strong>All available lessons complete.</strong> <span class="muted">Keep your review going while the next stage is built.</span></div>`}
        <div class="stats">
          <div class="stat"><b>${done}/${total}</b><span>lessons</span></div>
          <div class="stat"><b>${Object.keys(S.cards).length}</b><span>words learned</span></div>
          <div class="stat"><b>${due}</b><span>due for review</span></div>
        </div>
        ${due ? `<a class="btn ghost" href="#/review">Review ${due} word${due === 1 ? '' : 's'}</a>` : ''}
      </section>
      ${course.stages.map(st => `
        <section class="stage">
          <div class="stage-head"><h2>${esc(st.title)}</h2><span class="ar" lang="ar">${esc(st.ar)}</span></div>
          <p class="stage-src">${esc(st.about)}</p>
          <ol class="path">${st.lessons.map(l => {
            const n = indexOf(l.id) + 1, ok = !!S.done[l.id], open = isUnlocked(l.id), isNext = l.id === nextId;
            const inner = `<span class="node ${ok ? 'done' : isNext ? 'next' : ''}">${ok ? '✓' : n}</span>
              <span class="t"><span class="ar" lang="ar">${esc(l.ar)}</span><strong>${esc(l.title)}</strong><small>${esc(l.summary)}</small></span>`;
            return `<li>${open ? `<a href="#/lesson/${l.id}">${inner}</a>` : `<span class="locked" title="Pass the previous lesson to unlock">${inner}</span>`}</li>`;
          }).join('')}</ol>
        </section>`).join('')}
      ${(course.roadmap || []).map(st => `
        <section class="stage">
          <div class="stage-head"><h2>${esc(st.title)}</h2><span class="ar" lang="ar">${esc(st.ar)}</span></div>
          <p class="stage-src">${esc(st.about)} <em>Coming next.</em></p>
          <ol class="path roadmap">${st.topics.map(t => `<li><span class="node">·</span><span>${esc(t)}</span></li>`).join('')}</ol>
        </section>`).join('')}
      <p class="small muted">Lessons unlock in order. Already know some of this?
        <label class="toggle" style="display:inline-flex"><input type="checkbox" id="unlock" ${S.unlockAll ? 'checked' : ''}> Unlock every lesson</label></p>`;
    document.getElementById('unlock').addEventListener('change', e => { S.unlockAll = e.target.checked; save(); renderPath(); });
  }

  // =========================================================
  // LESSON
  // =========================================================
  async function renderLesson(id, stepId) {
    await getCourse();
    if (!isUnlocked(id)) { location.hash = '#/'; return; }
    const L = await getLesson(id);
    const meta = course.order[indexOf(id)];
    const steps = STEPS.filter(s => s.id !== 'read' || L.read);
    const seen = new Set(S.steps[id] || []);
    if (!stepId || !steps.some(s => s.id === stepId)) {
      stepId = S.done[id] ? 'learn' : (steps.find(s => !seen.has(s.id)) || steps[0]).id;
    }
    // a step is reachable once every step before it has been visited (or the lesson is passed)
    const reachable = s => S.done[id] || steps.slice(0, steps.indexOf(s)).every(p => seen.has(p.id));
    const cur = steps.find(s => s.id === stepId);
    if (!reachable(cur)) stepId = steps.find(s => !seen.has(s.id)).id;
    seen.add(stepId); S.steps[id] = [...seen]; save();
    const idx = steps.findIndex(s => s.id === stepId);
    const nextStep = steps[idx + 1];

    app.innerHTML = `
      <div class="crumb"><a href="#/">Path</a> › ${esc(meta.stage.title)} · Lesson ${indexOf(id) + 1}</div>
      <div class="lesson-head">
        <div class="ar-title" lang="ar">${esc(L.ar)}</div>
        <h1>${esc(L.title)}</h1>
      </div>
      <div class="goal"><strong>Goal:</strong> ${esc(L.goal)}</div>
      <nav class="steps">${steps.map((s, i) => `<button data-step="${s.id}" class="${s.id === stepId ? 'on' : ''} ${seen.has(s.id) ? 'seen' : ''}" ${reachable(s) || seen.has(s.id) ? '' : 'disabled'}><b>${i + 1}. ${s.label}</b><span class="sub">${s.sub}</span></button>`).join('')}</nav>
      <section id="step"></section>`;
    app.querySelectorAll('[data-step]').forEach(b => b.addEventListener('click', () => { location.hash = `#/lesson/${id}/${b.dataset.step}`; }));
    const box = document.getElementById('step');
    const nextBtn = label => nextStep ? `<div class="row"><a class="btn" href="#/lesson/${id}/${nextStep.id}">${label || `Next: ${nextStep.label}`} →</a></div>` : '';

    if (stepId === 'learn') {
      box.innerHTML = `
        ${L.learnIntro ? `<div class="prose"><p>${L.learnIntro}</p></div>` : ''}
        ${L.words?.length ? `<p class="muted">Read each word aloud, press ▶ to hear it, and say what it means before moving on.</p>
        <div class="words">${L.words.map(w => `
          <div class="word"><div class="word-top">${speakBtn(w.ar)}${arSpan(w.ar)}</div>
            <span class="tr">${esc(w.tr)}</span><span class="en">${esc(w.en)}</span>${w.note ? `<span class="note">${esc(w.note)}</span>` : ''}</div>`).join('')}</div>`
        : `<p class="muted">No new vocabulary in this lesson. It's all about the skill in the next step.</p>`}
        ${nextBtn('I\'ve studied these. Next: Understand')}`;
    } else if (stepId === 'understand') {
      box.innerHTML = `<div class="prose">${(L.understand || []).map(renderBlock).join('')}</div>${nextBtn()}`;
      box.querySelectorAll('.tile').forEach(t => t.addEventListener('click', () => t.classList.toggle('open')));
    } else if (stepId === 'read') {
      box.innerHTML = `
        ${L.read.intro ? `<p class="muted">${esc(L.read.intro)}</p>` : ''}
        <p class="small muted">Read each line aloud first. Then tap “meaning” to check yourself.</p>
        <div class="passage">${L.read.lines.map(ln => `
          <div class="line">${ln.who ? `<div class="who">${esc(ln.who)}</div>` : ''}
            <div class="word-top">${speakBtn(ln.ar)}${arSpan(ln.ar)}</div>
            <button class="linkish small" data-reveal>meaning</button><div class="en" hidden>${esc(ln.en)}</div></div>`).join('')}</div>
        ${nextBtn()}`;
      box.querySelectorAll('[data-reveal]').forEach(b => b.addEventListener('click', () => { b.nextElementSibling.hidden = false; b.hidden = true; }));
    } else if (stepId === 'practice') {
      runExercises(box, L.practice || [], 'practice', () => {
        box.innerHTML = `<div class="ex result"><h2>Practice done</h2>
          <p>Mistakes here don't count. When you feel ready, take the check. You need ${PASS * 100}% to unlock the next lesson.</p>
          <div class="row" style="justify-content:center"><button class="btn ghost" id="again">Practice again</button>
          <a class="btn" href="#/lesson/${id}/check">Take the check →</a></div></div>`;
        document.getElementById('again').addEventListener('click', () => renderLesson(id, 'practice'));
      });
    } else if (stepId === 'check') {
      const qs = shuffle([...(L.check || []), ...(await autoVocab(id, L))]);
      runExercises(box, qs, 'check', (score, misses) => finishCheck(id, L, score, qs.length, misses));
    }
  }

  function renderBlock(b) {
    if (b.h) return `<h3>${esc(b.h)}</h3>`;
    if (b.p) return `<p>${b.p}</p>`;
    if (b.rule) return `<div class="rule">${b.rule}</div>`;
    if (b.tip) return `<div class="tip">${b.tip}</div>`;
    if (b.examples) return `<ul class="examples">${b.examples.map(x => `<li>${arSpan(x.ar)}<div class="ex-row"><span class="en">${esc(x.en)}</span>${speakBtn(x.ar)}</div></li>`).join('')}</ul>`;
    if (b.table) {
      const t = b.table, arCols = t.ar || [];
      return `<div class="table-wrap"><table><thead><tr>${t.headers.map(h => `<th>${esc(h)}</th>`).join('')}</tr></thead>
        <tbody>${t.rows.map(r => `<tr>${r.map((c, i) => arCols.includes(i) ? `<td class="ar" lang="ar">${esc(c)}</td>` : `<td>${esc(c)}</td>`).join('')}</tr>`).join('')}</tbody></table></div>`;
    }
    if (b.letters) {
      const NJ = new Set('اأإآدذرزو'), T = 'ـ';
      return `<p class="small muted">Tap a letter to see its start · middle · end shapes.</p><div class="letters">${b.letters.map(l => {
        const f = NJ.has(l.ar) ? [l.ar, T + l.ar, T + l.ar] : [l.ar + T, T + l.ar + T, T + l.ar];
        return `<div class="tile" role="button" tabindex="0"><div class="big" lang="ar">${esc(l.ar)}</div><strong>${esc(l.name)}</strong><small>${esc(l.sound)}</small>
          <div class="forms" lang="ar"><span>${f[0]}</span><span>${f[1]}</span><span>${f[2]}</span></div></div>`;
      }).join('')}</div>`;
    }
    return '';
  }

  async function autoVocab(id, L) {
    const mine = (L.words || []).filter(w => !w.noQuiz);
    if (mine.length < 4 || L.noAutoVocab) return [];
    const known = await knownWordsUpTo(id);
    return shuffle(mine).slice(0, Math.min(5, mine.length)).map(w => {
      const pool = shuffle(known.filter(k => k.en !== w.en && k.ar !== w.ar));
      const sameLesson = pool.filter(k => k.lesson === id);
      const distract = [...sameLesson, ...pool.filter(k => k.lesson !== id)].slice(0, 3);
      const opts = shuffle([w, ...distract]);
      return Math.random() < 0.65
        ? { t: 'mcq', q: 'What does this mean?', ar: w.ar, opts: opts.map(o => o.en), a: opts.indexOf(w), why: `${w.ar} (${w.tr}) means “${w.en}”.` }
        : { t: 'mcq', q: `Which word means “${w.en}”?`, opts: opts.map(o => o.ar), a: opts.indexOf(w), why: `“${w.en}” is ${w.ar} (${w.tr}).` };
    });
  }

  function finishCheck(id, L, score, total, misses) {
    const pct = total ? score / total : 1;
    const passed = pct >= PASS;
    if (passed) {
      const prev = S.done[id];
      S.done[id] = { score: Math.max(prev?.score || 0, Math.round(pct * 100)), at: Date.now() };
      seedCards(id, L.words);
    }
    save(); updateChrome();
    const nextL = course.order[indexOf(id) + 1];
    const box = document.getElementById('step');
    box.innerHTML = `<div class="ex result">
      <div class="score">${Math.round(pct * 100)}%</div>
      <p>${score} of ${total} correct. ${passed ? '<strong>Lesson passed.</strong> Its words are now in your review deck.' : `You need ${PASS * 100}% to pass. Look over what you missed, then try again.`}</p>
      ${misses.length ? `<div class="misses"><strong>To review:</strong><ul>${misses.map(m => `<li>${m}</li>`).join('')}</ul></div>` : ''}
      <div class="row" style="justify-content:center">
        ${passed ? '' : `<a class="btn ghost" href="#/lesson/${id}/understand">Review the rule</a><button class="btn" id="retry">Try the check again</button>`}
        ${passed && nextL ? `<a class="btn" href="#/lesson/${nextL.id}">Next lesson: ${esc(nextL.title)} →</a>` : ''}
        ${passed && !nextL ? `<a class="btn" href="#/">Back to the path</a>` : ''}
      </div></div>`;
    document.getElementById('retry')?.addEventListener('click', () => renderLesson(id, 'check'));
  }

  // =========================================================
  // EXERCISE RUNNER (mcq · build · match)
  // =========================================================
  function runExercises(box, list, mode, onDone) {
    if (!list.length) { onDone(0, []); return; }
    let i = 0, score = 0;
    const results = [], misses = [];
    const show = () => {
      if (i >= list.length) return onDone(score, misses);
      const ex = list[i];
      box.innerHTML = `<div class="ex">
        <div class="pbar">${list.map((_, k) => `<i class="${k < i ? (results[k] ? 'ok' : 'no') : k === i ? 'now' : ''}"></i>`).join('')}</div>
        <div class="ex-meta"><span>${mode === 'check' ? 'Check' : 'Practice'} · ${i + 1} of ${list.length}</span>${mode === 'check' ? `<span>${score} correct</span>` : ''}</div>
        <div id="body"></div><div id="fb"></div>
        <div class="row" id="go" hidden><button class="btn" id="cont">${i + 1 < list.length ? 'Continue' : 'Finish'}</button></div>
      </div>`;
      const body = box.querySelector('#body'), fb = box.querySelector('#fb');
      const finish = (ok, why, missText) => {
        results[i] = ok; if (ok) score++; else if (missText) misses.push(missText);
        fb.innerHTML = `<div class="feedback ${ok ? 'ok' : 'no'}"><b>${ok ? 'Correct' : 'Not quite'}</b>${why ? `<span>${why}</span>` : ''}</div>`;
        box.querySelector('#go').hidden = false;
        box.querySelector('#cont').focus();
        box.querySelector('#cont').addEventListener('click', () => { i++; show(); });
      };
      const T = ex.t || 'mcq';
      if (T === 'mcq') mcq(body, ex, finish);
      else if (T === 'build') build(body, ex, finish);
      else if (T === 'match') match(body, ex, finish);
    };
    show();
  }

  function mcq(body, ex, finish) {
    const arOpts = ex.opts.every(isArabic);
    body.innerHTML = `<div class="q">${esc(ex.q)}</div>${ex.ar ? `<div class="q-ar" lang="ar">${esc(ex.ar)}</div>` : ''}
      <div class="opts">${ex.opts.map((o, k) => `<button class="opt ${arOpts ? 'arabic' : ''}" data-k="${k}" ${arOpts ? 'lang="ar"' : ''}>${esc(o)}</button>`).join('')}</div>`;
    const bs = [...body.querySelectorAll('.opt')];
    bs.forEach(b => b.addEventListener('click', () => {
      const k = +b.dataset.k, ok = k === ex.a;
      bs.forEach(x => { x.disabled = true; if (+x.dataset.k === ex.a) x.classList.add('right'); });
      if (!ok) b.classList.add('wrong');
      if (ex.ar) speak(ex.ar); else if (arOpts) speak(ex.opts[ex.a]);
      finish(ok, ex.why ? esc(ex.why) : '', `${esc(ex.q)}${ex.ar ? ` ${arSpan(ex.ar)}` : ''} → ${arOpts ? arSpan(ex.opts[ex.a]) : esc(ex.opts[ex.a])}`);
    }));
  }

  function build(body, ex, finish) {
    const target = ex.words;
    const bank = shuffle([...target, ...(ex.extra || [])].map((w, k) => ({ w, k })));
    const placed = [];
    body.innerHTML = `<div class="q">${esc(ex.q || 'Build the sentence in Arabic:')}</div>
      <p><strong>“${esc(ex.en)}”</strong></p>
      <div class="tray" id="tray"><span class="muted small" style="direction:ltr">Tap words in order (right to left)…</span></div>
      <div class="bank" id="bank">${bank.map((b, n) => `<button class="chip" lang="ar" data-n="${n}">${esc(b.w)}</button>`).join('')}</div>
      <div class="row"><button class="btn ghost" id="undo">Undo</button><button class="btn" id="checkb" disabled>Check</button></div>`;
    const tray = body.querySelector('#tray'), checkb = body.querySelector('#checkb');
    const draw = () => {
      tray.innerHTML = placed.length ? placed.map(n => `<span class="chip" style="cursor:default">${esc(bank[n].w)}</span>`).join('') : '<span class="muted small" style="direction:ltr">Tap words in order (right to left)…</span>';
      body.querySelectorAll('#bank .chip').forEach(c => { c.disabled = placed.includes(+c.dataset.n); });
      checkb.disabled = placed.length !== target.length;
    };
    body.querySelectorAll('#bank .chip').forEach(c => c.addEventListener('click', () => { if (placed.length < target.length) { placed.push(+c.dataset.n); draw(); } }));
    body.querySelector('#undo').addEventListener('click', () => { placed.pop(); draw(); });
    checkb.addEventListener('click', () => {
      const got = placed.map(n => bank[n].w), ok = got.join(' ') === target.join(' ');
      tray.classList.add(ok ? 'right' : 'wrong');
      body.querySelectorAll('button').forEach(b => { b.disabled = true; });
      speak(target.join(' '));
      finish(ok, `${ok ? '' : 'Correct order: '}${arSpan(target.join(' '))}${ex.why ? `<br>${esc(ex.why)}` : ''}`, `“${esc(ex.en)}” → ${arSpan(target.join(' '))}`);
    });
  }

  function match(body, ex, finish) {
    const left = shuffle(ex.pairs.map((p, k) => ({ v: p[0], k }))), right = shuffle(ex.pairs.map((p, k) => ({ v: p[1], k })));
    let sel = null, mistakes = 0, matched = 0;
    body.innerHTML = `<div class="q">${esc(ex.q || 'Match each pair.')}</div>
      <div class="match"><div class="col">${left.map(x => `<button class="${isArabic(x.v) ? 'arabic' : ''}" data-side="l" data-k="${x.k}">${esc(x.v)}</button>`).join('')}</div>
      <div class="col">${right.map(x => `<button class="${isArabic(x.v) ? 'arabic' : ''}" data-side="r" data-k="${x.k}">${esc(x.v)}</button>`).join('')}</div></div>`;
    body.querySelectorAll('.match button').forEach(b => b.addEventListener('click', () => {
      if (b.classList.contains('done')) return;
      if (!sel || sel.dataset.side === b.dataset.side) {
        body.querySelectorAll('.match button.sel').forEach(x => x.classList.remove('sel'));
        sel = b; b.classList.add('sel');
        if (isArabic(b.textContent)) speak(b.textContent);
        return;
      }
      if (sel.dataset.k === b.dataset.k) {
        [sel, b].forEach(x => { x.classList.remove('sel'); x.classList.add('done'); });
        matched++;
        if (matched === ex.pairs.length) finish(mistakes <= 1, mistakes ? `${mistakes} wrong pairing${mistakes > 1 ? 's' : ''} on the way.` : 'All pairs matched first time.', esc(ex.q || 'Matching pairs'));
      } else {
        mistakes++;
        [sel, b].forEach(x => { x.classList.remove('sel'); x.classList.add('shake'); setTimeout(() => x.classList.remove('shake'), 320); });
      }
      sel = null;
    }));
  }

  // =========================================================
  // REVIEW · WORDS · METHOD
  // =========================================================
  async function wordForKey(k) {
    const [lid, n] = k.split(':');
    try { const L = await getLesson(lid); return L.words?.[+n]; } catch { return null; }
  }

  async function renderReview() {
    await getCourse();
    const keys = shuffle(dueKeys()).slice(0, 30);
    if (!keys.length) {
      const total = Object.keys(S.cards).length;
      app.innerHTML = `<div class="ex center"><h1>All caught up</h1><p class="muted">${total
        ? `Nothing is due. You have ${total} words in your deck, and they'll come back on a growing schedule: 1 day, 3, 7, 16, 35, then 90.`
        : 'Words enter your review deck when you pass a lesson\'s check.'}</p><a class="btn" href="#/">Back to the path</a></div>`;
      return;
    }
    const items = [];
    for (const k of keys) { const w = await wordForKey(k); if (w) items.push({ k, w }); else delete S.cards[k]; }
    save();
    let i = 0, got = 0;
    const show = () => {
      if (i >= items.length) {
        updateChrome('review');
        app.innerHTML = `<div class="ex center"><h1>Session done</h1><p>${got} of ${items.length} remembered. Words you missed come back in 10 minutes.</p><a class="btn" href="#/">Back to the path</a></div>`;
        return;
      }
      const { k, w } = items[i];
      app.innerHTML = `<h1>Review</h1><div class="ex flash">
        <div class="ex-meta"><span>${i + 1} of ${items.length}</span><span>Level ${S.cards[k].box}</span></div>
        ${arSpan(w.ar)}<div class="center">${speakBtn(w.ar)}</div>
        <p class="center muted small">Say the meaning out loud, then reveal.</p>
        <div class="answer" id="ans" hidden><div class="muted"><em>${esc(w.tr)}</em></div><div style="font-size:1.25rem;font-weight:600">${esc(w.en)}</div></div>
        <div class="row" style="justify-content:center" id="r1"><button class="btn" id="reveal">Show answer</button></div>
        <div class="row" style="justify-content:center" id="r2" hidden><button class="btn ghost" data-g="0">Didn't know</button><button class="btn" data-g="1">Knew it</button></div></div>`;
      document.getElementById('reveal').addEventListener('click', () => { ans.hidden = false; r1.hidden = true; r2.hidden = false; });
      const ans = document.getElementById('ans'), r1 = document.getElementById('r1'), r2 = document.getElementById('r2');
      app.querySelectorAll('[data-g]').forEach(b => b.addEventListener('click', () => {
        const c = S.cards[k];
        if (b.dataset.g === '1') { got++; c.box = Math.min(c.box + 1, BOX_DAYS.length - 1); c.due = Date.now() + BOX_DAYS[c.box] * DAY; }
        else { c.box = 1; c.due = Date.now() + 10 * 60e3; }
        save(); i++; show();
      }));
    };
    show();
  }

  async function renderWords() {
    await getCourse();
    const rows = [];
    for (const l of course.order) {
      if (!S.done[l.id] && !S.unlockAll) continue;
      const L = await getLesson(l.id);
      (L.words || []).forEach(w => rows.push({ ...w, lesson: indexOf(l.id) + 1 }));
    }
    app.innerHTML = `<h1>Your words</h1>
      <p class="muted">Every word from the lessons you've passed (${rows.length}).</p>
      <input class="search" id="q" placeholder="Search Arabic, transliteration or English…" aria-label="Search words">
      ${rows.length ? `<div class="table-wrap"><table class="wordlist"><thead><tr><th>Arabic</th><th>Say it</th><th>Meaning</th><th>Lesson</th></tr></thead>
      <tbody id="tb"></tbody></table></div>` : '<p>Pass your first lesson to start your word list.</p>'}`;
    const strip = s => s.replace(/[ً-ْٰـ]/g, '').toLowerCase();
    const draw = q => {
      const tb = document.getElementById('tb'); if (!tb) return;
      const f = strip(q || '');
      tb.innerHTML = rows.filter(r => !f || strip(r.ar).includes(f) || strip(r.tr).includes(f) || r.en.toLowerCase().includes(f))
        .map(r => `<tr><td class="ar" lang="ar">${esc(r.ar)} ${speakBtn(r.ar)}</td><td><em>${esc(r.tr)}</em></td><td>${esc(r.en)}</td><td class="muted">${r.lesson}</td></tr>`).join('');
    };
    document.getElementById('q').addEventListener('input', e => draw(e.target.value));
    draw('');
  }

  async function renderAbout() {
    await getCourse();
    const m = course.method;
    app.innerHTML = `<h1>${esc(m.title)}</h1><div class="prose">${m.body.map(p => `<p>${p}</p>`).join('')}</div>
      <h2>Where the order comes from</h2><ul class="sources">${m.sources.map(s => `<li>${s}</li>`).join('')}</ul>
      <h2>Your progress</h2><p class="muted">Saved in this browser only.</p>
      <button class="btn ghost" id="reset">Reset all progress</button>`;
    document.getElementById('reset').addEventListener('click', () => {
      if (confirm('Erase all lesson progress and review cards in this browser?')) { S = blank(); save(); location.hash = '#/'; }
    });
  }

  // ---------- router ----------
  async function route() {
    const [r, a, b] = (location.hash.slice(2) || '').split('/');
    try {
      if (r === 'lesson') await renderLesson(a, b);
      else if (r === 'review') await renderReview();
      else if (r === 'words') await renderWords();
      else if (r === 'about') await renderAbout();
      else await renderPath();
    } catch (e) {
      console.error(e);
      app.innerHTML = `<p style="color:var(--bad)">${esc(e.message)}</p><a class="btn ghost" href="#/">Back to the path</a>`;
    }
    updateChrome(r === 'lesson' ? 'path' : r || 'path');
    window.scrollTo(0, 0);
  }
  if ('speechSynthesis' in window) speechSynthesis.getVoices();
  window.addEventListener('hashchange', route);
  route();
})();
