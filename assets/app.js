/* ============================================================
   Konecta 2030 — simulator engine + site interaction
   v0.2 — formulas provisional; ✓DR3-calibrated where noted,
   pending recalibration with DR1/DR2/DR4.
   ============================================================ */
(function () {
  'use strict';

  const $ = (s, c) => (c || document).querySelector(s);
  const $$ = (s, c) => Array.from((c || document).querySelectorAll(s));
  const fmtM = v => (v >= 1000 ? '€' + (v / 1000).toFixed(2) + 'B' : '€' + Math.round(v).toLocaleString('en-US') + 'M');
  const fmtK = v => Math.round(v).toLocaleString('en-US');

  /* ---------------- MODEL ----------------
     Volume unit: "€M at 2024 human prices".
     All constants live in data.js (K30) and are shown in the
     "How is this calculated?" disclosure.                      */
  function modelo(p, b) {
    const S = K30.supuestos;
    // 1. Human-equivalent interaction business volume in 2030
    //    (unit: €M valued at 2024 human prices — an explicit value-equivalent, not a headcount of interactions)
    const volInter24 = b.ingresos2024 * (b.mixVoz + b.mixDigital) / 100;
    //    Jevons effect (RT2-Gemini): cheaper interactions expand demand — new micro-interactions appear
    const jevons = Math.max(0.9, 1 + 0.01 * (p.defl - 8));
    const volInter30 = volInter24 * Math.pow(1 + S.crecimientoSector / 100, 6) * jevons;

    // 2. Effective AI penetration (friction delays the curve — coefficient raised per RT2 audit)
    const penEff = (p.pen / 100) * (1 - 0.45 * (p.fric / 100));

    // 3. What remains human in 2030
    const volHumano = volInter30 * (1 - penEff);
    //    Konecta retains more human volume if it moved early — coupling attenuated per RT2 (was 0.60+0.40)
    const retencion = 0.65 + 0.25 * (p.cani / 100);
    const volHumanoK = volHumano * retencion;
    //    Premium: downward-sloping demand per RT2 — higher premium shrinks the buying share
    const sharePremium = Math.max(0.08, 0.25 / Math.sqrt(1 + p.prima / 100));
    const ingHumPremium = volHumanoK * sharePremium * (1 + p.prima / 100);
    //    Legacy repricing (RT2-Gemini): the deeper AI deflation runs, the harder clients renegotiate human rates
    const legacy = Math.max(0.60, 0.95 - 0.012 * p.defl);
    const ingHumBase = volHumanoK * (1 - sharePremium) * legacy;

    // 4. The automated volume: who captures it — capture decoupled/attenuated per RT2 (was 0.12+0.60)
    const volAuto = volInter30 * penEff;
    const volAutoDisponible = volAuto * (1 - p.inter / 100);      // not lost to in-house/platform agents
    const capturaK = 0.10 + 0.45 * (p.cani / 100);                 // Konecta's share of AI volume
    const volAutoK = volAutoDisponible * capturaK;
    const ingIA = volAutoK / p.defl * (1 + 0.35);                  // + platform/orchestration/data ARPU

    // 5. New businesses (Kolibri as product, consulting, agentic back-office) — growth coupling attenuated per RT2
    const ingNuevos = b.ingresos2024 * (b.mixIA + b.mixConsultoria) / 100
      * Math.pow(1 + (0.08 + 0.14 * (p.cani / 100)), 6);

    const ingresos2030 = ingHumBase + ingHumPremium + ingIA + ingNuevos;

    // 6. Workforce (computed before EBITDA — severance depends on it)
    const ftePorMe = b.empleados / volInter24;                     // FTEs per human €M-equivalent (2024)
    const fteHumanos = volHumanoK * ftePorMe * 0.93;               // copilot productivity
    //    Oversight is indexed to CAPTURED automated volume — lose the account, lose the oversight jobs too
    const fteCargaAuto = volAutoK * ftePorMe;                      // workload-equivalent of captured AI volume
    const fteSupervision = fteCargaAuto / K30.supuestos.botsPorSupervisor * K30.supuestos.factorQA;
    const fteTecnologia = (ingIA + ingNuevos) / 0.15;              // 1 FTE per €150k — blended architects + offshore AI ops (RT2-Gemini: 0.28 was SaaS-grade)
    const plantilla2030 = fteHumanos + fteSupervision + fteTecnologia;

    // 7. EBITDA from margin mix, MINUS transition frictions (RT2 audits):
    //    (a) dual-structure & migration drag  (b) stranded fixed costs
    //    (c) severance toll: exits beyond silent-attrition capacity are paid at blended cost;
    //        deciding early (high cani) lets 30-40%/yr natural rotation absorb most exits (✓DR4)
    const dragMigracion = 0.06 * volAutoK;
    const dragEstructura = 0.05 * Math.max(0, volInter24 * 0.9 - (volHumanoK + 0.2 * volAutoK));
    const fteReduccion = Math.max(0, b.empleados - plantilla2030);
    const shareAtricion = Math.min(0.95, 0.50 + 0.35 * (p.cani / 100));
    const dragSeverance = fteReduccion * S.exitCostBlended * (1 - shareAtricion) / 5 / 1e6; // annualized, M€
    const ebitda2030 = ingHumBase * S.margenHumano / 100
      + ingHumPremium * S.margenPremium / 100
      + (ingIA + ingNuevos) * S.margenIA / 100
      - dragMigracion - dragEstructura - dragSeverance;

    // 8. Katalyst 2028 — J-curve weighting (RT2-Gemini): price pressure front-loads, AI revenue back-loads
    const ingresos2028 = b.ingresos2024 + (ingresos2030 - b.ingresos2024) * 0.5;

    return {
      ingresos2030, ebitda2030, plantilla2030, ingresos2028,
      mix: { humano: ingHumBase, premium: ingHumPremium, ia: ingIA, nuevos: ingNuevos },
      fte: { humanos: fteHumanos, supervision: fteSupervision, tecnologia: fteTecnologia },
      penEff
    };
  }

  /* Value of the window: cumulative 2026-2030 EBITDA lost if the decision
     to cannibalize arrives ~1 year late (cani floored at 0).
     ×2.5 = sum of a linear ramp of the annual gap over 2026-30
     (0 + 0.25 + 0.5 + 0.75 + 1.0) — plain arithmetic, replacing the
     narrative 3.2 scalar flagged by the RT2 audit. */
  function ventana(p, b) {
    const ahora = modelo(p, b).ebitda2030;
    const tarde = modelo(Object.assign({}, p, { cani: Math.max(0, p.cani - 25) }), b).ebitda2030;
    return Math.max(0, (ahora - tarde) * 2.5);
  }

  /* Affinity of the current configuration with each scenario (normalized distance) */
  function escenarioActual(p) {
    const dims = K30.palancas.map(x => x.id);
    const dist = {};
    for (const [k, pre] of Object.entries(K30.presets)) {
      let d = 0;
      for (const id of dims) {
        const pal = K30.palancas.find(x => x.id === id);
        d += Math.pow((p[id] - pre[id]) / (pal.max - pal.min), 2);
      }
      dist[k] = Math.sqrt(d / dims.length);
    }
    const inv = Object.fromEntries(Object.entries(dist).map(([k, d]) => [k, 1 / (d + 0.05)]));
    const tot = Object.values(inv).reduce((a, b) => a + b, 0);
    const af = Object.fromEntries(Object.entries(inv).map(([k, v]) => [k, v / tot]));
    const top = Object.entries(af).sort((a, b) => b[1] - a[1])[0];
    return { af, top: top[0], pct: Math.round(top[1] * 100) };
  }

  /* ---------------- Simulator UI ---------------- */
  const sim = $('#sim-app');
  if (sim) construirSimulador();

  function construirSimulador() {
    const panelP = $('#sim-palancas');
    const estado = {};

    // Editable baseline
    const b = Object.assign({}, K30.baseline);
    $$('#sim-baseline input').forEach(inp => {
      inp.value = b[inp.dataset.k];
      inp.addEventListener('input', () => {
        const v = parseFloat(String(inp.value).replace(',', '.'));
        if (!isNaN(v) && v > 0) { b[inp.dataset.k] = v; pintar(); }
      });
    });

    // Sliders
    K30.palancas.forEach(pal => {
      estado[pal.id] = pal.def;
      const div = document.createElement('div');
      div.className = 'palanca';
      div.innerHTML =
        '<label>' + pal.nombre + ' <output id="out-' + pal.id + '"></output></label>' +
        '<input type="range" id="in-' + pal.id + '" min="' + pal.min + '" max="' + pal.max + '" value="' + pal.def + '">' +
        '<div class="hint">' + pal.hint + '</div>';
      panelP.appendChild(div);
      $('#in-' + pal.id).addEventListener('input', e => {
        estado[pal.id] = +e.target.value;
        $$('.presets button').forEach(x => x.classList.remove('on'));
        pintar();
      });
    });

    // Presets
    $$('.presets button[data-preset]').forEach(btn => {
      btn.addEventListener('click', () => {
        const pre = K30.presets[btn.dataset.preset];
        for (const id of Object.keys(estado)) {
          if (id in pre) { estado[id] = pre[id]; $('#in-' + id).value = pre[id]; }
        }
        $$('.presets button').forEach(x => x.classList.remove('on'));
        btn.classList.add('on');
        pintar();
      });
    });
    $('#btn-consenso').addEventListener('click', () => {
      const cfg = { palancas: Object.assign({}, estado), baseline: Object.assign({}, b), ts: new Date().toISOString() };
      localStorage.setItem('konecta2030-consensus', JSON.stringify(cfg));
      $('#btn-consenso').textContent = '✓ Consensus saved';
      setTimeout(() => { $('#btn-consenso').textContent = 'Save committee consensus'; }, 2200);
    });

    function pintar() {
      const r = modelo(estado, b);
      const v = ventana(estado, b);
      const esc = escenarioActual(estado);

      // Slider output formatting
      K30.palancas.forEach(pal => {
        const val = estado[pal.id];
        let txt;
        if (pal.id === 'defl') txt = '÷' + val;
        else if (pal.id === 'cani') txt = val < 33 ? 'reactive (' + val + ')' : val < 66 ? 'progressive (' + val + ')' : 'aggressive (' + val + ')';
        else if (pal.id === 'fric') txt = val < 33 ? 'low (' + val + ')' : val < 66 ? 'medium (' + val + ')' : 'high (' + val + ')';
        else txt = val + pal.unidad;
        $('#out-' + pal.id).textContent = txt;
      });

      // KPIs
      $('#kpi-ing .k-n').textContent = fmtM(r.ingresos2030);
      const dIng = (r.ingresos2030 / b.ingresos2024 - 1) * 100;
      $('#kpi-ing .k-d').textContent = (dIng >= 0 ? '+' : '') + dIng.toFixed(0) + '% vs 2024';
      $('#kpi-ing').className = 'kpi ' + (dIng < 0 ? 'alerta' : 'ok');

      $('#kpi-ebitda .k-n').textContent = fmtM(r.ebitda2030);
      const mE = r.ebitda2030 / r.ingresos2030 * 100;
      $('#kpi-ebitda .k-d').textContent = mE.toFixed(1) + '% margin';
      $('#kpi-ebitda').className = 'kpi ' + (mE < b.margenEbitda ? 'alerta' : 'ok');

      $('#kpi-plantilla .k-n').textContent = fmtK(r.plantilla2030);
      const dP = (r.plantilla2030 / b.empleados - 1) * 100;
      $('#kpi-plantilla .k-d').textContent = (dP >= 0 ? '+' : '') + dP.toFixed(0) + '% vs today';
      $('#kpi-plantilla').className = 'kpi ' + (dP < -25 ? 'alerta' : '');

      $('#kpi-esc .k-n').textContent = { s1: 'S1', s2: 'S2', s3: 'S3', s4: 'S4' }[esc.top];
      $('#kpi-esc .k-d').textContent = { s1: 'Erosion', s2: 'Metamorphosis', s3: 'Human Fortress', s4: 'Platform Capture' }[esc.top] + ' · ' + esc.pct + '% affinity';
      $('#kpi-esc').className = 'kpi ' + (esc.top === 's1' || esc.top === 's4' ? 'alerta' : esc.top === 's3' ? '' : 'ok');

      // Window
      $('#ventana-n').textContent = '−' + fmtM(v);
      // Katalyst
      const k = $('#katalyst');
      const gap = r.ingresos2028 - 2500;
      k.innerHTML = '<strong>Katalyst 2028 check:</strong> this configuration projects <strong>' +
        fmtM(r.ingresos2028) + '</strong> in 2028 — ' +
        (gap >= 0
          ? '<span style="color:var(--verde)">€2.5B target reached (+€' + Math.round(gap) + 'M)</span>'
          : '<span style="color:var(--coral)">€' + Math.round(-gap) + 'M short of the €2.5B target</span>');

      dibujarMix(r, b);
      dibujarPlantilla(r, b);
    }

    /* --- Chart: revenue mix 2024 vs 2030 (stacked SVG bars) --- */
    function dibujarMix(r, b) {
      const svg = $('#viz-mix');
      const W = 640, BH = 46, GAP = 58, LX = 120;
      const colores = { humano: '#8f93b8', premium: '#1d7a4f', ia: '#3b2fbf', nuevos: '#7f6cf0' };
      const filas = [
        { y: 24, label: '2024', total: b.ingresos2024, partes: [
          ['humano', b.ingresos2024 * (b.mixVoz + b.mixDigital) / 100 * 0.85],
          ['premium', b.ingresos2024 * (b.mixVoz + b.mixDigital) / 100 * 0.15],
          ['ia', b.ingresos2024 * b.mixIA / 100],
          ['nuevos', b.ingresos2024 * b.mixConsultoria / 100]] },
        { y: 24 + GAP + BH, label: '2030', total: r.ingresos2030, partes: [
          ['humano', r.mix.humano], ['premium', r.mix.premium], ['ia', r.mix.ia], ['nuevos', r.mix.nuevos]] }
      ];
      const maxT = Math.max(filas[0].total, filas[1].total, 1);
      let out = '';
      filas.forEach(f => {
        out += '<text x="0" y="' + (f.y + BH / 2 + 5) + '" font-family="-apple-system,sans-serif" font-size="15" font-weight="700" fill="#16182b">' + f.label + '</text>';
        out += '<text x="' + LX + '" y="' + (f.y - 8) + '" font-family="-apple-system,sans-serif" font-size="12" fill="#4a4e69">' + fmtM(f.total) + '</text>';
        let x = LX;
        f.partes.forEach(([k, val]) => {
          const w = Math.max(0, val / maxT * (W - LX));
          if (w > 0.5) out += '<rect x="' + x + '" y="' + f.y + '" width="' + w + '" height="' + BH + '" rx="3" fill="' + colores[k] + '"><title>' + k + ': ' + fmtM(val) + '</title></rect>';
          x += w;
        });
      });
      // Legend
      const ley = [['humano', 'Human CX'], ['premium', 'Premium human'], ['ia', 'AI-led CX'], ['nuevos', 'Platform & new lines']];
      let lx = LX;
      const lyY = filas[1].y + BH + 30;
      ley.forEach(([k, txt]) => {
        out += '<rect x="' + lx + '" y="' + (lyY - 10) + '" width="11" height="11" rx="2" fill="' + colores[k] + '"/>';
        out += '<text x="' + (lx + 16) + '" y="' + lyY + '" font-family="-apple-system,sans-serif" font-size="12" fill="#4a4e69">' + txt + '</text>';
        lx += 16 + txt.length * 6.4 + 26;
      });
      svg.setAttribute('viewBox', '0 0 ' + W + ' ' + (lyY + 14));
      svg.innerHTML = out;
    }

    /* --- Chart: 2030 workforce composition --- */
    function dibujarPlantilla(r, b) {
      const svg = $('#viz-fte');
      const W = 640, BH = 34, LX = 120;
      const filas = [
        { y: 18, label: 'Today', partes: [['#8f93b8', b.empleados, 'Agents & operations']] },
        { y: 18 + 64, label: '2030', partes: [
          ['#8f93b8', r.fte.humanos, 'Human agents (incl. premium)'],
          ['#b26a00', r.fte.supervision, 'AI-agent oversight & QA'],
          ['#3b2fbf', r.fte.tecnologia, 'Engineering, data & CX design']] }
      ];
      const maxT = Math.max(b.empleados, r.plantilla2030, 1);
      let out = '';
      filas.forEach(f => {
        const tot = f.partes.reduce((a, p) => a + p[1], 0);
        out += '<text x="0" y="' + (f.y + BH / 2 + 5) + '" font-family="-apple-system,sans-serif" font-size="15" font-weight="700" fill="#16182b">' + f.label + '</text>';
        out += '<text x="' + LX + '" y="' + (f.y - 6) + '" font-family="-apple-system,sans-serif" font-size="12" fill="#4a4e69">' + fmtK(tot) + ' people</text>';
        let x = LX;
        f.partes.forEach(([color, val, nombre]) => {
          const w = Math.max(0, val / maxT * (W - LX));
          if (w > 0.5) out += '<rect x="' + x + '" y="' + f.y + '" width="' + w + '" height="' + BH + '" rx="3" fill="' + color + '"><title>' + nombre + ': ' + fmtK(val) + '</title></rect>';
          x += w;
        });
      });
      svg.setAttribute('viewBox', '0 0 ' + W + ' ' + (18 + 64 + BH + 16));
      svg.innerHTML = out;
    }

    pintar();
  }

  /* ---------------- Navigation scrollspy ---------------- */
  const enlaces = $$('nav a[href^="#"]');
  const secciones = enlaces.map(a => $(a.getAttribute('href'))).filter(Boolean);
  if (secciones.length) {
    const spy = new IntersectionObserver(entries => {
      entries.forEach(en => {
        if (en.isIntersecting) {
          enlaces.forEach(a => a.classList.toggle('activo', a.getAttribute('href') === '#' + en.target.id));
        }
      });
    }, { rootMargin: '-30% 0px -60% 0px' });
    secciones.forEach(s => spy.observe(s));
  }

  /* ---------------- Timeline side dashboard ---------------- */
  const dash = $('#dash');
  if (dash) {
    const fases = $$('.fase[data-dash]');
    const obs = new IntersectionObserver(entries => {
      entries.forEach(en => {
        if (!en.isIntersecting) return;
        const d = JSON.parse(en.target.dataset.dash);
        $('#dash-periodo').textContent = d.periodo;
        $('#dm-auto .dm-n').textContent = d.auto + '%';
        $('#dm-auto i').style.width = d.auto + '%';
        $('#dm-coste .dm-n').textContent = d.coste;
        $('#dm-coste i').style.width = d.costePct + '%';
        $('#dm-arr .dm-n').textContent = d.arr;
        $('#dm-arr i').style.width = d.arrPct + '%';
      });
    }, { rootMargin: '-40% 0px -50% 0px' });
    fases.forEach(f => obs.observe(f));
  }
})();
