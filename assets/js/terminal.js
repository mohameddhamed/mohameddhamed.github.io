/**
 * terminal.js — Race-free, abortable terminal playback engine for *mohamed.sys
 * Replays authentic M.Sc. thesis research telemetry on Project Loom concurrency.
 * Supports cancellation via AbortController and adheres to prefers-reduced-motion.
 */

(function () {
  const terminalElement = document.getElementById("terminal-content");
  const replayBtn = document.getElementById("terminal-replay-btn");
  if (!terminalElement) return;

  const script = [
    { type: "input", prompt: "mohamed@node-01:~$ ", text: "./replay-stratum-1-telemetry --mechanism-isolation --concurrency=10-vus", delay: 20 },
    { type: "output", text: "[0.00s] [INFO] OpenJDK 21.0.8 · Spring Boot 3.5.12 · Apple M1 · parallelism=1", cls: "t-muted", pause: 180 },
    { type: "output", text: "[0.20s] [TELEMETRY] Monitoring ForkJoinPool single carrier under 10 closed-loop VUs", cls: "t-muted", pause: 200 },
    { type: "output", text: "[0.55s] [TRIAL-1] /payments endpoint · lock=synchronized · critical_section=500ms", cls: "t-fg", pause: 220 },
    { type: "output", text: "[0.90s] [WARN] JFR Event: jdk.VirtualThreadPinned threshold=20ms duration=500ms", cls: "t-bad", pause: 240 },
    { type: "output", text: "[1.20s] [TELEMETRY] HotSpot continuation frozen: carrier thread captive in OS sleep", cls: "t-bad", pause: 260 },
    { type: "output", text: "[1.50s] [MEASURED] Steady-state throughput: 1.97 req/s | p50 latency: 4,966.8 ms", cls: "t-bad", pause: 450 },
    { type: "input", prompt: "mohamed@node-01:~$ ", text: "./patch-runtime --replace-synchronized-with-reentrant-locks", delay: 18 },
    { type: "output", text: "[1.80s] [TRIAL-2] /payments endpoint · lock=ReentrantLock · critical_section=500ms", cls: "t-fg", pause: 250 },
    { type: "output", text: "[2.10s] [OK  ] JFR: 0 jdk.VirtualThreadPinned events. Fiber unmounts via LockSupport.park().", cls: "t-ok", pause: 220 },
    { type: "output", text: "[2.40s] [MEASURED] Carrier unpinned. Steady-state throughput: 1.96 req/s | p50: 4,982.0 ms", cls: "t-ok", pause: 300 },
    { type: "output", text: "[2.70s] [FINDING] Decoupling proof: throughput delta is 0.20%. Serialized critical-section capacity bound = 1/0.500s = 2.0 req/s.", cls: "t-accent", pause: 400 },
    { type: "output", text: "[2.90s] [CONCLUSION] Unpinning carriers restores thread scheduling, but mutual exclusion preserves queueing.", cls: "t-accent", pause: 500 }
  ];

  let currentAbortController = null;

  function cancellableSleep(ms, signal) {
    return new Promise((resolve, reject) => {
      if (signal.aborted) return reject(new DOMException("Aborted", "AbortError"));
      const timer = setTimeout(() => resolve(), ms);
      signal.addEventListener("abort", () => {
        clearTimeout(timer);
        reject(new DOMException("Aborted", "AbortError"));
      }, { once: true });
    });
  }

  async function typeWriter(text, targetSpan, speed, signal) {
    for (let i = 0; i < text.length; i++) {
      if (signal.aborted) return;
      targetSpan.textContent += text[i];
      terminalElement.scrollTop = terminalElement.scrollHeight;
      await cancellableSleep(speed, signal);
    }
  }

  function appendFinalPrompt() {
    const finalPrompt = document.createElement("div");
    finalPrompt.className = "term-line";
    const promptSpan = document.createElement("span");
    promptSpan.className = "t-prompt";
    promptSpan.textContent = "mohamed@node-01:~$ ";
    finalPrompt.appendChild(promptSpan);

    const cursor = document.createElement("span");
    cursor.className = "term-cursor";
    finalPrompt.appendChild(cursor);

    terminalElement.appendChild(finalPrompt);
    terminalElement.scrollTop = terminalElement.scrollHeight;
  }

  async function runSession(signal) {
    try {
      terminalElement.innerHTML = "";
      for (const step of script) {
        if (signal.aborted) return;

        const line = document.createElement("div");
        line.className = "term-line " + (step.cls || "");

        if (step.type === "input") {
          const promptSpan = document.createElement("span");
          promptSpan.className = "t-prompt";
          promptSpan.textContent = step.prompt;
          line.appendChild(promptSpan);

          const cmdSpan = document.createElement("span");
          line.appendChild(cmdSpan);

          const cursor = document.createElement("span");
          cursor.className = "term-cursor";
          line.appendChild(cursor);

          terminalElement.appendChild(line);
          terminalElement.scrollTop = terminalElement.scrollHeight;
          await typeWriter(step.text, cmdSpan, step.delay, signal);
          cursor.remove();
        } else {
          line.textContent = step.text;
          terminalElement.appendChild(line);
          terminalElement.scrollTop = terminalElement.scrollHeight;
          await cancellableSleep(step.pause || 200, signal);
        }
      }

      if (signal.aborted) return;
      appendFinalPrompt();
    } catch (err) {
      if (err.name !== "AbortError") {
        console.error("Terminal session error:", err);
      }
    }
  }

  function startPlayback() {
    if (currentAbortController) {
      currentAbortController.abort();
    }

    const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (prefersReducedMotion) {
      terminalElement.innerHTML = "";
      script.forEach((step) => {
        const line = document.createElement("div");
        line.className = "term-line " + (step.cls || "");
        if (step.type === "input") {
          line.innerHTML = `<span class="t-prompt">${step.prompt}</span><span>${step.text}</span>`;
        } else {
          line.textContent = step.text;
        }
        terminalElement.appendChild(line);
      });
      appendFinalPrompt();
      return;
    }

    currentAbortController = new AbortController();
    runSession(currentAbortController.signal);
  }

  if (replayBtn) {
    replayBtn.addEventListener("click", () => {
      startPlayback();
    });
  }

  startPlayback();
})();
