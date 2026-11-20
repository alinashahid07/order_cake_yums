const $ = id => document.getElementById(id);

const MENU = {
  sponge: [
    {id: "vanilla", name: "Vanilla", color: "#ffe3a3", price: 3},
    {id: "chocolate", name: "Chocolate", color: "#8a5a44", price: 3},
    {id: "strawberry", name: "Strawberry", color: "#ffa6c1", price: 4},
    {id: "velvet", name: "Red Velvet", color: "#d9566a", price: 5},
    {id: "matcha", name: "Matcha", color: "#b9d98c", price: 5}
  ],
  frosting: [
    {id: "cream", name: "Cream", color: "#fff6e5", price: 2},
    {id: "pink", name: "Pink Butter", color: "#ffb8d1", price: 2},
    {id: "cocoa", name: "Cocoa", color: "#a06a52", price: 3},
    {id: "mint", name: "Mint", color: "#a8e6cf", price: 3},
    {id: "berry", name: "Blueberry", color: "#b9b2f0", price: 3}
  ],
  drip: [
    {id: "caramel", name: "Caramel", color: "#e8a24a", price: 2},
    {id: "fudge", name: "Fudge", color: "#5e3a2e", price: 2},
    {id: "berry", name: "Berry", color: "#ff6f91", price: 2},
    {id: "white", name: "White Choc", color: "#fff1c9", price: 3}
  ],
  topping: [
    {id: "cherry", name: "Cherry", price: 2},
    {id: "strawberry", name: "Strawberry", price: 3},
    {id: "sprinkles", name: "Sprinkles", price: 1},
    {id: "star", name: "Gold Star", price: 3},
    {id: "candle", name: "Candle", price: 1},
    {id: "macaron", name: "Macaron", price: 4}
  ]
};

const MAX_LAYERS = 6, MAX_SPONGES = 3, MAX_TOPPINGS = 4;
const PATIENCE_SECONDS = 40;

let currentCake = [];
let activeTab = "sponge";
let nextLayerId = 1;
const drawnIds = new Set();

let mode = "shift";
let coins = 0, combo = 0, served = 0, missed = 0, tips = 0, bestCombo = 0;
let beatRecord = false;
let currentOrder, orderNumber = 0;
let patience = 1;
let shiftRunning = false, busy = false;
let nextTimer, toastTimer;

// sprites, each letter is a color from the palette next to it
const INK = "#5b3a4a";
const ART = {
  cherry: {
    pal: {k: INK, R: "#f0475f", w: "#fff", g: "#4fa35f"},
    rows: ["....ggg..", "...g.....", "...g.....", "..kkkk...", ".kRRRRk..", ".kRwRRRk.", ".kRRRRRk.", "..kRRRk..", "...kkk..."]
  },
  strawberry: {
    pal: {k: INK, R: "#ff5470", y: "#ffe08a", g: "#4fa35f"},
    rows: ["...gg.gg...", "....gggg...", ".kkkkkkkkk.", "kRRRRRRRRRk", "kRRyRRRyRRk", ".kRRRRRRRk.", ".kRRyRRyRk.", "..kRRRRRk..", "...kRRRk...", "....kkk...."]
  },
  sprinkles: {
    pal: {p: "#ff6fa5", b: "#5ab0ff", y: "#ffd34d", g: "#5fcf8f"},
    rows: ["pp...bb..yy", "..gg...pp..", "yy..bb...gg"]
  },
  star: {
    pal: {y: "#ffd34d", o: "#f2a93b"},
    rows: ["....y....", "....y....", "...yyy...", "yyyyyyyyy", ".yyyyyyy.", "..yyoyy..", ".yyy.yyy.", ".yy...yy."]
  },
  candle: {
    pal: {o: "#ff9d3c", y: "#ffe66d", k: INK, p: "#ff9fc4", w: "#fff"},
    rows: ["..o..", ".oyo.", "..o..", ".kpk.", ".kwk.", ".kpk.", ".kwk.", ".kpk."]
  },
  macaron: {
    pal: {k: INK, m: "#9ee6c4", w: "#fff6e8"},
    rows: ["..kkkkkkk..", ".kmmmmmmmk.", "kmmmmmmmmmk", ".kwwwwwwwk.", "kmmmmmmmmmk", ".kmmmmmmmk.", "..kkkkkkk.."]
  }
};

const CUSTOMER_ROWS = [
  "....kkkkkk....",
  "...khhhhhhk...",
  "..khhhhhhhhk..",
  "..khhsssssdhk.",
  "..kssksskssk..",
  "..ksrssssrsk..",
  "...kssmmssk...",
  "....kksssk....",
  "..kkttttttkk..",
  ".kttttttttttk.",
  ".ksttttttttsk.",
  "..kttttttttk..",
  "..kttttttttk.."
];
const LOOKS = [
  {hair: "#7a4b3a", shirt: "#7ec8e3"},
  {hair: "#2f2a3a", shirt: "#ffb347"},
  {hair: "#f0b95a", shirt: "#c8a2f0"},
  {hair: "#d95b6a", shirt: "#8fe0b0"}
];

function pixelSvg(rows, pal, scale) {
  const w = Math.max(...rows.map(r => r.length));
  let rects = "";
  rows.forEach((row, y) => {
    [...row].forEach((ch, x) => {
      if (pal[ch]) rects += `<rect x="${x}" y="${y}" width="1" height="1" fill="${pal[ch]}"/>`;
    });
  });
  return `<svg width="${w * scale}" height="${rows.length * scale}" viewBox="0 0 ${w} ${rows.length}" shape-rendering="crispEdges">${rects}</svg>`;
}

const toppingArt = (id, scale) => pixelSvg(ART[id].rows, ART[id].pal, scale);

function drawCustomer() {
  const look = pick(LOOKS);
  const pal = {k: INK, s: "#ffd9bd", r: "#ff9fa8", m: "#c4566b", h: look.hair, d: look.hair, t: look.shirt};
  $("customer").innerHTML = pixelSvg(CUSTOMER_ROWS, pal, 8);
}

const pick = list => list[Math.floor(Math.random() * list.length)];
const findItem = (kind, id) => MENU[kind].find(i => i.id === id);
const nameOf = (kind, id) => findItem(kind, id).name;
const sameList = (a, b) => a.length === b.length && a.every((x, i) => x === b[i]);
const sameSet = (a, b) => a.length === b.length && a.every(x => b.includes(x));
const setBubble = text => $("bubble").textContent = text;

const cakeValue = () => currentCake.reduce((sum, l) => sum + findItem(l.kind, l.id).price, 0);

function toast(text) {
  const el = $("toast");
  el.textContent = text;
  el.classList.add("show");
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => el.classList.remove("show"), 1400);
}

function shakeStack() {
  const s = $("stack");
  s.classList.remove("shake");
  void s.offsetWidth;
  s.classList.add("shake");
}

// ingredient buttons and tabs
function renderGrid() {
  $("grid").innerHTML = MENU[activeTab].map(item => {
    const look = activeTab === "topping"
      ? `<span class="item-art">${toppingArt(item.id, 3)}</span>`
      : `<span class="swatch" style="--c:${item.color}"></span>`;
    return `<button class="item" data-id="${item.id}">${look}<span>${item.name}</span><small>$${item.price}</small></button>`;
  }).join("");
}

function setTab(name) {
  activeTab = name;
  document.querySelectorAll(".tab").forEach(t => t.classList.toggle("on", t.dataset.tab === name));
  renderGrid();
}

// empty string means the click is fine
function refusal(kind, id) {
  const count = k => currentCake.filter(l => l.kind === k).length;
  if (kind === "topping") {
    if (currentCake.some(l => l.kind === "topping" && l.id === id)) return "ALREADY ON TOP";
    if (count("topping") >= MAX_TOPPINGS) return "TOP IS FULL";
    return "";
  }
  if (currentCake.length - count("topping") >= MAX_LAYERS) return "STACK IS FULL";
  if (kind === "sponge" && count("sponge") >= MAX_SPONGES) return "MAX 3 SPONGES";
  return "";
}

function addIngredient(id) {
  if (busy) return;
  const why = refusal(activeTab, id);
  if (why) {
    toast(why);
    shakeStack();
    sfx.buzz();
    return;
  }
  if (mode === "shift" && !shiftRunning) {
    shiftRunning = true;
    setBubble("One cake please! Check the ticket.");
  }
  currentCake.push({uid: nextLayerId++, kind: activeTab, id});
  sfx.plop();
  renderCake();
}

function resetCake() {
  if (busy || !currentCake.length) return;
  currentCake = [];
  drawnIds.clear();
  sfx.trash();
  renderCake();
}

// redraws everything but only new layers get the drop animation
function renderCake() {
  const stack = $("stack");
  stack.innerHTML = "";
  const tops = currentCake.filter(l => l.kind === "topping");

  currentCake.filter(l => l.kind !== "topping").forEach(l => {
    const div = document.createElement("div");
    div.className = `layer ${l.kind}` + (drawnIds.has(l.uid) ? "" : " drop");
    div.style.setProperty("--c", findItem(l.kind, l.id).color);
    stack.appendChild(div);
  });

  if (tops.length) {
    const row = document.createElement("div");
    row.className = "toppings";
    tops.forEach(t => {
      const cell = document.createElement("div");
      if (!drawnIds.has(t.uid)) cell.className = "drop";
      cell.innerHTML = toppingArt(t.id, 4);
      row.appendChild(cell);
    });
    stack.appendChild(row);
  }

  currentCake.forEach(l => drawnIds.add(l.uid));
  $("hint").style.display = currentCake.length ? "none" : "block";
  $("value").textContent = "$" + cakeValue();
}

// orders get harder the more you serve
function makeOrder() {
  const level = Math.min(served, 10) / 10;
  const o = {sponges: [pick(MENU.sponge).id], frosting: pick(MENU.frosting).id, drip: null, toppings: []};
  if (served >= 2 && Math.random() < 0.1 + 0.4 * level) o.sponges.push(pick(MENU.sponge).id);
  if (Math.random() < 0.4 + 0.4 * level) o.drip = pick(MENU.drip).id;
  const shuffled = [...MENU.topping].sort(() => Math.random() - 0.5);
  const howMany = served >= 3 && Math.random() < 0.3 + 0.5 * level ? 2 : 1;
  o.toppings = shuffled.slice(0, howMany).map(t => t.id);
  return o;
}

function orderValue(o) {
  let sum = 0;
  o.sponges.forEach(id => sum += findItem("sponge", id).price);
  sum += findItem("frosting", o.frosting).price;
  if (o.drip) sum += findItem("drip", o.drip).price;
  o.toppings.forEach(id => sum += findItem("topping", id).price);
  return sum * 2 + 4;
}

function renderTicket() {
  if (mode === "sandbox") {
    $("ticket").innerHTML = `<h3 class="ticket-title">FREE PLAY</h3>
      <div class="ticket-sub">No timer and no orders. Stack any dream cake you like then show it off.</div>`;
    return;
  }
  const o = currentOrder;
  const row = (label, val) => `<div class="ticket-row"><span class="lbl">${label}</span><span class="val">${val}</span></div>`;
  $("ticket").innerHTML = `
    <h3 class="ticket-title">ORDER #${String(orderNumber).padStart(3, "0")}</h3>
    <div class="ticket-sub">Pays $${orderValue(o)} plus tip</div>
    ${row("SPONGE", o.sponges.map(id => nameOf("sponge", id)).join(" + "))}
    ${row("FROSTING", nameOf("frosting", o.frosting))}
    ${row("DRIP", o.drip ? nameOf("drip", o.drip) : "none")}
    ${row("TOPPING", o.toppings.map(id => nameOf("topping", id)).join(", "))}
    <div class="patience"><span class="lbl">PATIENCE</span><div class="bar"><div class="bar-fill" id="patienceFill"></div></div></div>`;
}

const comboMult = () => 1 + Math.min(combo, 6) * 0.25;

function updateStats() {
  $("coins").textContent = coins;
  $("combo").textContent = "x" + comboMult().toFixed(2);
  $("served").textContent = served;
  $("highScore").textContent = highScore;
}

function cakeMatchesOrder() {
  const ids = kind => currentCake.filter(l => l.kind === kind).map(l => l.id);
  const drips = ids("drip");
  const dripOk = currentOrder.drip ? sameList(drips, [currentOrder.drip]) : drips.length === 0;
  return sameList(ids("sponge"), currentOrder.sponges)
    && sameList(ids("frosting"), [currentOrder.frosting])
    && dripOk
    && sameSet(ids("topping"), currentOrder.toppings);
}

function nextCustomer() {
  if (mode !== "shift" || $("modal").classList.contains("show")) return;
  currentCake = [];
  drawnIds.clear();
  currentOrder = makeOrder();
  orderNumber++;
  patience = 1;
  busy = false;
  setBubble("One cake please!");
  drawCustomer();
  renderCake();
  renderTicket();
}

function scheduleNext() {
  clearTimeout(nextTimer);
  nextTimer = setTimeout(nextCustomer, 1300);
}

function serveCake() {
  if (busy) return;
  if (!currentCake.length) {
    toast("STACK A CAKE FIRST");
    sfx.buzz();
    return;
  }
  if (mode === "sandbox") {
    sfx.ding();
    setBubble("Wow that looks delicious!");
    toast("LOOKS DELICIOUS");
    return;
  }

  if (!cakeMatchesOrder()) {
    combo = 0;
    updateStats();
    shakeStack();
    sfx.buzz();
    setBubble("Hmm that is not what I ordered");
    toast("NOT THE ORDER");
    return;
  }

  busy = true;
  const base = Math.round(orderValue(currentOrder) * comboMult());
  const tip = Math.round(base * 0.5 * Math.max(0, patience));
  coins += base + tip;
  tips += tip;
  combo++;
  served++;
  bestCombo = Math.max(bestCombo, combo);
  if (coins > highScore) {
    highScore = coins;
    saveHighScore(highScore);
    if (highScore > shiftStartHigh) beatRecord = true;
  }
  updateStats();
  sfx.ding();
  setBubble("Yum! Thank you!");
  toast(`+${base + tip} COINS (TIP ${tip})`);
  scheduleNext();
}

function customerLeaves() {
  busy = true;
  missed++;
  combo = 0;
  updateStats();
  sfx.buzz();
  setBubble("Too slow! Bye!");
  toast("CUSTOMER LEFT");
  scheduleNext();
}

// faster customers the more you serve but never under 18 seconds
const patienceSeconds = () => Math.max(18, PATIENCE_SECONDS - served * 1.5);

// the cap on seconds stops a hidden tab from draining the bar
let lastTick = performance.now();
setInterval(() => {
  const now = performance.now();
  const secs = Math.min((now - lastTick) / 1000, 0.5);
  lastTick = now;
  if (mode !== "shift" || !shiftRunning || busy) return;

  patience -= secs / patienceSeconds();
  const fill = $("patienceFill");
  if (fill) {
    fill.style.width = Math.max(0, patience) * 100 + "%";
    fill.className = "bar-fill" + (patience < 0.3 ? " low" : patience < 0.6 ? " mid" : "");
  }
  if (patience <= 0) customerLeaves();
}, 100);

function setMode(newMode) {
  clearTimeout(nextTimer);
  mode = newMode;
  document.querySelectorAll(".seg-btn").forEach(b => b.classList.toggle("on", b.dataset.mode === newMode));
  currentCake = [];
  drawnIds.clear();
  busy = false;
  shiftRunning = false;

  if (mode === "sandbox") {
    $("serveBtn").textContent = "SHOW OFF";
    setBubble("Sandbox is open! Make any dream cake");
    renderCake();
    renderTicket();
  } else {
    $("serveBtn").textContent = "PACK AND SERVE";
    nextCustomer();
  }
}

// receipt stuff
function zigzag() {
  const teeth = 18;
  const pts = ["0 0", "100% 0"];
  for (let i = teeth; i >= 0; i--) {
    pts.push(`${(i / teeth * 100).toFixed(2)}% ${i % 2 ? "calc(100% - 10px)" : "100%"}`);
  }
  return `polygon(${pts.join(",")})`;
}

function endShift() {
  if (mode !== "shift") {
    toast("NO SHIFT IN SANDBOX");
    return;
  }
  clearTimeout(nextTimer);
  busy = true;
  shiftRunning = false;

  const line = (label, val) => `<div class="r-line"><span>${label}</span><span>${val}</span></div>`;
  const r = $("receipt");
  r.innerHTML = `
    <h2>PIXL CAFE</h2>
    <div class="r-center">Patisserie counter</div>
    <div class="r-center">${new Date().toLocaleString()}</div><hr>
    ${line("Cakes served", served)}
    ${line("Customers lost", missed)}
    ${line("Best combo", "x" + bestCombo)}
    ${line("Tips earned", tips)}
    <hr>
    <div class="r-line r-total"><span>TOTAL</span><span>${coins}</span></div>
    <div class="r-center">High score ${highScore}</div>
    ${beatRecord ? '<div class="r-center r-new">NEW HIGH SCORE!</div>' : ""}
    <hr><div class="r-center">Thank you! Come again!</div><div class="barcode"></div>`;
  r.style.setProperty("--zig", zigzag());
  r.style.animation = "none";
  void r.offsetWidth;
  r.style.animation = "";
  $("modal").classList.add("show");
  sfx.print();
}

function newShift() {
  clearTimeout(nextTimer);
  coins = combo = served = missed = tips = bestCombo = 0;
  beatRecord = false;
  shiftStartHigh = highScore;
  $("modal").classList.remove("show");
  nextCustomer();
  updateStats();
}

// high score lives in localStorage
function saveHighScore(n) {
  try { localStorage.setItem("pixlPatisserieHigh", String(n)); } catch (e) {}
}

let highScore = 0;
try { highScore = Number(localStorage.getItem("pixlPatisserieHigh")) || 0; } catch (e) {}
let shiftStartHigh = highScore;

// sounds, all made from oscillators so no audio files
let soundOn = true;
let audioCtx;

function tone(freq, len, wave, vol, endFreq, delay) {
  if (!soundOn) return;
  try {
    audioCtx = audioCtx || new (window.AudioContext || window.webkitAudioContext)();
    const t = audioCtx.currentTime + (delay || 0);
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    osc.type = wave;
    osc.frequency.setValueAtTime(freq, t);
    if (endFreq) osc.frequency.exponentialRampToValueAtTime(endFreq, t + len);
    gain.gain.setValueAtTime(vol, t);
    gain.gain.exponentialRampToValueAtTime(0.0001, t + len);
    osc.connect(gain);
    gain.connect(audioCtx.destination);
    osc.start(t);
    osc.stop(t + len);
  } catch (e) {}
}

const sfx = {
  plop() { tone(420, 0.12, "square", 0.05, 160); tone(220, 0.08, "triangle", 0.05, 120, 0.04); },
  ding() { tone(988, 0.12, "square", 0.05); tone(1319, 0.28, "square", 0.05, null, 0.1); },
  buzz() { tone(160, 0.25, "sawtooth", 0.05, 90); },
  trash() { tone(300, 0.2, "square", 0.04, 70); },
  print() { for (let i = 0; i < 8; i++) tone(900 + (i % 2) * 200, 0.04, "square", 0.03, null, i * 0.08); }
};

// clicks
$("tabs").addEventListener("click", e => {
  const tab = e.target.closest(".tab");
  if (tab) setTab(tab.dataset.tab);
});
$("grid").addEventListener("click", e => {
  const item = e.target.closest(".item");
  if (item) addIngredient(item.dataset.id);
});
$("trashBtn").addEventListener("click", resetCake);
$("serveBtn").addEventListener("click", serveCake);
$("endShiftBtn").addEventListener("click", endShift);
$("newShiftBtn").addEventListener("click", newShift);
document.querySelectorAll(".seg-btn").forEach(b => b.addEventListener("click", () => setMode(b.dataset.mode)));
$("soundBtn").addEventListener("click", () => {
  soundOn = !soundOn;
  $("soundBtn").textContent = soundOn ? "SOUND ON" : "SOUND OFF";
  if (soundOn) sfx.plop();
});

setTab("sponge");
nextCustomer();
updateStats();