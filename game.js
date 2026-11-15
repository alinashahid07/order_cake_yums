// ingredient data for every tab
const MENU = {
  sponge: [
    { id: "vanilla", name: "Vanilla", color: "#ffe3a3", price: 3 },
    { id: "chocolate", name: "Chocolate", color: "#8a5a44", price: 3 },
    { id: "strawberry", name: "Strawberry", color: "#ffa6c1", price: 4 },
    { id: "velvet", name: "Red Velvet", color: "#d9566a", price: 5 },
    { id: "matcha", name: "Matcha", color: "#b9d98c", price: 5 }
  ],
  frosting: [
    { id: "cream", name: "Cream", color: "#fff6e5", price: 2 },
    { id: "pink", name: "Pink Butter", color: "#ffb8d1", price: 2 },
    { id: "cocoa", name: "Cocoa", color: "#a06a52", price: 3 },
    { id: "mint", name: "Mint", color: "#a8e6cf", price: 3 },
    { id: "berry", name: "Blueberry", color: "#b9b2f0", price: 3 }
  ],
  drip: [
    { id: "caramel", name: "Caramel", color: "#e8a24a", price: 2 },
    { id: "fudge", name: "Fudge", color: "#5e3a2e", price: 2 },
    { id: "berry", name: "Berry", color: "#ff6f91", price: 2 },
    { id: "white", name: "White Choc", color: "#fff1c9", price: 3 }
  ],
  topping: [
    { id: "cherry", name: "Cherry", price: 2 },
    { id: "strawberry", name: "Strawberry", price: 3 },
    { id: "sprinkles", name: "Sprinkles", price: 1 },
    { id: "star", name: "Gold Star", price: 3 },
    { id: "candle", name: "Candle", price: 1 },
    { id: "macaron", name: "Macaron", price: 4 }
  ]
};

// limits for how big a cake can get
const MAX_LAYERS = 6;
const MAX_SPONGES = 3;
const MAX_TOPPINGS = 4;

// the cake is a list of layers from bottom to top
let currentCake = [];
let activeTab = "sponge";
let nextLayerId = 1;
let drawnIds = new Set();

// pixel art for the toppings drawn from rows of letters
const INK = "#5b3a4a";
const ART = {
  cherry: {
    pal: { k: INK, R: "#f0475f", w: "#fff", g: "#4fa35f" },
    rows: ["....ggg..", "...g.....", "...g.....", "..kkkk...", ".kRRRRk..", ".kRwRRRk.", ".kRRRRRk.", "..kRRRk..", "...kkk..."]
  },
  strawberry: {
    pal: { k: INK, R: "#ff5470", y: "#ffe08a", g: "#4fa35f" },
    rows: ["...gg.gg...", "....gggg...", ".kkkkkkkkk.", "kRRRRRRRRRk", "kRRyRRRyRRk", ".kRRRRRRRk.", ".kRRyRRyRk.", "..kRRRRRk..", "...kRRRk...", "....kkk...."]
  },
  sprinkles: {
    pal: { p: "#ff6fa5", b: "#5ab0ff", y: "#ffd34d", g: "#5fcf8f" },
    rows: ["pp...bb..yy", "..gg...pp..", "yy..bb...gg"]
  },
  star: {
    pal: { y: "#ffd34d", o: "#f2a93b" },
    rows: ["....y....", "....y....", "...yyy...", "yyyyyyyyy", ".yyyyyyy.", "..yyoyy..", ".yyy.yyy.", ".yy...yy."]
  },
  candle: {
    pal: { o: "#ff9d3c", y: "#ffe66d", k: INK, p: "#ff9fc4", w: "#fff" },
    rows: ["..o..", ".oyo.", "..o..", ".kpk.", ".kwk.", ".kpk.", ".kwk.", ".kpk."]
  },
  macaron: {
    pal: { k: INK, m: "#9ee6c4", w: "#fff6e8" },
    rows: ["..kkkkkkk..", ".kmmmmmmmk.", "kmmmmmmmmmk", ".kwwwwwwwk.", "kmmmmmmmmmk", ".kmmmmmmmk.", "..kkkkkkk.."]
  }
};

// turns a topping into an svg made of one square per pixel
function toppingArt(id, scale) {
  const art = ART[id];
  const width = Math.max.apply(null, art.rows.map(function (r) { return r.length; }));
  const height = art.rows.length;
  let squares = "";
  art.rows.forEach(function (row, y) {
    for (let x = 0; x < row.length; x++) {
      const color = art.pal[row[x]];
      if (color) {
        squares += '<rect x="' + x + '" y="' + y + '" width="1" height="1" fill="' + color + '"/>';
      }
    }
  });
  return '<svg width="' + width * scale + '" height="' + height * scale + '" viewBox="0 0 ' + width + " " + height +
    '" shape-rendering="crispEdges" xmlns="http://www.w3.org/2000/svg">' + squares + "</svg>";
}

// finds one ingredient in the menu
function findItem(kind, id) {
  return MENU[kind].find(function (item) { return item.id === id; });
}

// adds up the price of every layer on the stand
function cakeValue() {
  return currentCake.reduce(function (sum, layer) {
    return sum + findItem(layer.kind, layer.id).price;
  }, 0);
}

// small message at the top of the stage
let toastTimer = null;
function showToast(text) {
  const toast = document.getElementById("toast");
  toast.textContent = text;
  toast.classList.add("show");
  clearTimeout(toastTimer);
  toastTimer = setTimeout(function () { toast.classList.remove("show"); }, 1400);
}

// shakes the stack when a click is refused
function shakeStack() {
  const stack = document.getElementById("stack");
  stack.classList.remove("shake");
  void stack.offsetWidth;
  stack.classList.add("shake");
}

// builds the ingredient buttons for the active tab
function renderGrid() {
  const grid = document.getElementById("grid");
  grid.innerHTML = MENU[activeTab].map(function (item) {
    const look = activeTab === "topping"
      ? '<span class="item-art">' + toppingArt(item.id, 3) + "</span>"
      : '<span class="swatch" style="--c:' + item.color + '"></span>';
    return '<button class="item" data-id="' + item.id + '">' + look +
      "<span>" + item.name + "</span><small>$" + item.price + "</small></button>";
  }).join("");
}

// highlights the active tab and refreshes the grid
function setTab(name) {
  activeTab = name;
  document.querySelectorAll(".tab").forEach(function (tab) {
    tab.classList.toggle("on", tab.dataset.tab === name);
  });
  renderGrid();
}

// returns a reason when the click is not allowed or an empty string when it is
function refusalReason(kind, id) {
  const flat = currentCake.filter(function (l) { return l.kind !== "topping"; });
  const sponges = currentCake.filter(function (l) { return l.kind === "sponge"; });
  const toppings = currentCake.filter(function (l) { return l.kind === "topping"; });
  if (kind === "topping") {
    if (toppings.some(function (l) { return l.id === id; })) return "ALREADY ON TOP";
    if (toppings.length >= MAX_TOPPINGS) return "TOP IS FULL";
    return "";
  }
  if (flat.length >= MAX_LAYERS) return "STACK IS FULL";
  if (kind === "sponge" && sponges.length >= MAX_SPONGES) return "MAX 3 SPONGES";
  return "";
}

// pushes one ingredient onto the cake
function addIngredient(id) {
  if (busy) return;
  const reason = refusalReason(activeTab, id);
  if (reason) {
    showToast(reason);
    shakeStack();
    return;
  }
  if (!shiftRunning) {
    shiftRunning = true;
    setBubble("One cake please! Check the ticket.");
  }
  currentCake.push({ uid: nextLayerId++, kind: activeTab, id: id });
  renderCake();
}

// clears the stand
function resetCake() {
  if (busy || currentCake.length === 0) return;
  currentCake = [];
  drawnIds.clear();
  renderCake();
}
// draws the whole stack and only animates layers that are new
function renderCake() {
  const stack = document.getElementById("stack");
  stack.innerHTML = "";
  const layers = currentCake.filter(function (l) { return l.kind !== "topping"; });
  const toppings = currentCake.filter(function (l) { return l.kind === "topping"; });

  layers.forEach(function (layer) {
    const item = findItem(layer.kind, layer.id);
    const div = document.createElement("div");
    div.className = "layer " + layer.kind + (drawnIds.has(layer.uid) ? "" : " drop");
    div.style.setProperty("--c", item.color);
    stack.appendChild(div);
  });

  if (toppings.length > 0) {
    const row = document.createElement("div");
    row.className = "toppings";
    toppings.forEach(function (t) {
      const cell = document.createElement("div");
      cell.className = drawnIds.has(t.uid) ? "" : "drop";
      cell.innerHTML = toppingArt(t.id, 4);
      row.appendChild(cell);
    });
    stack.appendChild(row);
  }

  currentCake.forEach(function (l) { drawnIds.add(l.uid); });
  document.getElementById("hint").style.display = currentCake.length ? "none" : "block";
  document.getElementById("value").textContent = "$" + cakeValue();
}

// wires up the clicks
document.getElementById("tabs").addEventListener("click", function (e) {
  const tab = e.target.closest(".tab");
  if (tab) setTab(tab.dataset.tab);
});
document.getElementById("grid").addEventListener("click", function (e) {
  const item = e.target.closest(".item");
  if (item) addIngredient(item.dataset.id);
});
document.getElementById("trashBtn").addEventListener("click", resetCake);

// first draw
// shift state for orders and scoring
let coins = 0;
let combo = 0;
let served = 0;
let currentOrder = null;
let orderNumber = 0;
let patience = 1;
let shiftRunning = false;
let busy = false;
const PATIENCE_SECONDS = 40;

// small helpers
function pick(list) {
  return list[Math.floor(Math.random() * list.length)];
}

function nameOf(kind, id) {
  return findItem(kind, id).name;
}

function sameList(a, b) {
  return a.length === b.length && a.every(function (x, i) { return x === b[i]; });
}

function sameSet(a, b) {
  return a.length === b.length && a.every(function (x) { return b.includes(x); });
}

function setBubble(text) {
  document.getElementById("bubble").textContent = text;
}

// builds a random order with one or two sponges and a frosting and maybe a drip and one or two toppings
function makeOrder() {
  const order = {
    sponges: [pick(MENU.sponge).id],
    frosting: pick(MENU.frosting).id,
    drip: null,
    toppings: []
  };
  if (Math.random() < 0.3) order.sponges.push(pick(MENU.sponge).id);
  if (Math.random() < 0.6) order.drip = pick(MENU.drip).id;
  const shuffled = MENU.topping.slice().sort(function () { return Math.random() - 0.5; });
  const count = 1 + Math.floor(Math.random() * 2);
  order.toppings = shuffled.slice(0, count).map(function (t) { return t.id; });
  return order;
}

// base pay for an order is double the ingredient prices plus a flat bonus
function orderValue(order) {
  let sum = 0;
  order.sponges.forEach(function (id) { sum += findItem("sponge", id).price; });
  sum += findItem("frosting", order.frosting).price;
  if (order.drip) sum += findItem("drip", order.drip).price;
  order.toppings.forEach(function (id) { sum += findItem("topping", id).price; });
  return sum * 2 + 4;
}

// draws the ticket for the current order
function renderTicket() {
  const o = currentOrder;
  const sponges = o.sponges.map(function (id) { return nameOf("sponge", id); }).join(" + ");
  const drip = o.drip ? nameOf("drip", o.drip) : "none";
  const toppings = o.toppings.map(function (id) { return nameOf("topping", id); }).join(", ");
  document.getElementById("ticket").innerHTML =
    '<h3 class="ticket-title">ORDER #' + String(orderNumber).padStart(3, "0") + "</h3>" +
    '<div class="ticket-sub">Pays $' + orderValue(o) + " plus tip</div>" +
    '<div class="ticket-row"><span class="lbl">SPONGE</span><span class="val">' + sponges + "</span></div>" +
    '<div class="ticket-row"><span class="lbl">FROSTING</span><span class="val">' + nameOf("frosting", o.frosting) + "</span></div>" +
    '<div class="ticket-row"><span class="lbl">DRIP</span><span class="val">' + drip + "</span></div>" +
    '<div class="ticket-row"><span class="lbl">TOPPING</span><span class="val">' + toppings + "</span></div>" +
    '<div class="patience"><span class="lbl">PATIENCE</span><div class="bar"><div class="bar-fill" id="patienceFill"></div></div></div>';
}

// the combo multiplier grows by a quarter per streak and stops at six
function comboMultiplier() {
  return 1 + Math.min(combo, 6) * 0.25;
}

function updateStats() {
  document.getElementById("coins").textContent = coins;
  document.getElementById("combo").textContent = "x" + comboMultiplier().toFixed(2);
  document.getElementById("served").textContent = served;
}

// checks the cake against the order kind by kind
function cakeMatchesOrder() {
  function idsOf(kind) {
    return currentCake.filter(function (l) { return l.kind === kind; }).map(function (l) { return l.id; });
  }
  const drips = idsOf("drip");
  const dripOk = currentOrder.drip ? sameList(drips, [currentOrder.drip]) : drips.length === 0;
  return sameList(idsOf("sponge"), currentOrder.sponges) &&
    sameList(idsOf("frosting"), [currentOrder.frosting]) &&
    dripOk &&
    sameSet(idsOf("topping"), currentOrder.toppings);
}

// brings in the next customer with a fresh order and an empty stand
function nextCustomer() {
  currentCake = [];
  drawnIds.clear();
  currentOrder = makeOrder();
  orderNumber++;
  patience = 1;
  busy = false;
  setBubble("One cake please!");
  renderCake();
  renderTicket();
}

// pack and serve button
function serveCake() {
  if (busy) return;
  if (currentCake.length === 0) {
    showToast("STACK A CAKE FIRST");
    return;
  }
  if (cakeMatchesOrder()) {
    busy = true;
    const base = Math.round(orderValue(currentOrder) * comboMultiplier());
    const tip = Math.round(base * 0.5 * Math.max(0, patience));
    coins += base + tip;
    combo++;
    served++;
    updateStats();
    setBubble("Yum! Thank you!");
    showToast("+" + (base + tip) + " COINS (TIP " + tip + ")");
    setTimeout(nextCustomer, 1300);
  } else {
    combo = 0;
    updateStats();
    shakeStack();
    setBubble("Hmm that is not what I ordered");
    showToast("NOT THE ORDER");
  }
}

// the customer gives up and leaves
function customerLeaves() {
  busy = true;
  combo = 0;
  updateStats();
  setBubble("Too slow! Bye!");
  showToast("CUSTOMER LEFT");
  setTimeout(nextCustomer, 1300);
}

// drains patience using real time passed and colors the bar
let lastTick = performance.now();
setInterval(function () {
  const now = performance.now();
  const seconds = (now - lastTick) / 1000;
  lastTick = now;
  if (!shiftRunning || busy) return;
  patience -= seconds / PATIENCE_SECONDS;
  const fill = document.getElementById("patienceFill");
  if (fill) {
    fill.style.width = Math.max(0, patience) * 100 + "%";
    fill.className = "bar-fill" + (patience < 0.3 ? " low" : patience < 0.6 ? " mid" : "");
  }
  if (patience <= 0) customerLeaves();
}, 100);

document.getElementById("serveBtn").addEventListener("click", serveCake);

// first draw
setTab("sponge");
nextCustomer();
updateStats();