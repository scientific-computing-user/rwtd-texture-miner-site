async function loadData() {
  const res = await fetch("./data.json", { cache: "no-store" });
  if (!res.ok) throw new Error(`failed to load data.json (${res.status})`);
  return res.json();
}

function fmt(x, d = 4) {
  if (x === null || x === undefined || Number.isNaN(Number(x))) return "-";
  return Number(x).toFixed(d);
}

function scoreTable(dataset) {
  const rows = [...dataset.paper_rows, ...dataset.our_rows];
  const best = {
    miou_noagg: Math.max(...rows.map((r) => r.miou_noagg)),
    ari_noagg: Math.max(...rows.map((r) => r.ari_noagg)),
    miou_agg: Math.max(...rows.map((r) => r.miou_agg)),
  };

  const tr = rows
    .map((r) => {
      const cls = (v, k) => (Number(v) === Number(best[k]) ? "best" : "");
      return `
        <tr>
          <td>${r.method}</td>
          <td class="num ${cls(r.miou_noagg, "miou_noagg")}">${fmt(r.miou_noagg)}</td>
          <td class="num ${cls(r.ari_noagg, "ari_noagg")}">${fmt(r.ari_noagg)}</td>
          <td class="num ${cls(r.miou_agg, "miou_agg")}">${fmt(r.miou_agg)}</td>
          <td>${r.source}</td>
        </tr>
      `;
    })
    .join("");

  return `
    <div class="dataset-card">
      <div class="dataset-head">
        <h3>${dataset.display_name}</h3>
        <p>${dataset.meta}</p>
      </div>
      <table>
        <thead>
          <tr>
            <th>Method</th>
            <th>mIoU (No-Agg)</th>
            <th>ARI (No-Agg)</th>
            <th>mIoU (Agg)</th>
            <th>Source</th>
          </tr>
        </thead>
        <tbody>${tr}</tbody>
      </table>
    </div>
  `;
}

function renderDatasetDetails(data) {
  const root = document.getElementById("datasets");
  root.innerHTML = data.datasets
    .map(
      (ds) => `
      <div class="dataset-card">
        <div class="dataset-head">
          <h3>${ds.display_name}</h3>
          <p>${ds.meta}</p>
        </div>
        <p class="muted"><b>Our run notes:</b> ${ds.notes}</p>
        <p class="muted"><b>Artifacts:</b>
          <a href="${ds.artifacts.conservative_json}">Conservative JSON</a> |
          <a href="${ds.artifacts.permissive_json}">Permissive JSON</a>
        </p>
      </div>
    `
    )
    .join("");
}

async function main() {
  try {
    const data = await loadData();
    const board = document.getElementById("scoreboard");
    board.innerHTML = data.datasets.map((ds) => scoreTable(ds)).join("");
    renderDatasetDetails(data);
  } catch (err) {
    const board = document.getElementById("scoreboard");
    board.innerHTML = `<p>Failed to load benchmark data: ${String(err)}</p>`;
  }
}

main();
