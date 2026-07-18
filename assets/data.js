/* ============================================================
   Konecta 2030 — Model parameters (v0.2)
   Every parameter carries an epistemic label and a source.
   ⏳DR = to be recalibrated with pending deep-research results.
   ✓DR1 = calibrated with DR1 (GPT 5.6 SOL, market & competition).
   ✓DR2 = calibrated with DR2 (GPT 5.6 SOL, economics of disruption).
   ✓DR3 = calibrated with DR3 (Gemini Deep Think, technology).
   ✓DR4 = calibrated with DR4 (Gemini Deep Think, regulation & labor).
   ============================================================ */

const K30 = {
  // ---------- Konecta baseline (editable in the room) ----------
  baseline: {
    ingresos2024: 2030,   // €M — FACT (Expansión, Mar-2025)
    empleados: 120000,    // FACT approx (ABC Dec-2025: 120k; BCG Mar-2026: 109k)
    margenEbitda: 11,     // % — INFERENCE ✓DR1: sector range 10-21% (TTEC 10.0%, TP EBITA 14.6%, Concentrix 14.8%, TaskUs 21.0%)
    // 2024 revenue mix — INFERENCE ⏳DR1
    mixVoz: 68,           // % voice/traditional CX
    mixDigital: 22,       // % digital CX / process BPO
    mixIA: 7,             // % AI/digital solutions (Konecta Digital)
    mixConsultoria: 3     // % consulting/transformation
  },

  // ---------- Simulator levers ----------
  palancas: [
    { id: 'pen',   nombre: 'AI penetration of industry interactions (2030)',
      min: 20, max: 90, def: 55, unidad: '%',
      hint: 'Share of CX interactions resolved end-to-end by AI in 2030. △ Cross-model divergence: DR3 (capability) forecasts 60-90% technically automatable by 2030; DR2 (production evidence) runs far lower — e.g. retention 10-20%, complaints 15-35% automatable in 2030. The gap between capability and deployed reality is what this slider expresses.' },
    { id: 'defl',  nombre: 'Price deflation per automated interaction',
      min: 2, max: 30, def: 8, unidad: '÷',
      hint: 'An AI interaction is billed at the human price divided by this factor. ✓DR2: human voice €0.25 (India) - €2.2 (Spain) vs AI voice all-in €0.45 (2026) → €0.20 (2030 central); all-in deflation only −18%/yr (the floor is telephony/orchestration/oversight, not tokens); SaaS still bills €0.87-2.00/outcome. ✓DR1: renewal TCV deflation −15/−25%.' },
    { id: 'cani',  nombre: 'Speed of Konecta’s self-cannibalization',
      min: 0, max: 100, def: 40, unidad: '',
      hint: '0 = reactive (defends current revenue) · 100 = aggressive (proactively migrates its own accounts to AI). The committee’s decision.' },
    { id: 'fric',  nombre: 'Regulatory and labor friction',
      min: 0, max: 100, def: 50, unidad: '',
      hint: 'AI Act, right-to-a-human rules, cost and conflict of workforce reduction. ✓DR4: friction is asymmetric — Spain 9/10 (exit €15-30k/emp), Colombia 8.5 (free-trade-zone employment quotas), Brazil 8 … Egypt 2/10 (€0.5-1.5k). This slider models the blended global level. ✓DR3: AI disclosure rules 90% prob. by 2027.' },
    { id: 'inter', nombre: 'Automated volume lost to clients’ own or platform-vendor agents',
      min: 10, max: 70, def: 30, unidad: '%',
      hint: '% of automated volume that clients keep in-house with their own agents. ✓DR1: Santander targets 40% of UK call volume via self-service; Home Depot voice agent on Gemini rolling out nationally; Klarna equivalent of 700 FTEs — then partially reversed. ✓DR3: Computer Use removes the integration barrier that used to protect outsourcers. ⏳DR2' },
    { id: 'prima', nombre: 'Value premium of premium human interaction',
      min: 0, max: 300, def: 30, unidad: '%',
      hint: 'Price premium the market pays for expert human attention in high-value moments. ✓DR2: observed premium today +15/+30/+60% (retention, fraud, VIP, regulated complaints). ✓DR3 hypothesis: "human as Veblen good" — luxury CX tiers could push far higher by 2030. The "Rester humain" lever.' }
  ],

  // ---------- Scenario presets ----------
  presets: {
    s1: { nombre: 'S1 · Erosion',          pen: 75, defl: 15, cani: 15, fric: 35, inter: 50, prima: 15 },
    s2: { nombre: 'S2 · Metamorphosis',    pen: 65, defl: 10, cani: 85, fric: 45, inter: 25, prima: 60 },
    s3: { nombre: 'S3 · Human Fortress',   pen: 35, defl: 5,  cani: 45, fric: 75, inter: 20, prima: 120 },
    // S4 added after BOTH red-team models independently proposed it (platform layer captures the value chain)
    s4: { nombre: 'S4 · Platform Capture', pen: 70, defl: 14, cani: 70, fric: 40, inter: 60, prima: 40 }
  },

  // Scenario weights v0.6 — post red team. Model votes: GPT 5.6 SOL 40/30/10/20 · Gemini DT 50/15/15/20 ·
  // Claude synthesis 35/30/15/20 (red-teamers structurally over-discount incumbent agency; Konecta's real
  // assets — ISO 42001, Kolibri in production, 500 enterprise relationships — justify S2 above the RT average)
  pesos: { s1: 35, s2: 30, s3: 15, s4: 20 },

  // ---------- Internal model assumptions (visible in "How is this calculated?") ----------
  supuestos: {
    margenIA: 26,          // % EBITDA-level margin of AI-led revenue — lowered from 32 per RT2 audit (55-66% software figures are GROSS margin, not EBITDA; NICE op margin 30.8% is the ceiling, and Konecta carries services overhead)
    margenHumano: 11,      // % margin of traditional human business
    margenPremium: 22,     // % margin of premium human business
    botsPorSupervisor: 22, // AI agents per human supervisor — ✓DR3: 1:15-20 today, >1:25 by 2028 (80% prob.)
    factorQA: 2.0,         // multiplier over pure supervision: QA "judge" ops, policy & prompt maintenance — HYPOTHESIS
    crecimientoSector: 3.0,// % annual growth — ✓DR1: outsourced CXM nominal CAGR central scenario +2/+4% (pessimist −1/+1%, optimist +5/+7%)
    exitCostBlended: 4500, // € blended exit cost per employee — ✓DR4 friction map weighted by footprint (Spain 15-30k, Latam 3-9k, Egypt/India 0.5-2.5k)
    ingresoPorFTE: 16900   // € revenue per employee (baseline-derived)
  }
};
