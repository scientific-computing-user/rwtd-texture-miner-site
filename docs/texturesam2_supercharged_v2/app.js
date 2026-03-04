const state = {
  data: null,
  selectedImageId: null,
  selectedMethod: null,
  selectedMetric: "iou",
  sortMode: "metric_desc",
  search: "",
  alpha: 0.56,
  thumbCount: 96,
};

const methodColors = {
  strict_ptd_v9_v7_v8_gate: "#0b7a4f",
};

const el = {
  topSummary: document.getElementById("top-summary"),
  methodSelect: document.getElementById("method-select"),
  sortSelect: document.getElementById("sort-select"),
  metricSelect: document.getElementById("metric-select"),
  searchInput: document.getElementById("search-input"),
  alphaInput: document.getElementById("alpha-input"),
  thumbCount: document.getElementById("thumb-count"),
  scoreGrid: document.getElementById("score-grid"),
  focus: document.getElementById("focus"),
  thumbGrid: document.getElementById("thumb-grid"),
  thumbMeta: document.getElementById("thumb-meta"),
};

const imageCache = new Map();
const tintedMaskCache = new Map();

function qMethod(id) {
  return state.data.methods.find((m) => m.id === id);
}

function fmt(x, d = 4) {
  return Number(x).toFixed(d);
}

function esc(s) {
  return String(s ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

function hexToRgb(hex) {
  const h = hex.replace("#", "");
  const full = h.length === 3 ? h.split("").map((c) => c + c).join("") : h;
  return {
    r: parseInt(full.slice(0, 2), 16),
    g: parseInt(full.slice(2, 4), 16),
    b: parseInt(full.slice(4, 6), 16),
  };
}

function loadImage(src) {
  if (imageCache.has(src)) return imageCache.get(src);
  const p = new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error(`Failed to load image: ${src}`));
    img.src = src;
  });
  imageCache.set(src, p);
  return p;
}

async function getTintedMask(maskSrc, colorHex) {
  const key = `${maskSrc}|${colorHex}`;
  if (tintedMaskCache.has(key)) return tintedMaskCache.get(key);

  const maskImg = await loadImage(maskSrc);
  const canvas = document.createElement("canvas");
  canvas.width = maskImg.naturalWidth;
  canvas.height = maskImg.naturalHeight;
  const ctx = canvas.getContext("2d", { willReadFrequently: true });
  ctx.drawImage(maskImg, 0, 0);

  const { r, g, b } = hexToRgb(colorHex);
  const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height);
  const d = imgData.data;

  for (let i = 0; i < d.length; i += 4) {
    const v = d[i];
    if (v > 0) {
      d[i] = r;
      d[i + 1] = g;
      d[i + 2] = b;
      d[i + 3] = Math.min(235, v + 20);
    } else {
      d[i + 3] = 0;
    }
  }

  ctx.putImageData(imgData, 0, 0);
  tintedMaskCache.set(key, canvas);
  return canvas;
}

async function drawMethodCanvas(canvas, originalSrc, maskSrc, colorHex, alpha) {
  const [orig, tinted] = await Promise.all([
    loadImage(originalSrc),
    getTintedMask(maskSrc, colorHex),
  ]);

  const ctx = canvas.getContext("2d");
  const w = canvas.width;
  const h = canvas.height;

  ctx.clearRect(0, 0, w, h);
  ctx.fillStyle = "#ebf3fb";
  ctx.fillRect(0, 0, w, h);
  drawImageContain(ctx, orig, w, h);
  ctx.globalAlpha = alpha;
  drawImageContain(ctx, tinted, w, h);
  ctx.globalAlpha = 1.0;

  ctx.strokeStyle = "rgba(255,255,255,0.45)";
  ctx.lineWidth = 1;
  ctx.strokeRect(0.5, 0.5, w - 1, h - 1);
}

function drawImageContain(ctx, img, boxW, boxH) {
  const iw = img.naturalWidth || img.width;
  const ih = img.naturalHeight || img.height;
  if (!iw || !ih) return;

  const scale = Math.min(boxW / iw, boxH / ih);
  const dw = iw * scale;
  const dh = ih * scale;
  const dx = (boxW - dw) / 2;
  const dy = (boxH - dh) / 2;
  ctx.drawImage(img, dx, dy, dw, dh);
}

function setupControls() {
  el.methodSelect.innerHTML = state.data.methods
    .map((m) => `<option value="${m.id}">${esc(m.name)}</option>`)
    .join("");

  el.methodSelect.value = state.selectedMethod;
  el.metricSelect.value = state.selectedMetric;
  el.sortSelect.value = state.sortMode;
  el.alphaInput.value = String(Math.round(state.alpha * 100));
  el.thumbCount.value = String(state.thumbCount);

  el.methodSelect.addEventListener("change", () => {
    state.selectedMethod = el.methodSelect.value;
    renderAll();
  });

  el.metricSelect.addEventListener("change", () => {
    state.selectedMetric = el.metricSelect.value;
    renderAll();
  });

  el.sortSelect.addEventListener("change", () => {
    state.sortMode = el.sortSelect.value;
    renderAll();
  });

  el.searchInput.addEventListener("input", () => {
    state.search = el.searchInput.value.trim().toLowerCase();
    renderAll();
  });

  el.alphaInput.addEventListener("input", () => {
    state.alpha = Number(el.alphaInput.value) / 100;
    renderFocus();
  });

  el.thumbCount.addEventListener("input", () => {
    const v = Number(el.thumbCount.value);
    if (!Number.isFinite(v)) return;
    state.thumbCount = Math.max(24, Math.min(256, v));
    renderThumbs();
  });
}

function renderTopSummary() {
  const methods = state.data.methods;
  const best = [...methods].sort((a, b) => {
    if (b.miou !== a.miou) return b.miou - a.miou;
    if (b.ari !== a.ari) return b.ari - a.ari;
    return a.name.localeCompare(b.name);
  })[0];

  if (!best) {
    el.topSummary.innerHTML = `<div class="top-pill"><span>Images</span><b>${state.data.num_images}</b></div>`;
    return;
  }

  el.topSummary.innerHTML = `
    <div class="top-pill"><span>Images</span><b>${state.data.num_images}</b></div>
    <div class="top-pill"><span>Our Kept Model</span><b>${esc(best.name)}: ${fmt(best.miou, 4)} / ${fmt(best.ari, 4)}</b></div>
    <div class="top-pill"><span>Protocol</span><b>No RWTD-label training/tuning</b></div>
  `;
}

function renderScoreboard() {
  const methods = state.data.methods;
  if (!methods.length) {
    el.scoreGrid.innerHTML = "";
    return;
  }

  const winner = [...methods].sort((a, b) => {
    if (b.miou !== a.miou) return b.miou - a.miou;
    if (b.ari !== a.ari) return b.ari - a.ari;
    return a.name.localeCompare(b.name);
  })[0];

  const bestMiou = Math.max(...methods.map((m) => m.miou));
  const bestAri = Math.max(...methods.map((m) => m.ari));

  const cards = methods.map((m) => {
    const bestIClass = m.miou >= bestMiou - 1e-12 ? "best-score" : "";
    const bestAClass = m.ari >= bestAri - 1e-12 ? "best-score" : "";
    const isWinner = winner && m.id === winner.id;
    const winnerBadge = isWinner ? '<div class="winner-badge">WINNER</div>' : "";

    return `
      <div class="score-cell ${isWinner ? "winner" : ""}">
        <h3>${esc(m.name)}</h3>
        ${winnerBadge}
        <div class="score-main"><span>mIoU</span><b class="${bestIClass}">${fmt(m.miou)}</b></div>
        <div class="score-main"><span>ARI</span><b class="${bestAClass}">${fmt(m.ari)}</b></div>
      </div>
    `;
  });

  el.scoreGrid.innerHTML = cards.join("");
}

function getSortedImages() {
  const method = state.selectedMethod;
  const metric = state.selectedMetric;
  const arr = state.data.images.filter((im) => {
    if (!state.search) return true;
    return im.id.toLowerCase().includes(state.search);
  });

  const val = (im) => im.metrics?.[method]?.[metric] ?? -1;

  if (state.sortMode === "metric_desc") {
    arr.sort((a, b) => val(b) - val(a));
  } else if (state.sortMode === "metric_asc") {
    arr.sort((a, b) => val(a) - val(b));
  } else {
    arr.sort((a, b) => a.id.localeCompare(b.id, undefined, { numeric: true }));
  }

  return arr;
}

function renderThumbs() {
  const sorted = getSortedImages();
  const shown = sorted.slice(0, state.thumbCount);

  if (!shown.find((x) => x.id === state.selectedImageId)) {
    state.selectedImageId = shown.length ? shown[0].id : null;
  }

  const method = qMethod(state.selectedMethod);
  const metric = state.selectedMetric.toUpperCase();
  el.thumbMeta.textContent = `Showing ${shown.length}/${sorted.length} images | Sorted by ${method.name} ${metric}`;

  el.thumbGrid.innerHTML = shown
    .map((im) => {
      const v = im.metrics[state.selectedMethod][state.selectedMetric];
      const isActive = im.id === state.selectedImageId;
      return `
        <button class="thumb ${isActive ? "active" : ""}" data-id="${im.id}">
          <img loading="lazy" src="${im.original}" alt="${im.id}" />
          <div class="cap"><b>${im.id}</b><br/>${metric}: ${fmt(v)}</div>
        </button>
      `;
    })
    .join("");

  for (const node of el.thumbGrid.querySelectorAll(".thumb")) {
    node.addEventListener("click", () => {
      state.selectedImageId = node.getAttribute("data-id");
      renderFocus();
      renderThumbs();
    });
  }
}

async function renderFocus() {
  const image = state.data.images.find((x) => x.id === state.selectedImageId);
  if (!image) {
    el.focus.innerHTML = "<p>No image selected.</p>";
    return;
  }

  const focusMethods = state.data.methods;
  const bestIoU = qMethod(image.best_iou_method);
  const bestARI = qMethod(image.best_ari_method);

  el.focus.innerHTML = `
    <div class="focus-head">
      <div>
        <h2>Per-Image Visual Compare</h2>
        <div class="id">${image.id}</div>
      </div>
      <div class="meta">
        Best IoU: <b>${bestIoU ? bestIoU.name : "-"}</b> | Best ARI: <b>${bestARI ? bestARI.name : "-"}</b>
      </div>
    </div>
    <div class="compare-strip-wrap">
      <div class="compare-strip" id="compare-strip">
        <div class="compare-card compare-ref">
          <h3>Original</h3>
          <div class="compare-media">
            <img src="${image.original}" alt="${image.id} original" />
          </div>
          <div class="compare-meta">Input RGB image</div>
        </div>
        <div class="compare-card compare-ref">
          <h3>Ground Truth</h3>
          <div class="compare-media">
            <img src="${image.gt}" alt="${image.id} ground truth" />
          </div>
          <div class="compare-meta">Binary target mask</div>
        </div>
      </div>
    </div>
  `;

  const container = document.getElementById("compare-strip");
  const tasks = [];

  for (const method of focusMethods) {
    const m = image.metrics[method.id];
    const card = document.createElement("article");
    card.className = "compare-card compare-method";
    if (method.id === state.selectedMethod) {
      card.classList.add("selected");
    }
    card.innerHTML = `
      <h3>${esc(method.name)}</h3>
      <div class="compare-media">
        <canvas width="320" height="320"></canvas>
      </div>
      <div class="compare-meta">IoU <b>${fmt(m.iou)}</b> | ARI <b>${fmt(m.ari)}</b></div>
      <div class="compare-link">
        <a href="${image.masks[method.id]}" target="_blank" rel="noopener">Open Mask PNG</a>
      </div>
    `;
    container.appendChild(card);

    const canvas = card.querySelector("canvas");
    const color = methodColors[method.id] || "#0b67b0";
    tasks.push(drawMethodCanvas(canvas, image.original, image.masks[method.id], color, state.alpha));
  }

  await Promise.all(tasks);
}

function renderAll() {
  renderScoreboard();
  renderThumbs();
  renderFocus();
}

async function init() {
  const res = await fetch("./data.json?v=" + Date.now());
  if (!res.ok) throw new Error("Failed to load data.json");
  state.data = await res.json();

  state.selectedMethod = state.data.methods[0]?.id ?? null;
  state.selectedImageId = state.data.images[0]?.id ?? null;

  setupControls();
  renderTopSummary();
  renderAll();
}

init().catch((err) => {
  document.body.innerHTML = `<pre style="padding:20px;color:#a43a3a">Failed to load page: ${esc(err.message || err)}</pre>`;
});
