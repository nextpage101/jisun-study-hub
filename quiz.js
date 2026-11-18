/* Study Hub — shared quiz engine.
   Each quiz page sets window.QUIZ before loading this file:
   { key, todayId, title, lead, art, letters, days: [[question numbers], ...], qs: [{sec, q, c: [choices], a, hint, sol}] }
   Change STUDENT_NAME to show a name in the praise messages ("" = no name). */
const STUDENT_NAME = "Vincent";

(function () {
  const Q = window.QUIZ;
  const $ = id => document.getElementById(id);
  const main = $("main");
  const withName = s => STUDENT_NAME ? s.replace("{name}", STUDENT_NAME) : s.replace(/,? ?\{name\}/, "");
  const PRAISE = ["Correct, {name}!", "Nice work, {name}!", "Exactly right!", "Great thinking, {name}!", "You got it, {name}!"];
  const RETRY = ["Not quite — try again!", "Close! Give it another look.", "Hmm, not this one. You can do it!"];
  const pick = a => a[Math.floor(Math.random() * a.length)];
  const HUB = STUDENT_NAME ? `${STUDENT_NAME}’s Study Hub` : "My Study Hub";
  if (STUDENT_NAME) document.title = `${STUDENT_NAME} · ${document.title}`;

  const fresh = () => ({days: Q.days.map(() => ({i: 0, res: {}, done: false})), celebrated: false});
  const load = () => { try { const s = JSON.parse(localStorage.getItem(Q.key)); return s && s.days && s.days.length === Q.days.length ? s : null; } catch (e) { return null; } };
  const save = () => { try { localStorage.setItem(Q.key, JSON.stringify(state)); } catch (e) {} };
  let state = load() || fresh();
  let cur = null, tries = 0;

  function logToday(subj, label) {
    try {
      const k = "us-study-today-v1", n = new Date(), day = n.getFullYear() + "-" + (n.getMonth() + 1) + "-" + n.getDate();
      let s = JSON.parse(localStorage.getItem(k)) || {};
      if (s.date !== day || !s.done) s = {date: day, done: {}};
      const a = s.done[subj] || (s.done[subj] = []);
      if (!a.includes(label)) a.push(label);
      localStorage.setItem(k, JSON.stringify(s));
    } catch (e) {}
  }

  function closePopup() { const p = document.querySelector(".pop-bg"); if (p) p.remove(); }
  function popup({art, title, text, why, buttons}) {
    closePopup();
    const bg = document.createElement("div"); bg.className = "pop-bg";
    bg.innerHTML = `<div class="pop" role="dialog" aria-modal="true" aria-live="assertive">
      ${art ? `<div class="pop-art">${art}</div>` : ""}<strong>${title}</strong>${text ? `<p>${text}</p>` : ""}
      ${why ? `<p class="why">${why}</p>` : ""}
      ${buttons.map((b, k) => `<button class="btn${k ? " soft" : ""}" data-k="${k}">${b[0]}</button>`).join("")}</div>`;
    document.body.appendChild(bg);
    bg.querySelectorAll("button").forEach(btn => btn.addEventListener("click", () => buttons[Number(btn.dataset.k)][1]()));
    bg.querySelector("button").focus();
  }

  const score = k => Q.days[k].filter(n => state.days[k].res[n] === true).length;

  function renderHome() {
    closePopup(); cur = null;
    const firstOpen = state.days.findIndex(d => !d.done);
    const allDone = firstOpen === -1;
    const cards = state.days.map((d, k) => {
      const total = Q.days[k].length;
      const sub = d.done ? `Done! ${score(k)}/${total}` : d.i > 0 ? `${d.i}/${total} in progress` : `${total} questions`;
      return `<button class="day ${d.done ? "done" : ""} ${k === firstOpen ? "next" : ""}" data-day="${k}" aria-label="Day ${k + 1}, ${sub}"><span class="d">Day ${k + 1}</span><span class="s">${sub}</span></button>`;
    }).join("");
    main.innerHTML = `
      <a class="link" href="index.html">← All subjects</a>
      <section class="card hero"><p class="eyebrow">${HUB}</p><div class="art">${Q.art}</div><h2>${STUDENT_NAME ? `${STUDENT_NAME}, it’s ${Q.title.replace(/^Time for /, "time for ")}!` : Q.title}</h2><p class="lead">${Q.lead}</p></section>
      <section class="days" aria-label="Days">${cards}</section>
      ${allDone ? `<div class="btns"><button class="btn soft" id="party">Celebrate again</button></div>` : ""}`;
    main.querySelectorAll(".day").forEach(b => b.addEventListener("click", () => startDay(Number(b.dataset.day))));
    if (allDone) $("party").addEventListener("click", renderCelebrate);
    window.scrollTo(0, 0);
  }

  function startDay(k) {
    cur = k;
    const d = state.days[k];
    if (d.done) { d.i = 0; d.res = {}; d.done = false; save(); }
    renderQuestion();
  }

  function renderQuestion() {
    closePopup(); tries = 0;
    const d = state.days[cur], list = Q.days[cur], n = list[d.i], q = Q.qs[n - 1];
    main.innerHTML = `
      <div class="qtop"><button class="link" id="back">← Days</button><span class="count">${STUDENT_NAME ? STUDENT_NAME + " · " : ""}Day ${cur + 1} · ${d.i + 1} / ${list.length}</span></div>
      <div class="bar" aria-hidden="true"><i style="width:${(d.i / list.length) * 100}%"></i></div>
      <section class="card">
        <span class="tag">${q.sec}</span>
        <div class="stem">${q.q}</div>
        <div class="choices" role="group" aria-label="Answer choices">
          ${q.c.map((c, k) => `<button class="choice" data-k="${k}"><span class="L">${Q.letters[k]}</span><span>${c}</span></button>`).join("")}
        </div>
        <div id="after"></div>
      </section>`;
    $("back").addEventListener("click", renderHome);
    main.querySelectorAll(".choice").forEach(b => b.addEventListener("click", () => answer(Number(b.dataset.k), b)));
    window.scrollTo(0, 0);
  }

  function answer(k, btn) {
    const d = state.days[cur], n = Q.days[cur][d.i], q = Q.qs[n - 1];
    if (k === q.a) {
      if (!(n in d.res)) d.res[n] = tries === 0;
      save();
      btn.classList.add("right");
      main.querySelectorAll(".choice").forEach(b => b.disabled = true);
      popup({art: Q.art, title: withName(pick(PRAISE)), why: `<b>Why:</b> ${q.sol}`, buttons: [[isLast() ? "Finish Day " + (cur + 1) : "Next question →", next]]});
      return;
    }
    tries++;
    btn.classList.add("wrong"); btn.disabled = true;
    if (tries === 1) {
      popup({title: pick(RETRY), text: `<b>Hint:</b> ${q.hint}`, buttons: [["Try again", closePopup]]});
    } else {
      d.res[n] = false; save();
      popup({title: "That's okay!", text: "Tricky one. Let's look at the answer together.", buttons: [["Show the answer together", () => showSolution(q)], ["Let me try once more", closePopup]]});
    }
  }

  function showSolution(q) {
    closePopup();
    main.querySelectorAll(".choice").forEach(b => { b.disabled = true; if (Number(b.dataset.k) === q.a) b.classList.add("right"); });
    $("after").innerHTML = `<div class="sol"><b>Answer: (${Q.letters[q.a]}) ${q.c[q.a]}</b><p style="margin:6px 0 0">${q.sol}</p></div>
      <div class="btns" style="margin-top:14px"><button class="btn" id="go">${isLast() ? "Finish Day " + (cur + 1) : "Next question →"}</button></div>`;
    $("go").addEventListener("click", next);
    $("go").focus();
  }

  const isLast = () => state.days[cur].i === Q.days[cur].length - 1;
  function next() {
    const d = state.days[cur];
    if (isLast()) {
      d.i = Q.days[cur].length; d.done = true; save();
      logToday(Q.todayId, "Day " + (cur + 1));
      renderDayEnd();
    } else { d.i++; save(); renderQuestion(); }
  }

  function renderDayEnd() {
    closePopup();
    const k = cur, list = Q.days[k], d = state.days[k], s = score(k);
    const missed = list.filter(n => d.res[n] !== true);
    const review = missed.map(n => { const q = Q.qs[n - 1]; return `<details><summary>Question ${list.indexOf(n) + 1} — ${q.sec}</summary>
      <div class="stem" style="font-size:inherit">${q.q}</div><p class="ans">Answer: (${Q.letters[q.a]}) ${q.c[q.a]}</p><p style="margin:0">${q.sol}</p></details>`; }).join("");
    const allDone = state.days.every(x => x.done);
    main.innerHTML = `
      <section class="card center">
        <div class="art">${Q.art}</div>
        <h2>${withName("Day " + (k + 1) + " complete, {name}!")}</h2>
        <div class="big">${s} / ${list.length}</div>
        <p class="lead">${s === list.length ? withName("Perfect score, {name}! Amazing.") : "Correct on the first try. Great effort!"}</p>
        ${missed.length ? `<div class="review"><p class="note">Review these questions:</p>${review}</div>` : ""}
        <div class="btns"><button class="btn" id="home">${allDone && !state.celebrated ? "See your reward →" : "Back to days"}</button></div>
      </section>`;
    $("home").addEventListener("click", () => { if (allDone && !state.celebrated) { state.celebrated = true; save(); renderCelebrate(); } else renderHome(); });
    window.scrollTo(0, 0);
  }

  function renderCelebrate() {
    const total = Q.days.reduce((t, list) => t + list.length, 0);
    const right = Q.days.reduce((t, list, k) => t + score(k), 0);
    main.innerHTML = `
      <section class="card center celebrate">
        ${TROPHY}
        <h2>${withName("You finished all 5 days, {name}!")}</h2>
        <div class="big">${right} / ${total}</div>
        <p class="lead">First-try correct answers across all days.</p>
        <div class="btns"><button class="btn" id="home">Back to days</button><button class="btn soft" id="reset">Start over from Day 1</button></div>
      </section>`;
    $("home").addEventListener("click", renderHome);
    $("reset").addEventListener("click", () => { state = fresh(); save(); renderHome(); });
    burst();
  }

  const TROPHY = `<svg class="trophy" viewBox="0 0 200 200" role="img" aria-label="Trophy">
    <path d="M60 40 h80 v34 a40 40 0 0 1 -80 0z" fill="#FFD36E" stroke="#C99A2E" stroke-width="4"/>
    <path d="M60 50 h-18 a18 18 0 0 0 22 30" fill="none" stroke="#FFD36E" stroke-width="9" stroke-linecap="round"/>
    <path d="M140 50 h18 a18 18 0 0 1 -22 30" fill="none" stroke="#FFD36E" stroke-width="9" stroke-linecap="round"/>
    <rect x="90" y="112" width="20" height="26" fill="#FFD36E"/><rect x="64" y="138" width="72" height="20" rx="6" fill="#2F6FB3"/>
    <path d="M100 52 l6 12 13 2 -9 9 2 13 -12 -6 -12 6 2 -13 -9 -9 13 -2z" fill="#FFFFFF"/></svg>`;

  function burst() {
    if (window.matchMedia && matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const layer = document.createElement("div"); layer.className = "party"; document.body.appendChild(layer);
    const COLORS = ["#2F6FB3", "#7FB3E8", "#FFD36E", "#F48BAE", "#8FD6C4", "#C7B6F2"];
    const STAR = "M20 2 L25 14 L38 15 L28 24 L31 37 L20 30 L9 37 L12 24 L2 15 L15 14z";
    for (let i = 0; i < 70; i++) {
      const el = document.createElementNS("http://www.w3.org/2000/svg", "svg");
      const size = 14 + Math.random() * 20;
      el.setAttribute("viewBox", "0 0 40 40"); el.setAttribute("width", size); el.setAttribute("height", size);
      el.innerHTML = i % 3 ? `<path d="${STAR}" fill="${COLORS[i % 6]}"/>` : `<rect x="8" y="14" width="24" height="12" rx="3" fill="${COLORS[i % 6]}"/>`;
      el.style.left = Math.random() * 100 + "vw"; el.style.top = "-40px";
      layer.appendChild(el);
      el.animate([{transform: "translateY(0) rotate(0)"}, {transform: `translateY(${innerHeight + 80}px) rotate(${(Math.random() - .5) * 720}deg)`}],
        {duration: 2200 + Math.random() * 1800, delay: Math.random() * 900, easing: "ease-in", fill: "both"});
    }
    setTimeout(() => layer.remove(), 5000);
  }

  renderHome();
})();
