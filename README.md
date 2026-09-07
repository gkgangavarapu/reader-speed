# Reader Speed

A fast, private browser extension that highlights each word's **Optimal
Recognition Point (ORP)** — the character your eyes should land on — to cut
subvocalization and help you read with less effort. Built on Manifest V3 for
Chrome, Edge, Brave and other Chromium browsers.

## Install

1. Open `chrome://extensions` (or `edge://extensions`).
2. Enable **Developer mode**.
3. **Load unpacked** and select this folder.

## Usage

Click the extension icon, then **Enable on this page**. Reader Speed highlights
the ORP letter of each word in bold color — for `the`, the `h`; for longer words,
the letter roughly 38% in (never the first letter). Per-site settings, color and
emphasis are remembered locally.

- **Enable / Disable** — per site, persisted across reloads.
- **Re-highlight** — re-processes dynamically loaded content.
- **Color / Bold** — choose from 8 presets.

## Permissions & privacy

`storage` only, for remembering your preferences. No host or tab access, no
remote code, and no data collected, stored or transmitted.

## Project

```
manifest.json    Manifest V3 config
content.js       Highlight engine (tokenizer + ORP rule)
popup.html       Popup UI
popup.js         Popup logic
icons/           Extension icons
_locales/        Localization
store_assets/    Store listing images (logo, screenshots, promo tiles)
```

Packaged releases are in `releases/`.

## License

[MIT](LICENSE)

---

[Report a bug](https://github.com/gkgangavarapu/reader-speed/issues) ·
[Source](https://github.com/gkgangavarapu/reader-speed)
