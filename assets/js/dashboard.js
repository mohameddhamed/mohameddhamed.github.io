/**
 * dashboard.js — Pure SVG interactive telemetry engine for M.Sc. Loom benchmark data
 * Zero external dependencies. High-contrast systems rendering.
 */

(function () {
  const container = document.getElementById("dashboard-chart-mount");
  if (!container) return;

  const dataset = {
    java21: {
      title: "Stratum 1 · Java 21.0.8 lock comparison",
      description: "October 15, 2026 · 10 virtual users · One carrier · 500 ms payment operation",
      categories: ["synchronized", "ReentrantLock"],
      throughput: [1.967, 1.956],
      p50: [4966.8, 4982.0],
      pinnedEvents: [108, 0]
    },
    java24: {
      title: "Stratum 2 · Java 24.0.2 lock comparison",
      description: "October 15, 2026 · 10 virtual users · One carrier · 500 ms payment operation",
      categories: ["synchronized", "ReentrantLock"],
      throughput: [1.967, 1.967],
      p50: [4944.67, 4952.60],
      pinnedEvents: [0, 0]
    },
    persistence: {
      title: "Stratum 8 · Java 21.0.12.1 connection-held ablation",
      description: "November 10, 2026 · 50 virtual users · 300 ms connection hold",
      categories: ["Pool size 1", "Pool size 10"],
      throughput: [3.27, 32.60],
      p50: [15123.0, 1431.3],
      pinnedEvents: [0, 0]
    }
  };

  const units = { throughput: "req/s", p50: "ms", pinnedEvents: "events per run" };

  let activeWorkload = "java21";
  let activeMetric = "throughput";

  function renderChart() {
    const data = dataset[activeWorkload];
    const values = data[activeMetric];
    const rawMax = Math.max(...values);
    const maxVal = rawMax === 0 ? 4 : rawMax * 1.15;

    const width = 760;
    const height = 300;
    const padding = { top: 30, right: 30, bottom: 50, left: 70 };
    const chartW = width - padding.left - padding.right;
    const chartH = height - padding.top - padding.bottom;

    const barWidth = Math.min(chartW / values.length * 0.55, 80);
    const gap = chartW / values.length;

    let barsSvg = "";
    values.forEach((val, idx) => {
      const rawH = (val / maxVal) * chartH;
      const h = val === 0 ? 2 : rawH;
      const x = padding.left + (idx * gap) + (gap - barWidth) / 2;
      const y = padding.top + chartH - h;

      const color = activeMetric === "pinnedEvents" && val > 0 ? "#ff6b6b" : "#f5c542";
      const formattedVal = val.toLocaleString(undefined, { maximumFractionDigits: 3 });

      barsSvg += `
        <g class="chart-bar-group" tabindex="0" role="graphics-symbol" aria-label="${data.categories[idx]}: ${formattedVal} ${units[activeMetric]}">
          <rect x="${x}" y="${y}" width="${barWidth}" height="${h}" fill="${color}" rx="3" opacity="0.9">
            <title>${data.categories[idx]}: ${formattedVal} ${units[activeMetric]}</title>
          </rect>
          <!-- Value Label on Top of Bar -->
          <text x="${x + barWidth / 2}" y="${y - 8}" fill="${color}" font-family="var(--font-mono)" font-size="11" font-weight="600" text-anchor="middle">
            ${formattedVal}
          </text>
          <!-- Category Label under X-Axis -->
          <text x="${x + barWidth / 2}" y="${padding.top + chartH + 24}" fill="#8a9099" font-family="var(--font-mono)" font-size="11" text-anchor="middle">
            ${data.categories[idx]}
          </text>
        </g>
      `;
    });

    // Horizontal grid lines
    let gridLinesSvg = "";
    const gridSteps = 4;
    for (let i = 0; i <= gridSteps; i++) {
      const stepVal = (maxVal / gridSteps) * i;
      const y = padding.top + chartH - (i * (chartH / gridSteps));
      const tickLabel = rawMax === 0
        ? String(i)
        : (maxVal < 10 ? stepVal.toFixed(1) : Math.round(stepVal).toLocaleString());
      gridLinesSvg += `
        <line x1="${padding.left}" y1="${y}" x2="${width - padding.right}" y2="${y}" stroke="#23272e" stroke-dasharray="3,3"/>
        <text x="${padding.left - 10}" y="${y + 4}" fill="#8a9099" font-family="var(--font-mono)" font-size="10" text-anchor="end">
          ${tickLabel}
        </text>
      `;
    }

    container.innerHTML = `
      <div style="margin-bottom: 14px;">
        <div style="font-family: var(--font-mono); font-size: 14px; font-weight: 700; color: var(--fg-bright);">${data.title}</div>
        <div style="font-size: 13px; color: var(--muted); margin-top: 2px;">${data.description}</div>
      </div>
      <svg role="img" aria-label="${data.title}" viewBox="0 0 ${width} ${height}" class="chart-svg" style="background: var(--term-bg); border: 1px solid var(--border); border-radius: 6px;">
        ${gridLinesSvg}
        <!-- X and Y Axes -->
        <line x1="${padding.left}" y1="${padding.top}" x2="${padding.left}" y2="${padding.top + chartH}" stroke="#23272e" stroke-width="1"/>
        <line x1="${padding.left}" y1="${padding.top + chartH}" x2="${width - padding.right}" y2="${padding.top + chartH}" stroke="#23272e" stroke-width="1"/>
        ${barsSvg}
      </svg>
      <div style="display: flex; justify-content: space-between; align-items: center; margin-top: 10px; font-family: var(--font-mono); font-size: 11px; color: var(--muted);">
        <span>Unit: <strong>${units[activeMetric]}</strong></span>
        <span>Environment: <strong>Apple M1 · 8 GB · macOS</strong></span>
      </div>
    `;
  }

  // Bind controls
  const workloadBtns = document.querySelectorAll("[data-workload]");
  workloadBtns.forEach(btn => {
    btn.addEventListener("click", () => {
      workloadBtns.forEach(b => b.classList.remove("active"));
      btn.classList.add("active");
      activeWorkload = btn.getAttribute("data-workload");
      renderChart();
    });
  });

  const metricBtns = document.querySelectorAll("[data-metric]");
  metricBtns.forEach(btn => {
    btn.addEventListener("click", () => {
      metricBtns.forEach(b => b.classList.remove("active"));
      btn.classList.add("active");
      activeMetric = btn.getAttribute("data-metric");
      renderChart();
    });
  });

  renderChart();
})();
