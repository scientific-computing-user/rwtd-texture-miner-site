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
  baseline_v5: "#d66a0e",
  v2_handcrafted: "#0f83c7",
  v2_dtd: "#6f59cf",
  reranker_cv: "#1ea26b",
  reranker_cv_refined: "#12925b",
  reranker_in_sample: "#c93c5d",
  reranker_in_sample_refined: "#8f2442",
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
  tpl: document.getElementById("method-card-template"),
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
  ctx.drawImage(orig, 0, 0, w, h);
  ctx.globalAlpha = alpha;
  ctx.drawImage(tinted, 0, 0, w, h);
  ctx.globalAlpha = 1.0;

  // subtle frame for foreground structure
  ctx.strokeStyle = "rgba(255,255,255,0.45)";
  ctx.lineWidth = 1;
  ctx.strokeRect(0.5, 0.5, w - 1, h - 1);
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
  const bestCV = methods.find((m) => m.id === "reranker_cv_refined");
  const bestINS = methods.find((m) => m.id === "reranker_in_sample_refined");
  const baseline = methods.find((m) => m.id === "baseline_v5");

  const deltaCV = {
    iou: bestCV.miou - baseline.miou,
    ari: bestCV.ari - baseline.ari,
  };

  el.topSummary.innerHTML = `
    <div class="top-pill"><span>Images</span><b>${state.data.num_images}</b></div>
    <div class="top-pill"><span>Best CV mIoU / ARI</span><b>${fmt(bestCV.miou, 4)} / ${fmt(bestCV.ari, 4)}</b></div>
    <div class="top-pill"><span>CV Gain vs Baseline</span><b>+${fmt(deltaCV.iou, 4)} / +${fmt(deltaCV.ari, 4)}</b></div>
    <div class="top-pill"><span>Best In-sample mIoU / ARI</span><b>${fmt(bestINS.miou, 4)} / ${fmt(bestINS.ari, 4)}</b></div>
  `;
}

function renderScoreboard() {
  const baseline = qMethod("baseline_v5");
  const cards = state.data.methods.map((m) => {
    const dI = m.miou - baseline.miou;
    const dA = m.ari - baseline.ari;
    const clsI = dI >= 0 ? "delta-up" : "delta-dn";
    const clsA = dA >= 0 ? "delta-up" : "delta-dn";

    return `
      <div class="score-cell">
        <h3>${esc(m.name)}</h3>
        <div class="score-main"><span>mIoU</span><b>${fmt(m.miou)}</b></div>
        <div class="score-main"><span>ARI</span><b>${fmt(m.ari)}</b></div>
        <div class="score-main"><span>ΔIoU</span><b class="${clsI}">${dI >= 0 ? "+" : ""}${fmt(dI)}</b></div>
        <div class="score-main"><span>ΔARI</span><b class="${clsA}">${dA >= 0 ? "+" : ""}${fmt(dA)}</b></div>
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

  const baseline = image.metrics.baseline_v5;

  el.focus.innerHTML = `
    <div class="focus-head">
      <div>
        <h2>Per-Image Visual Compare</h2>
        <div class="id">${image.id}</div>
      </div>
      <div class="meta">
        Best IoU: <b>${qMethod(image.best_iou_method).name}</b> | Best ARI: <b>${qMethod(image.best_ari_method).name}</b>
      </div>
    </div>
    <div class="focus-main">
      <div class="reference-stack">
        <div class="reference-box">
          <img src="${image.original}" alt="${image.id} original" />
          <div class="title">Original</div>
        </div>
        <div class="reference-box">
          <img src="${image.gt}" alt="${image.id} ground truth" />
          <div class="title">Ground Truth Binary Mask</div>
        </div>
      </div>
      <div class="methods-grid" id="methods-grid"></div>
    </div>
  `;

  const container = document.getElementById("methods-grid");
  const tasks = [];

  for (const method of state.data.methods) {
    const frag = el.tpl.content.cloneNode(true);
    const card = frag.querySelector(".method-card");
    const h3 = frag.querySelector("h3");
    const p = frag.querySelector("header p");
    const canvas = frag.querySelector("canvas");
    const metrics = frag.querySelector(".method-metrics");
    const links = frag.querySelector(".method-links");

    const m = image.metrics[method.id];
    const dI = m.iou - baseline.iou;
    const dA = m.ari - baseline.ari;

    h3.textContent = method.name;
    p.textContent = `mIoU ${fmt(method.miou)} | ARI ${fmt(method.ari)}`;

    metrics.innerHTML = `
      <span>IoU <b>${fmt(m.iou)}</b> <b class="${dI >= 0 ? "delta-up" : "delta-dn"}">${dI >= 0 ? "+" : ""}${fmt(dI)}</b></span>
      <span>ARI <b>${fmt(m.ari)}</b> <b class="${dA >= 0 ? "delta-up" : "delta-dn"}">${dA >= 0 ? "+" : ""}${fmt(dA)}</b></span>
    `;

    links.innerHTML = `<a href="${image.masks[method.id]}" target="_blank" rel="noopener">Open Mask PNG</a>`;
    container.appendChild(frag);

    const color = methodColors[method.id] || "#0b67b0";
    tasks.push(drawMethodCanvas(canvas, image.original, image.masks[method.id], color, state.alpha));

    if (method.id === state.selectedMethod) {
      card.style.borderColor = "#0b67b0";
      card.style.boxShadow = "0 0 0 2px #0b67b032";
    }
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

  state.selectedMethod = "reranker_cv_refined";
  state.selectedImageId = state.data.images[0].id;

  setupControls();
  renderTopSummary();
  renderAll();
}

init().catch((err) => {
  document.body.innerHTML = `<pre style="padding:20px;color:#a43a3a">Failed to load page: ${esc(err.message || err)}</pre>`;
});
