(() => {
  "use strict";

  // ---- ORP rule -------------------------------------------------------------
  // Optimal Recognition Point: character index (0-based) within a word of the
  // given length. Never the first letter for words >= 3 letters.
  function orpIndex(len) {
    if (len <= 0) return 0;
    if (len === 1) return 0;
    if (len === 2) return 0;
    const idx = Math.floor(len * 0.38);
    return Math.max(1, Math.min(len - 1, idx));
  }

  // ---- Tokenizer ------------------------------------------------------------
  const WORD_RE = /[A-Za-z\u00C0-\u024F']+/g;

  const WRAP_CLASS = "scorp-w";
  const CHAR_CLASS = "scorp-c";

  // wrapper element -> original text it replaced (for restoration)
  const history = new WeakMap();
  const DEFAULT_STYLE = { color: "#d93025", bold: true };
  let currentStyle = Object.assign({}, DEFAULT_STYLE);

  // Applies the chosen color + bold emphasis to an ORP char element.
  function applyCharStyle(el, style) {
    el.style.color = style.color;
    el.style.fontWeight = style.bold ? "700" : "";
  }

  function isSkippedNode(node) {
    const tag = node.parentElement && node.parentElement.nodeName;
    if (tag) {
      const skip = /^(SCRIPT|STYLE|NOSCRIPT|PRE|CODE|TEXTAREA|INPUT|SELECT|OPTION|BUTTON|SVG|CANVAS|IFRAME)$/i;
      if (skip.test(tag)) return true;
    }
    // skip nodes already inside one of our wrappers
    let el = node.parentElement;
    while (el) {
      if (el.classList && el.classList.contains(WRAP_CLASS)) return true;
      el = el.parentElement;
    }
    return false;
  }

  function buildWrapper(original, style) {
    const wrapper = document.createElement("span");
    wrapper.className = WRAP_CLASS;

    let last = 0;
    WORD_RE.lastIndex = 0;
    let m;
    while ((m = WORD_RE.exec(original)) !== null) {
      const start = m.index;
      const word = m[0];

      if (start > last) {
        wrapper.appendChild(document.createTextNode(original.slice(last, start)));
      }

      const idx = orpIndex(word.length);
      const prefix = document.createElement("span");
      prefix.className = "scorp-char";
      prefix.textContent = word.slice(0, idx);
      wrapper.appendChild(prefix);

      const hi = document.createElement("span");
      hi.className = CHAR_CLASS;
      applyCharStyle(hi, style);
      hi.textContent = word[idx];
      wrapper.appendChild(hi);

      const suffix = document.createElement("span");
      suffix.className = "scorp-char";
      suffix.textContent = word.slice(idx + 1);
      wrapper.appendChild(suffix);

      last = start + word.length;
    }

    if (last < original.length) {
      wrapper.appendChild(document.createTextNode(original.slice(last)));
    }

    return wrapper;
  }

  function restyleChars(style) {
    document.querySelectorAll(`.${CHAR_CLASS}`).forEach((el) => {
      applyCharStyle(el, style);
    });
  }

  function highlightDocument(style) {
    currentStyle = Object.assign({}, currentStyle, style || {});
    const styleNow = currentStyle;
    // Collect text nodes first; replacing during the walk detaches the walker's
    // current node and ends iteration early.
    const nodes = [];
    const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
    let node;
    while ((node = walker.nextNode())) {
      if (!node.nodeValue || node.nodeValue.trim().length === 0) continue;
      if (isSkippedNode(node)) continue;
      nodes.push(node);
    }

    let count = 0;
    for (const textNode of nodes) {
      const original = textNode.nodeValue;
      const wrapper = buildWrapper(original, styleNow);
      if (!wrapper.hasChildNodes()) continue;
      textNode.parentNode.replaceChild(wrapper, textNode);
      history.set(wrapper, original);
      count++;
    }
    return count;
  }

  function restoreDocument() {
    let count = 0;
    document.querySelectorAll(`.${WRAP_CLASS}`).forEach((wrapper) => {
      const original = history.get(wrapper);
      const text = original !== undefined ? original : wrapper.textContent;
      wrapper.replaceWith(document.createTextNode(text));
      history.delete(wrapper);
      count++;
    });
    return count;
  }

  function rehighlightDocument() {
    // Only process wrappers we created? Simpler: force full rebuild.
    return highlightDocument(currentStyle);
  }

  function setStyle(style) {
    currentStyle = Object.assign({}, currentStyle, style || {});
    restyleChars(currentStyle);
  }

  function persistOrigin(enabled) {
    chrome.storage.local.get(["origins"], (data) => {
      let origins = data.origins || [];
      const host = location.hostname || "file";
      const idx = origins.indexOf(host);
      if (enabled && idx === -1) origins.push(host);
      if (!enabled && idx !== -1) origins.splice(idx, 1);
      chrome.storage.local.set({ origins });
    });
  }

  // ---- Messaging (from popup) ----------------------------------------------
  chrome.runtime.onMessage.addListener((msg, _sender, sendResponse) => {
    try {
      switch (msg && msg.type) {
        case "enable": {
          const count = highlightDocument(msg.style || {});
          persistOrigin(true);
          sendResponse({ ok: true, count });
          break;
        }
        case "disable": {
          const count = restoreDocument();
          persistOrigin(false);
          sendResponse({ ok: true, count });
          break;
        }
        case "rehighlight":
          sendResponse({ ok: true, count: highlightDocument(msg.style || {}) });
          break;
        case "setStyle":
          setStyle(msg.style || {});
          sendResponse({ ok: true });
          break;
        case "query":
          sendResponse({
            ok: true,
            enabled: document.querySelectorAll(`.${WRAP_CLASS}`).length > 0,
            host: location.hostname || "file"
          });
          break;
        default:
          sendResponse({ ok: false, error: "unknown message" });
      }
    } catch (e) {
      sendResponse({ ok: false, error: String(e) });
    }
    return true;
  });

  // ---- Auto-highlight on load if origin is enabled --------------------------
  chrome.storage.local.get(["origins", "color", "style"], (data) => {
    if (data.color && data.color.value) currentStyle.color = data.color.value;
    if (data.style && data.style.bold !== undefined) currentStyle.bold = data.style.bold;
    const origins = data.origins || [];
    const host = location.hostname || "file";
    if (origins.indexOf(host) !== -1) {
      highlightDocument(currentStyle);
    }
  });
})();
