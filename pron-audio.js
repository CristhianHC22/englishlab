/* Pronunciación — formantes F1/F2 vía Web Audio + LPC */
(function () {
  "use strict";

  /** F1/F2 medios (Hz) — vowel chart inglés general */
  const VOWEL = {
    i: { f1: 280, f2: 2700 }, "iː": { f1: 280, f2: 2700 },
    ɪ: { f1: 400, f2: 2000 },
    e: { f1: 500, f2: 1900 }, ɛ: { f1: 600, f2: 1800 },
    æ: { f1: 700, f2: 1700 },
    a: { f1: 750, f2: 1200 }, ɑ: { f1: 730, f2: 1100 }, "ɑː": { f1: 730, f2: 1100 },
    ʌ: { f1: 640, f2: 1200 },
    ɔ: { f1: 570, f2: 900 }, "ɔː": { f1: 570, f2: 900 },
    o: { f1: 450, f2: 900 }, oʊ: { f1: 450, f2: 900 },
    u: { f1: 320, f2: 900 }, "uː": { f1: 300, f2: 870 },
    ʊ: { f1: 440, f2: 1100 },
    ɜ: { f1: 550, f2: 1400 }, "ɜː": { f1: 550, f2: 1400 }, "ɜːr": { f1: 550, f2: 1400 },
    ə: { f1: 500, f2: 1500 },
    eɪ: { f1: 530, f2: 1900 },
    aɪ: { f1: 650, f2: 1700 },
    aʊ: { f1: 650, f2: 1200 },
    ɔɪ: { f1: 570, f2: 1100 },
  };

  const VOWEL_ORDER = [
    "eɪ", "aɪ", "aʊ", "ɔɪ", "iː", "uː", "ɔː", "ɑː", "ɜː", "ɜːr",
    "oʊ", "e", "ɛ", "æ", "ʌ", "ɑ", "ɔ", "ə", "ɜ", "ʊ", "ɪ", "i", "u", "o", "a",
  ];

  function extractPrimaryVowel(ipa) {
    const s = String(ipa || "").toLowerCase().replace(/[/ˈˌ\s]/g, "");
    for (const v of VOWEL_ORDER) {
      if (s.includes(v)) return v;
    }
    return null;
  }

  function vowelDist(f1, f2, target) {
    const df1 = (f1 - target.f1) / 180;
    const df2 = (f2 - target.f2) / 350;
    return Math.sqrt(df1 * df1 + df2 * df2);
  }

  function scoreFormantPair(measured, ipaA, ipaB) {
    const vA = extractPrimaryVowel(ipaA);
    const vB = extractPrimaryVowel(ipaB);
    const tA = vA && VOWEL[vA];
    const tB = vB && VOWEL[vB];
    if (!measured?.f1 || !measured?.f2 || !tA || !tB) return null;
    if (vA === vB) return null;
    const dA = vowelDist(measured.f1, measured.f2, tA);
    const dB = vowelDist(measured.f1, measured.f2, tB);
    const margin = dB - dA;
    const pct = Math.round(Math.max(0, Math.min(100, 55 + margin * 22)));
    let note;
    if (margin > 0.45) note = `Formantes alineados con /${vA}/ (objetivo A)`;
    else if (margin > 0.1) note = `Cerca de /${vA}/ — afina F1/F2`;
    else if (margin > -0.35) note = `Entre /${vA}/ y /${vB}/ — oye A otra vez`;
    else note = `Suena más a /${vB}/; abre o cierra la vocal hacia /${vA}/`;
    return {
      pct,
      note,
      closerTo: dA <= dB ? "A" : "B",
      targetVowel: vA,
      rivalVowel: vB,
      dA,
      dB,
      margin,
    };
  }

  function autocorr(frame, order) {
    const r = new Float32Array(order + 1);
    for (let i = 0; i <= order; i += 1) {
      let s = 0;
      for (let n = 0; n < frame.length - i; n += 1) s += frame[n] * frame[n + i];
      r[i] = s;
    }
    return r;
  }

  function levinson(r, order) {
    const a = new Float32Array(order + 1);
    const e = new Float32Array(order + 1);
    a[0] = 1;
    e[0] = r[0] || 1e-6;
    for (let i = 1; i <= order; i += 1) {
      let lambda = 0;
      for (let j = 1; j < i; j += 1) lambda += a[j] * r[i - j];
      lambda = (r[i] - lambda) / e[i - 1];
      const aPrev = a.slice();
      a[i] = lambda;
      for (let j = 1; j < i; j += 1) a[j] = aPrev[j] - lambda * aPrev[i - j];
      e[i] = e[i - 1] * (1 - lambda * lambda);
    }
    return a;
  }

  function lpcFormants(a, sr) {
    const peaks = [];
    for (let f = 90; f < Math.min(3800, sr * 0.45); f += 8) {
      const w = (2 * Math.PI * f) / sr;
      let re = 1;
      let im = 0;
      for (let k = 1; k < a.length; k += 1) {
        re += a[k] * Math.cos(k * w);
        im -= a[k] * Math.sin(k * w);
      }
      const gain = 1 / Math.sqrt(re * re + im * im);
      peaks.push({ f, gain });
    }
    peaks.sort((x, y) => y.gain - x.gain);
    const picked = [];
    for (const p of peaks) {
      if (picked.some((q) => Math.abs(q.f - p.f) < 110)) continue;
      picked.push(p);
      if (picked.length >= 3) break;
    }
    picked.sort((x, y) => x.f - y.f);
    return {
      f1: picked[0]?.f || null,
      f2: picked[1]?.f || null,
      f3: picked[2]?.f || null,
    };
  }

  function preEmphasis(frame, coef) {
    const out = new Float32Array(frame.length);
    out[0] = frame[0];
    for (let i = 1; i < frame.length; i += 1) out[i] = frame[i] - coef * frame[i - 1];
    return out;
  }

  function hamming(frame) {
    const n = frame.length;
    const out = new Float32Array(n);
    for (let i = 0; i < n; i += 1) {
      out[i] = frame[i] * (0.54 - 0.46 * Math.cos((2 * Math.PI * i) / (n - 1)));
    }
    return out;
  }

  function getMonoFrame(buffer, start, length) {
    const ch = buffer.getChannelData(0);
    const frame = new Float32Array(length);
    for (let i = 0; i < length; i += 1) frame[i] = ch[start + i] || 0;
    return frame;
  }

  function findBestVoicedFrame(buffer) {
    const sr = buffer.sampleRate;
    const ch = buffer.getChannelData(0);
    const win = Math.max(256, Math.floor(sr * 0.035));
    let best = { start: 0, energy: 0 };
    const hop = Math.floor(win / 2);
    for (let i = 0; i < ch.length - win; i += hop) {
      let e = 0;
      for (let j = 0; j < win; j += 1) e += ch[i + j] * ch[i + j];
      if (e > best.energy) best = { start: i, energy: e };
    }
    return best.start;
  }

  function fftPeaks(frame, sr) {
    const n = 512;
    const re = new Float32Array(n);
    const im = new Float32Array(n);
    const len = Math.min(frame.length, n);
    for (let i = 0; i < len; i += 1) re[i] = frame[i];
    for (let k = 1; k < n / 2; k += 1) {
      let r = 0;
      let j = 0;
      for (let i = 0; i < n; i += 1) {
        r += re[i] * Math.cos((2 * Math.PI * k * i) / n);
        j -= re[i] * Math.sin((2 * Math.PI * k * i) / n);
      }
      im[k] = j;
      re[k] = r;
    }
    const peaks = [];
    for (let k = 3; k < n / 2 - 1; k += 1) {
      const f = (k * sr) / n;
      if (f < 180 || f > 3600) continue;
      const mag = Math.sqrt(re[k] * re[k] + im[k] * im[k]);
      const prev = Math.sqrt(re[k - 1] * re[k - 1] + im[k - 1] * im[k - 1]);
      const next = Math.sqrt(re[k + 1] * re[k + 1] + im[k + 1] * im[k + 1]);
      if (mag > prev && mag > next) peaks.push({ f, mag });
    }
    peaks.sort((a, b) => b.mag - a.mag);
    const picked = [];
    for (const p of peaks) {
      if (picked.some((q) => Math.abs(q.f - p.f) < 120)) continue;
      picked.push(p);
      if (picked.length >= 3) break;
    }
    picked.sort((a, b) => a.f - b.f);
    if (!picked[0] || !picked[1] || picked[1].f <= picked[0].f) return null;
    return {
      f1: Math.round(picked[0].f),
      f2: Math.round(picked[1].f),
      f3: picked[2] ? Math.round(picked[2].f) : null,
      method: "fft",
    };
  }

  function estimateFormantsFromBuffer(buffer) {
    if (!buffer?.length) return null;
    const sr = buffer.sampleRate;
    const start = findBestVoicedFrame(buffer);
    const len = Math.min(Math.floor(sr * 0.045), buffer.length - start);
    if (len < 256) return null;
    let frame = getMonoFrame(buffer, start, len);
    frame = hamming(preEmphasis(frame, 0.97));
    const order = 12;
    const r = autocorr(frame, order);
    if (r[0] < 1e-8) return fftPeaks(frame, sr);
    const a = levinson(r, order);
    const fm = lpcFormants(a, sr);
    if (!fm.f1 || !fm.f2 || fm.f1 < 150 || fm.f2 <= fm.f1) return fftPeaks(frame, sr);
    return {
      f1: Math.round(fm.f1),
      f2: Math.round(fm.f2),
      f3: fm.f3 ? Math.round(fm.f3) : null,
      method: "lpc",
    };
  }

  async function decodeBlob(blob) {
    const ab = await blob.arrayBuffer();
    const Ctx = window.AudioContext || window.webkitAudioContext;
    if (!Ctx) return null;
    const ctx = new Ctx();
    try {
      return await ctx.decodeAudioData(ab.slice(0));
    } finally {
      if (ctx.close) await ctx.close().catch(() => {});
    }
  }

  async function analyzeFormants(blob) {
    if (!blob?.size) return null;
    try {
      const buffer = await decodeBlob(blob);
      if (!buffer) return null;
      return estimateFormantsFromBuffer(buffer);
    } catch {
      return null;
    }
  }

  /** F1 alto → arriba en el gráfico; F2 ancho → derecha */
  function chartCoords(f1, f2) {
    const x = Math.max(4, Math.min(96, ((f2 - 700) / 2200) * 92 + 4));
    const y = Math.max(4, Math.min(96, ((820 - f1) / 620) * 88 + 4));
    return { x, y };
  }

  const CHART_VOWELS = [
    ["iː", 280, 2700], ["ɪ", 400, 2000], ["e", 500, 1900], ["æ", 700, 1700],
    ["ɑː", 730, 1100], ["ʌ", 640, 1200], ["ɔː", 570, 900], ["uː", 300, 870],
    ["ə", 500, 1500],
  ];

  function renderVowelChartSvg(opts = {}) {
    const { f1, f2, targetVowel, rivalVowel } = opts;
    const labels = CHART_VOWELS.map(([v, t1, t2]) => {
      const { x, y } = chartCoords(t1, t2);
      const on = v === targetVowel || v === rivalVowel;
      return `<text x="${x.toFixed(1)}" y="${(y + 3.5).toFixed(1)}" class="vowel-lbl${on ? " on" : ""}" text-anchor="middle">${v}</text>`;
    }).join("");
    let dots = "";
    if (targetVowel && VOWEL[targetVowel]) {
      const t = VOWEL[targetVowel];
      const { x, y } = chartCoords(t.f1, t.f2);
      dots += `<circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="5" class="vowel-target"/>`;
    }
    if (rivalVowel && VOWEL[rivalVowel]) {
      const t = VOWEL[rivalVowel];
      const { x, y } = chartCoords(t.f1, t.f2);
      dots += `<circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="4" class="vowel-rival"/>`;
    }
    if (f1 && f2) {
      const { x, y } = chartCoords(f1, f2);
      dots += `<circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="6" class="vowel-you"/>`;
    }
    return `<svg class="vowel-chart" viewBox="0 0 100 100" role="img" aria-label="Vowel chart F1 F2">
      <rect x="2" y="2" width="96" height="96" rx="8" class="vowel-chart-bg"/>
      <text x="50" y="98" class="vowel-axis" text-anchor="middle">F2 →</text>
      <text x="1" y="50" class="vowel-axis" text-anchor="middle" transform="rotate(-90 1 50)">F1 ↑</text>
      ${labels}${dots}
    </svg>`;
  }

  function plotFormantOnChart(f1, f2, pair) {
    const host = document.querySelector("#vowel-chart-live");
    if (!host || !window.PRON?.renderVowelChartSvg) return;
    const target = pair ? extractPrimaryVowel(pair.ipaA) : null;
    const rival = pair ? extractPrimaryVowel(pair.ipaB) : null;
    host.innerHTML = renderVowelChartSvg({ f1, f2, targetVowel: target, rivalVowel: rival });
  }

  window.PRON = {
    VOWEL,
    extractPrimaryVowel,
    vowelDist,
    scoreFormantPair,
    analyzeFormants,
    estimateFormantsFromBuffer,
    fftPeaks,
    decodeBlob,
    chartCoords,
    renderVowelChartSvg,
    plotFormantOnChart,
  };
})();
