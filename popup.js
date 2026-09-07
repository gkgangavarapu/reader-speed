(() => {
  "use strict";

  const toggleBtn = document.getElementById("toggle");
  const rehighBtn = document.getElementById("rehighlight");
  const swatchesEl = document.getElementById("swatches");
  const boldCb = document.getElementById("bold");
  const pvColor = document.getElementById("pvColor");
  const hostEl = document.getElementById("host");
  const noteEl = document.getElementById("note");
  const pinTip = document.getElementById("pintip");
  const pinTipClose = document.getElementById("pintip-close");

  const PIN_TIP_KEY = "pinTipSeen";
  chrome.storage.local.get([PIN_TIP_KEY], (d) => {
    if (d[PIN_TIP_KEY]) pinTip.style.display = "none";
  });
  pinTipClose.addEventListener("click", () => {
    pinTip.style.display = "none";
    chrome.storage.local.set({ [PIN_TIP_KEY]: true });
  });

  const DEFAULT_COLOR = "#d93025";
  const PRESET_COLORS = [
    "#d93025", // red (default)
    "#1a73e8", // blue
    "#188038", // green
    "#f9ab00", // amber
    "#9334e6", // purple
    "#00838f", // teal
    "#ea8600", // orange
    "#c5221f"  // brick
  ];

  let tab = null;
  let enabled = false;
  let style = { color: DEFAULT_COLOR, bold: true };

  function renderSwatches() {
    swatchesEl.innerHTML = "";
    PRESET_COLORS.forEach((c) => {
      const btn = document.createElement("button");
      btn.className = "swatch";
      btn.style.background = c;
      btn.title = c;
      btn.dataset.color = c;
      swatchesEl.appendChild(btn);
    });
  }

  function updatePreview() {
    pvColor.style.color = style.color;
    pvColor.style.fontWeight = style.bold ? "700" : "";
    toggleBtn.style.setProperty("--acc", style.color);
    Array.prototype.forEach.call(swatchesEl.children, (el) => {
      el.classList.toggle("sel", el.dataset.color.toLowerCase() === style.color.toLowerCase());
    });
  }

  async function getState() {
    const [activeTab] = await chrome.tabs.query({ active: true, currentWindow: true });
    tab = activeTab;
    if (!tab) return;

    const data = await chrome.storage.local.get(["color", "style"]);
    const stored = data.style || {};
    style.color = (data.color && data.color.value) || style.color;
    style.bold = stored.bold !== undefined ? stored.bold : style.bold;
    boldCb.checked = style.bold;
    renderSwatches();
    updatePreview();

    // Ask the content script for its state; its absence means page isn't scriptable.
    const res = await message({ type: "query" });
    if (res && res.ok) {
      enabled = res.enabled;
      hostEl.textContent = res.host;
    } else {
      toggleBtn.disabled = true;
      rehighBtn.disabled = true;
      toggleBtn.classList.add("muted");
      hostEl.textContent = "";
      noteEl.textContent = "Not available on this page type (e.g. browser-internal or store pages).";
    }
    render();
  }

  function render() {
    toggleBtn.classList.toggle("on", enabled);
    toggleBtn.classList.toggle("off", !enabled);
    toggleBtn.textContent = enabled ? "Disable on this page" : "Enable on this page";
  }

  async function message(msg) {
    try {
      return await chrome.tabs.sendMessage(tab.id, msg);
    } catch (e) {
      return { ok: false, error: "no-receiver" };
    }
  }

  async function persistStyle() {
    await chrome.storage.local.set({
      color: { value: style.color },
      style: { bold: style.bold }
    });
  }

  toggleBtn.addEventListener("click", async () => {
    if (enabled) {
      const res = await message({ type: "disable" });
      if (res && res.ok) enabled = false;
      else noteEl.textContent = "Could not disable content script; try reloading the page.";
    } else {
      const res = await message({ type: "enable", style: { ...style } });
      if (res && res.ok) {
        enabled = true;
      } else if (res && res.error === "no-receiver") {
        noteEl.textContent = "Page must be reloaded before highlighting (new tab already does).";
      } else {
        noteEl.textContent = "Could not enable; try reloading the page.";
      }
    }
    render();
  });

  rehighBtn.addEventListener("click", async () => {
    const res = await message({ type: "rehighlight", style: { ...style } });
    noteEl.textContent = res && res.ok ? `Re-highlighted ${res.count} text block(s).` : "Nothing to re-highlight.";
  });

  swatchesEl.addEventListener("click", async (e) => {
    const btn = e.target.closest(".swatch");
    if (!btn) return;
    style.color = btn.dataset.color;
    updatePreview();
    await persistStyle();
    await pushStyle();
  });

  async function pushStyle() {
    const res = await message({ type: "setStyle", style: { color: style.color, bold: style.bold } });
    if (enabled && !(res && res.ok)) {
      noteEl.textContent = "Style saved. It will apply when you re-enable.";
    }
  }

  boldCb.addEventListener("change", async () => {
    style.bold = boldCb.checked;
    updatePreview();
    await persistStyle();
    await pushStyle();
  });

  getState();
})();
