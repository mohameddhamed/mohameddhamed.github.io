/**
 * terminal.js — Race-free, abortable terminal playback engine for *mohamed.sys
 * Supports cancellation via AbortController and adheres to prefers-reduced-motion.
 */

(function () {
  const terminalElement = document.getElementById("terminal-content");
  const replayBtn = document.getElementById("terminal-replay-btn");
  if (!terminalElement) return;

  const script = [
    { type: "input", prompt: "mohamed@node-01:~$ ", text: "./benchmark-loom --workload=http-io --concurrency=10000 --carrier-threads=8", delay: 24 },
    { type: "output", text: "[0.00s] [INFO] Initializing ForkJoinPool carrier pool (parallelism=8, Java 21 LTS)", cls: "t-muted", pause: 180 },
    { type: "output", text: "[0.15s] [RUN ] Spawning 10,000 concurrent Virtual Threads (io_wait=45ms)...", cls: "t-fg", pause: 220 },
    { type: "output", text: "[0.32s] [TELEMETRY] Attached JFR Flight Recorder: [jdk.VirtualThreadPinned, jdk.CPULoad]", cls: "t-muted", pause: 250 },
    { type: "output", text: "[0.70s] [WARN] JFR Event: jdk.VirtualThreadPinned duration=42.1ms carrier=ForkJoinPool-1-worker-3", cls: "t-bad", pause: 220 },
    { type: "output", text: "[0.85s] [WARN] Synchronized monitor on JDBC connection held during blocking socket read!", cls: "t-bad", pause: 260 },
    { type: "output", text: "[1.10s] [WARN] Carrier pool saturation: 8/8 carriers pinned. Throughput: 184 req/s | P99: 1,420 ms", cls: "t-bad", pause: 500 },
    { type: "input", prompt: "mohamed@node-01:~$ ", text: "./patch-runtime --replace-synchronized-with-reentrant-locks", delay: 20 },
    { type: "output", text: "[1.70s] [APPLY] Replaced synchronized blocks with java.util.concurrent.locks.ReentrantLock", cls: "t-muted", pause: 250 },
    { type: "output", text: "[2.00s] [RUN ] Re-running 10,000 concurrent Virtual Threads with unpinned carriers...", cls: "t-fg", pause: 280 },
    { type: "output", text: "[2.30s] [OK  ] 0 carrier threads pinned. Non-blocking unpark on epoll readiness active.", cls: "t-ok", pause: 220 },
    { type: "output", text: "[2.60s] [OK  ] Throughput: 48,210 req/s (+261x) | P99: 1.82 ms | Heap: 34.2 MB", cls: "t-ok", pause: 300 },
    { type: "output", text: "[2.80s] [RESULT] Benchmark completed. Pinned P99=1420ms -> Unpinned P99=1.82ms (780x latency drop).", cls: "t-accent", pause: 500 }
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
      if (err.name !== "AbortError") console.error(err);
    }
  }

  function renderStaticSession() {
    terminalElement.innerHTML = "";
    script.forEach(step => {
      const line = document.createElement("div");
      line.className = "term-line " + (step.cls || "");
      if (step.type === "input") {
        const promptSpan = document.createElement("span");
        promptSpan.className = "t-prompt";
        promptSpan.textContent = step.prompt;
        line.appendChild(promptSpan);

        const cmdSpan = document.createElement("span");
        cmdSpan.textContent = step.text;
        line.appendChild(cmdSpan);
      } else {
        line.textContent = step.text;
      }
      terminalElement.appendChild(line);
    });
    appendFinalPrompt();
  }

  function start() {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      renderStaticSession();
      return;
    }
    if (currentAbortController) {
      currentAbortController.abort();
    }
    currentAbortController = new AbortController();
    runSession(currentAbortController.signal);
  }

  if (replayBtn) {
    replayBtn.addEventListener("click", () => {
      start();
    });
  }

  // React to system reduced motion toggle
  const motionQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
  if (motionQuery.addEventListener) {
    motionQuery.addEventListener("change", () => start());
  } else if (motionQuery.addListener) {
    motionQuery.addListener(() => start());
  }

  start();
})();
