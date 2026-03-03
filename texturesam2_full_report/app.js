(async () => {
  const fmt = (x) => (typeof x === 'number' ? x.toFixed(6) : String(x));

  try {
    const res = await fetch('./assets/data/report_data.json', { cache: 'no-store' });
    if (!res.ok) return;
    const data = await res.json();
    const methods = Array.isArray(data.core_methods) ? data.core_methods : [];
    const byRole = Object.fromEntries(methods.map((m) => [m.role, m]));

    const baseline = byRole.baseline || {};
    const bestCv = byRole.main_claim || {};
    const bestIn = byRole.optimistic_ceiling || {};

    const setTxt = (id, value) => {
      const el = document.getElementById(id);
      if (el != null) el.textContent = fmt(value);
    };

    setTxt('m_baseline_iou', baseline.miou ?? baseline.iou);
    setTxt('m_baseline_ari', baseline.ari);
    setTxt('m_best_cv_iou', bestCv.miou ?? bestCv.iou);
    setTxt('m_best_cv_ari', bestCv.ari);
    setTxt('m_best_in_iou', bestIn.miou ?? bestIn.iou);
    setTxt('m_best_in_ari', bestIn.ari);
  } catch (_) {
    // Keep static fallback values in HTML.
  }
})();
