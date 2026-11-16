/**
 * dashboard.js — Pure SVG interactive telemetry engine for M.Sc. Loom benchmark data
 * Zero external dependencies. High-contrast systems rendering.
 */

(function () {
  const container = document.getElementById("dashboard-chart-mount");
  if (!container) return;

  const dataset = {
    io: {
      title: "Workload A: Database & Socket I/O (10,000 Concurrent Clients)",
      description: "Comparing Tomcat Platform Threads, Pinned Virtual Threads (synchronized JDBC), and Patched Virtual Threads (ReentrantLock).",
      categories: ["Platform (Tomcat)", "Virtual (Pinned)", "Virtual (Patched)"],
      throughput: [2840, 184, 48210], // req/s
      p99: [420.0, 1420.0, 1.82],     // ms
      pinnedEvents: [0, 4812, 0],     // events
      units: { throughput: "req/s", p99: "ms", pinnedEvents: "events" }
    },
    mixed: {
      title: "Workload B: Mixed CPU / IO Pipeline (25,000 Concurrent Clients)",
      description: "JSON parsing + HTTP microservice fanout across 8 carrier threads.",
      categories: ["Platform (500 Pool)", "Virtual (Pinned)", "Virtual (Patched)"],
      throughput: [3120, 410, 41800],
      p99: [380.0, 960.0, 3.45],
      pinnedEvents: [0, 3120, 0],
      units: { throughput: "req/s", p99: "ms", pinnedEvents: "events" }
    },
    carriers: {
      title: "Workload C: Carrier Scaling & Parallelism (1 to 16 Carriers)",
      description: "Throughput scaling under unpinned ForkJoinPool scheduler across core counts.",
      categories: ["1 Carrier", "2 Carriers", "4 Carriers", "8 Carriers", "16 Carriers"],
      throughput: [7100, 14200, 26900, 48210, 52400],
      p99: [12.4, 6.8, 3.1, 1.82, 1.74],
      pinnedEvents: [0, 0, 0, 0, 0],
      units: { throughput: "req/s", p99: "ms", pinnedEvents: "events" }
    }
  };

  let activeWorkload = "io";
  let activeMetric = "throughput";

  function renderChart() {
    const data = dataset[activeWorkload];
    const values = data[activeMetric];
    const maxVal = Math.max(...values) * 1.15 || 1;
    const isP99 = activeMetric === "p99";
    const isBadMetric = activeMetric === "pinnedEvents" || isP99;

    const width = 760;
    const height = 300;
    const padding = { top: 30, right: 30, bottom: 50, left: 70 };
    const chartW = width - padding.left - padding.right;
    const chartH = height - padding.top - padding.bottom;

    const barWidth = Math.min(chartW / values.length * 0.55, 80);
    const gap = chartW / values.length;

    let barsSvg = "";
    values.forEach((val, idx) => {
      const h = (val / maxVal) * chartH;
      const x = padding.left + (idx * gap) + (gap - barWidth) / 2;
      const y = padding.top + chartH - h;

      let color = "#f5c542"; // default amber
      if (activeMetric === "throughput") {
        color = val === Math.max(...values) ? "#6bd98a" : (val < 1000 ? "#ff6b6b" : "#f5c542");
      } else if (activeMetric === "p99") {
        color = val === Math.min(...values) ? "#6bd98a" : (val > 500 ? "#ff6b6b" : "#f5c542");
      } else if (activeMetric === "pinnedEvents") {
        color = val > 0 ? "#ff6b6b" : "#6bd98a";
      }

      const formattedVal = val.toLocaleString() + " " + data.units[activeMetric];

      barsSvg += `
        <g class="chart-bar-group" tabindex="0">
          <rect x="${x}" y="${y}" width="${barWidth}" height="${h}" fill="${color}" rx="3" opacity="0.9">
            <title>${data.categories[idx]}: ${formattedVal}</title>
          </rect>
          <!-- Value Label on Top of Bar -->
          <text x="${x + barWidth / 2}" y="${y - 8}" fill="${color}" font-family="var(--font-mono)" font-size="11" font-weight="600" text-anchor="middle">
            ${val.toLocaleString()}
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
      gridLinesSvg += `
        <line x1="${padding.left}" y1="${y}" x2="${width - padding.right}" y2="${y}" stroke="#23272e" stroke-dasharray="3,3"/>
        <text x="${padding.left - 10}" y="${y + 4}" fill="#8a9099" font-family="var(--font-mono)" font-size="10" text-anchor="end">
          ${Math.round(stepVal).toLocaleString()}
        </text>
      `;
    }

    container.innerHTML = `
      <div style="margin-bottom: 14px;">
        <div style="font-family: var(--font-mono); font-size: 14px; font-weight: 700; color: var(--fg-bright);">${data.title}</div>
        <div style="font-size: 13px; color: var(--muted); margin-top: 2px;">${data.description}</div>
      </div>
      <svg viewBox="0 0 ${width} ${height}" class="chart-svg" style="background: var(--term-bg); border: 1px solid var(--border); border-radius: 6px;">
        ${gridLinesSvg}
        <!-- X and Y Axes -->
        <line x1="${padding.left}" y1="${padding.top}" x2="${padding.left}" y2="${padding.top + chartH}" stroke="#23272e" stroke-width="1"/>
        <line x1="${padding.left}" y1="${padding.top + chartH}" x2="${width - padding.right}" y2="${padding.top + chartH}" stroke="#23272e" stroke-width="1"/>
        ${barsSvg}
      </svg>
      <div style="display: flex; justify-content: space-between; align-items: center; margin-top: 10px; font-family: var(--font-mono); font-size: 11px; color: var(--muted);">
        <span>Unit: <strong>${data.units[activeMetric]}</strong></span>
        <span>Environment: <strong>Bare Metal EPYC 7763 (Ubuntu 22.04 LTS, JDK 21.0.5)</strong></span>
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
