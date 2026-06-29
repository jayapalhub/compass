/* Better Security · Compass — front-end logic
   No localStorage / sessionStorage. All state lives in memory. */

(function () {
  "use strict";

  // ---------------------------------------------------------------------------
  // Assessment definition
  // ---------------------------------------------------------------------------
  const DIMENSIONS = [
    "Visibility",
    "Risk Posture",
    "Regulatory & Obligation Awareness",
    "Policy & Guardrails",
    "Accountability",
    "Operational Readiness",
  ];

  // Each question: dimension index + options [{text, points}]
  const QUESTIONS = [
    { d: 0, q: "How confident are you that you have a complete inventory of the AI tools and systems in use across your organization?", o: [
      { t: "We have a maintained, current inventory of all AI in use", p: 3 },
      { t: "We have a partial list, but we know it's incomplete", p: 2 },
      { t: "We have an informal sense but nothing documented", p: 1 },
      { t: "We don't really know what's in use", p: 0 },
    ]},
    { d: 0, q: "Do you have visibility into 'shadow AI' — employees using AI tools that were never formally approved?", o: [
      { t: "Yes, we actively monitor and manage this", p: 3 },
      { t: "We've identified some, but assume there's more we haven't", p: 2 },
      { t: "We suspect it's happening but haven't looked", p: 1 },
      { t: "We hadn't considered this", p: 0 },
    ]},
    { d: 1, q: "Have you classified your AI use cases by risk level (e.g., which are high-stakes vs. low-stakes)?", o: [
      { t: "Yes, we have a risk-tiering approach applied across use cases", p: 3 },
      { t: "We've done this for a few obvious cases", p: 2 },
      { t: "We understand the concept but haven't applied it", p: 1 },
      { t: "No", p: 0 },
    ]},
    { d: 1, q: "If a regulator or customer asked you to demonstrate how a specific AI system makes decisions, could you?", o: [
      { t: "Yes, for our material systems we have this documented", p: 3 },
      { t: "For some, not all", p: 2 },
      { t: "We'd struggle to pull that together", p: 1 },
      { t: "No", p: 0 },
    ]},
    { d: 2, q: "Do you know which AI-related regulations and standards actually apply to your organization?", o: [
      { t: "Yes, we've mapped our obligations", p: 3 },
      { t: "We know the big ones but aren't sure we've caught everything", p: 2 },
      { t: "We have a vague sense", p: 1 },
      { t: "No", p: 0 },
    ]},
    { d: 2, q: "Do you have contractual or customer commitments related to AI or data handling that you're actively tracking?", o: [
      { t: "Yes, tracked and managed", p: 3 },
      { t: "Some, tracked informally", p: 2 },
      { t: "Probably, but not tracked", p: 1 },
      { t: "Don't know", p: 0 },
    ]},
    { d: 3, q: "Do you have an Acceptable Use Policy that defines what employees can and can't do with AI?", o: [
      { t: "Yes, written, communicated, and enforced", p: 3 },
      { t: "We have one but it's not really enforced or current", p: 2 },
      { t: "It's in draft or informal", p: 1 },
      { t: "No", p: 0 },
    ]},
    { d: 3, q: "When a new AI use case comes up, is there a defined process to review and approve it before it goes live?", o: [
      { t: "Yes, a consistent review/approval process exists", p: 3 },
      { t: "Sometimes, depends who's involved", p: 2 },
      { t: "It's ad hoc", p: 1 },
      { t: "No, things just get adopted", p: 0 },
    ]},
    { d: 4, q: "Is there a clearly named person or group accountable for AI governance in your organization?", o: [
      { t: "Yes, with a clear mandate", p: 3 },
      { t: "Someone's loosely responsible but it's not formalized", p: 2 },
      { t: "It's split and unclear", p: 1 },
      { t: "No one owns it", p: 0 },
    ]},
    { d: 4, q: "If an AI system caused a problem tomorrow, is it clear who would respond and how?", o: [
      { t: "Yes, we have a defined path", p: 3 },
      { t: "Roughly, but it's not documented", p: 2 },
      { t: "We'd figure it out in the moment", p: 1 },
      { t: "No", p: 0 },
    ]},
    { d: 5, q: "Do you have a way to monitor AI systems on an ongoing basis, not just at launch?", o: [
      { t: "Yes, ongoing monitoring is in place", p: 3 },
      { t: "For some systems", p: 2 },
      { t: "Only informally", p: 1 },
      { t: "No", p: 0 },
    ]},
    { d: 5, q: "Be honest: is your organization looking at AI governance tools partly to feel like the problem is handled?", o: [
      { t: "No, we've done the groundwork and a tool is the logical next step", p: 3 },
      { t: "Partly — we know a tool isn't a full answer", p: 1 },
      { t: "Yes, we're hoping a tool will give us a program", p: 0 },
      { t: "Not sure", p: 1 },
    ]},
  ];

  const TIERS = {
    ready: {
      name: "Ready to Evaluate",
      message: "You've done the groundwork most organizations skip. A tool will amplify a program you already have.",
    },
    gaps: {
      name: "Foundation Gaps",
      message: "You've started, but there are gaps a tool won't close — it'll just automate around them.",
    },
    notready: {
      name: "Not Tool-Ready Yet",
      message: "Buying a tool now would mean paying to enforce governance you haven't designed yet.",
    },
  };

  const MAILTO = "mailto:jerome.jayapal@bettersecurity.ai?subject=AI%20governance%20readiness%20%E2%80%94%20let's%20talk";

  // ---------------------------------------------------------------------------
  // In-memory state
  // ---------------------------------------------------------------------------
  const state = {
    email: "",
    name: "",
    company: "",
    current: 0,                       // current question index
    answers: new Array(QUESTIONS.length).fill(null), // points per question
  };

  const $ = (id) => document.getElementById(id);

  // ---------------------------------------------------------------------------
  // Subscribe helper (shared by assessment + footer)
  // ---------------------------------------------------------------------------
  async function subscribe(email, company) {
    const resp = await fetch("/subscribe", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: email, company: company || "" }),
    });
    if (!resp.ok) throw new Error("subscribe failed: " + resp.status);
    const data = await resp.json();
    if (!data.success) throw new Error("subscribe failed");
    return data;
  }

  // Sends completed results to the serverless function, which emails the
  // visitor + Jerome and saves the lead to Attio. Fire-and-forget.
  async function submitResults(payload) {
    const resp = await fetch("/submit-results", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    if (!resp.ok) throw new Error("submit-results failed: " + resp.status);
    return resp.json();
  }

  const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

  // ---------------------------------------------------------------------------
  // Screen switching
  // ---------------------------------------------------------------------------
  function showScreen(id) {
    ["screen-email", "screen-question", "screen-results"].forEach((s) => {
      $(s).classList.toggle("is-active", s === id);
    });
  }

  // ---------------------------------------------------------------------------
  // Email capture
  // ---------------------------------------------------------------------------
  $("email-form").addEventListener("submit", function (e) {
    e.preventDefault();
    const email = $("email-input").value.trim();
    const name = $("name-input").value.trim();
    const company = $("company-input").value.trim();
    const err = $("email-error");

    if (!EMAIL_RE.test(email)) {
      err.textContent = "Please enter a valid email address.";
      $("email-input").focus();
      return;
    }
    err.textContent = "";

    state.email = email;
    state.name = name;
    state.company = company;
    state.answers = new Array(QUESTIONS.length).fill(null); // fresh start

    // Fire-and-forget: never block the assessment on the subscribe call.
    subscribe(email, company).catch(function (e2) {
      console.warn("Subscribe call failed (continuing anyway):", e2 && e2.message);
    });

    state.current = 0;
    renderQuestion();
    showScreen("screen-question");
    scrollToAssessment();
  });

  // ---------------------------------------------------------------------------
  // Questions
  // ---------------------------------------------------------------------------
  function renderQuestion() {
    const i = state.current;
    const item = QUESTIONS[i];

    $("q-count").textContent = "Question " + (i + 1) + " of " + QUESTIONS.length;
    $("q-dim").textContent = DIMENSIONS[item.d];
    $("q-text").textContent = item.q;
    $("progress-fill").style.width = ((i) / QUESTIONS.length * 100) + "%";

    // dots
    const dots = $("dots");
    dots.innerHTML = "";
    for (let k = 0; k < QUESTIONS.length; k++) {
      const dot = document.createElement("span");
      dot.className = "dot" + (k < i ? " is-done" : k === i ? " is-current" : "");
      dots.appendChild(dot);
    }

    // options
    const wrap = $("q-options");
    wrap.innerHTML = "";
    item.o.forEach(function (opt) {
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "option" + (state.answers[i] === opt.p ? " is-selected" : "");
      btn.textContent = opt.t;
      btn.addEventListener("click", function () {
        state.answers[i] = opt.p;
        advance();
      });
      wrap.appendChild(btn);
    });

    $("back-btn").hidden = i === 0;
  }

  function advance() {
    if (state.current < QUESTIONS.length - 1) {
      state.current++;
      renderQuestion();
      scrollToAssessment();
    } else {
      renderResults();
      showScreen("screen-results");
      scrollToAssessment();
    }
  }

  $("back-btn").addEventListener("click", function () {
    if (state.current > 0) {
      state.current--;
      renderQuestion();
      scrollToAssessment();
    }
  });

  function scrollToAssessment() {
    const el = $("assessment");
    if (el) el.scrollIntoView({ block: "start" });
  }

  // ---------------------------------------------------------------------------
  // Results
  // ---------------------------------------------------------------------------
  function renderResults() {
    // per-dimension subtotals (2 questions each, max 6)
    const subtotals = DIMENSIONS.map(function () { return 0; });
    QUESTIONS.forEach(function (item, idx) {
      subtotals[item.d] += state.answers[idx] || 0;
    });
    const total = subtotals.reduce(function (a, b) { return a + b; }, 0);

    // tier
    let tier;
    if (total >= 28) tier = "ready";
    else if (total >= 16) tier = "gaps";
    else tier = "notready";

    $("result-tier").textContent = TIERS[tier].name;
    $("result-score").textContent = "Score: " + total + " of 36";
    $("result-message").textContent = TIERS[tier].message;
    $("score-fill").style.width = (total / 36 * 100) + "%";

    // strongest & weakest 2 dimensions by subtotal
    const ranked = DIMENSIONS.map(function (name, idx) {
      return { name: name, score: subtotals[idx], idx: idx };
    });
    const byHigh = ranked.slice().sort(function (a, b) { return b.score - a.score || a.idx - b.idx; });

    const strong = byHigh.slice(0, 2);
    const strongIdx = strong.map(function (s) { return s.idx; });
    // Weakest 2 from the dimensions NOT already shown as strongest, so ties never
    // surface the same dimension on both sides.
    const weak = ranked
      .filter(function (r) { return strongIdx.indexOf(r.idx) === -1; })
      .sort(function (a, b) { return a.score - b.score || a.idx - b.idx; })
      .slice(0, 2);

    fillList("strong-list", strong);
    fillList("weak-list", weak);

    // Everyone who finishes gets their results emailed + saved to the CRM.
    // Fire-and-forget: never block the results screen on this call.
    submitResults({
      email: state.email,
      name: state.name,
      company: state.company,
      score: total,
      tier: TIERS[tier].name,
      tierMessage: TIERS[tier].message,
      strongest: strong.map(function (s) { return { name: s.name, score: s.score }; }),
      weakest: weak.map(function (s) { return { name: s.name, score: s.score }; }),
      dimensions: ranked.map(function (r) { return { name: r.name, score: r.score }; }),
    }).catch(function (e) {
      console.warn("submit-results failed (continuing anyway):", e && e.message);
    });

    renderResultCtas(tier);
  }

  function fillList(id, items) {
    const ul = $(id);
    ul.innerHTML = "";
    items.forEach(function (it) {
      const li = document.createElement("li");
      li.textContent = it.name + " (" + it.score + "/6)";
      ul.appendChild(li);
    });
  }

  function renderResultCtas(tier) {
    const wrap = $("result-ctas");
    wrap.innerHTML = "";

    // Everyone now auto-receives their results by email on completion, so show
    // the confirmation up front rather than behind a button.
    const note = $("confirm-note");
    note.hidden = false;
    note.textContent = "Your full results are on their way to " + state.email +
      ". I review each one personally and may follow up.";

    function scrollToTools() { document.getElementById("tools").scrollIntoView(); }

    function addLink(html, cls, href) {
      const a = document.createElement("a");
      a.className = "btn " + cls;
      a.innerHTML = html;
      a.setAttribute("href", href);
      wrap.appendChild(a);
      return a;
    }
    function addBtn(html, cls, onClick) {
      const b = document.createElement("button");
      b.type = "button";
      b.className = "btn " + cls;
      b.innerHTML = html;
      b.addEventListener("click", onClick);
      wrap.appendChild(b);
      return b;
    }

    if (tier === "ready") {
      addBtn("See the tool landscape →", "btn--primary", scrollToTools);
      addLink("Want my read on matching one to your obligations? Reach out →", "btn--ghost", MAILTO);
    } else if (tier === "gaps") {
      addLink("Want to talk through closing these? Reach out →", "btn--primary", MAILTO);
      addBtn("Curious what's out there anyway? See the tools →", "btn--ghost", scrollToTools);
    } else { // notready
      addLink("Reach out →", "btn--primary", MAILTO);
      const t = addBtn("See the tool landscape →", "btn--ghost", scrollToTools);
      t.style.opacity = "0.7"; // de-emphasized
    }
  }

  // ---------------------------------------------------------------------------
  // Tool landscape
  // ---------------------------------------------------------------------------
  let allTools = [];

  function escapeHtml(s) {
    return String(s == null ? "" : s)
      .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;").replace(/'/g, "&#39;");
  }

  function loadTools() {
    fetch("./data/tools.json")
      .then(function (r) { return r.json(); })
      .then(function (data) {
        if (data.last_reviewed) $("last-reviewed").textContent = data.last_reviewed;
        allTools = Array.isArray(data.tools) ? data.tools : [];
        buildFilters();
        renderTools();
      })
      .catch(function (e) {
        console.error("Failed to load tools.json", e);
        $("tool-grid").innerHTML = "<p>Tool data is temporarily unavailable.</p>";
      });
  }

  function uniqueSorted(arr) {
    return arr.filter(function (v, i, a) { return v && a.indexOf(v) === i; })
              .sort(function (a, b) { return a.localeCompare(b); });
  }

  function buildFilters() {
    const cats = uniqueSorted(allTools.map(function (t) { return t.category; }));
    const buyers = uniqueSorted(allTools.map(function (t) { return t.target_buyer; }));
    const catSel = $("filter-category");
    const buyerSel = $("filter-buyer");
    cats.forEach(function (c) { catSel.appendChild(opt(c)); });
    buyers.forEach(function (b) { buyerSel.appendChild(opt(b)); });
    catSel.addEventListener("change", renderTools);
    buyerSel.addEventListener("change", renderTools);
  }

  function opt(v) {
    const o = document.createElement("option");
    o.value = v; o.textContent = v;
    return o;
  }

  function renderTools() {
    const cat = $("filter-category").value;
    const buyer = $("filter-buyer").value;
    const grid = $("tool-grid");

    const filtered = allTools.filter(function (t) {
      return (!cat || t.category === cat) && (!buyer || t.target_buyer === buyer);
    });

    grid.innerHTML = "";
    filtered.forEach(function (t, i) {
      grid.appendChild(toolCard(t, i));
    });

    const n = filtered.length;
    $("results-count").textContent = n + (n === 1 ? " tool" : " tools");

    if (n === 0) {
      grid.innerHTML = "<p>No tools match those filters.</p>";
    }
  }

  function toolCard(t, i) {
    const card = document.createElement("article");
    card.className = "tool-card";

    const detailId = "tool-detail-" + i;
    const fw = t.framework_coverage
      ? '<dt>Framework coverage</dt><dd>' + escapeHtml(t.framework_coverage) + '</dd>'
      : "";

    card.innerHTML =
      '<span class="tool-card__cat">' + escapeHtml(t.category) + '</span>' +
      '<h3 class="tool-card__name">' + escapeHtml(t.name) + '</h3>' +
      '<p class="tool-card__buyer"><strong>For:</strong> ' + escapeHtml(t.target_buyer) + '</p>' +
      '<p class="tool-card__oneliner">' + escapeHtml(t.one_liner) + '</p>' +
      '<p class="tool-card__reviewed">Reviewed ' + escapeHtml(t.reviewed) + '</p>' +
      '<button type="button" class="tool-card__toggle" aria-expanded="false" aria-controls="' + detailId + '">More detail ↓</button>' +
      '<div class="tool-card__detail" id="' + detailId + '">' +
        '<p>' + escapeHtml(t.description) + '</p>' +
        '<dl>' + fw + '</dl>' +
        '<p><a href="' + escapeHtml(t.website) + '" target="_blank" rel="noopener">Visit vendor site →</a></p>' +
      '</div>';

    const toggle = card.querySelector(".tool-card__toggle");
    toggle.addEventListener("click", function () {
      const open = card.classList.toggle("is-open");
      toggle.setAttribute("aria-expanded", open ? "true" : "false");
      toggle.textContent = open ? "Less detail ↑" : "More detail ↓";
    });

    return card;
  }

  // ---------------------------------------------------------------------------
  // Footer newsletter
  // ---------------------------------------------------------------------------
  $("footer-form").addEventListener("submit", function (e) {
    e.preventDefault();
    const email = $("footer-email").value.trim();
    const msg = $("footer-msg");
    if (!EMAIL_RE.test(email)) {
      msg.style.color = "#ffb4ab";
      msg.textContent = "Please enter a valid email address.";
      return;
    }
    msg.style.color = "#cbd2de";
    msg.textContent = "Subscribing…";
    subscribe(email, "")
      .then(function () {
        msg.style.color = "#9be3a2";
        msg.textContent = "You're subscribed. Thank you.";
        $("footer-email").value = "";
      })
      .catch(function () {
        msg.style.color = "#ffb4ab";
        msg.textContent = "Something went wrong — please try again, or email me directly.";
      });
  });

  // ---------------------------------------------------------------------------
  // Init
  // ---------------------------------------------------------------------------
  $("year").textContent = new Date().getFullYear();
  loadTools();
})();
