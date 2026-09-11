# ⚡ The Scriber Experience — Universal Interactive OBS Donate Widget

An interactive, multistream-compatible on-stream donation widget and OBS dock customizer for **The Scriber Experience**, built to perfectly match the visual aesthetic of the `tse-landing-page` project.

![Aesthetic](https://img.shields.io/badge/Aesthetic-Cyber%20Glassmorphism-00f2ff)
![OBS Ready](https://img.shields.io/badge/OBS-Browser%20Source%20%26%20Custom%20Dock-8b5cf6)
![Multistream](https://img.shields.io/badge/Multistream-Twitch%20|%20YouTube%20|%20Kick%20|%20Velora%20|%20BEAM-ec4899)

---

## ✨ Features

- 🎨 **Faithful TSE Aesthetic**: Glassmorphism (`backdrop-filter: blur(14px)`), cyber glow gradient borders (`#00f2ff`, `#3b82f6`, `#8b5cf6`, `#ec4899`), `Aclonica` and `Orbitron` fonts, animated glowing buttons (`color-1` through `color-9`).
- 🌐 **Multistream Compatible**: Shows active multistream channel indicators with live pulse animations across **Twitch**, **Velora**, **YouTube**, **Kick**, and **BEAM**.
- 💳 **Universal Donation Support**:
  - **💸 Cash App**: `$renzoscriber`
  - **☕ Buy Me a Coffee**: `renzoscriber`
  - **📦 Amazon Wishlist**: `TSE Wishlist`
  - **🌊 TSE Portal**: `tse-landing-page`
- 📱 **Dynamic Crisp QR Code Generator**: Renders glowing SVG QR codes directly in OBS for mobile viewers scanning TV/PC screens (zero external network dependencies).
- 🎮 **OBS Interactive Browser Source Ready**: Supports OBS Studio's right-click **Interact** mode to click buttons, switch tabs, toggle QR overlays, and copy URLs with feedback toasts.
- 🎯 **Stream Donation Goal Tracker**: Animated glowing goal progress bar with real-time target adjustments and top donor highlights.
- 🔊 **Built-in Web Audio Alert Synthesizer**: Retro/cyber cheer sound synthesis via Web Audio API (no missing audio assets).
- 🎉 **Particle Confetti Celebrations**: Full-screen cyber particle bursts on cheers/donations.
- 🔄 **5 Overlay Layout Modes**: Compact Pill, QR Card, Goal HUD, Marquee Ticker, and Interactive Control Dock.
- 🚀 **Live Webhook & Chat Bot Integration**: Local Server-Sent Events (SSE) and `/api/cheer` REST endpoints to trigger on-screen alerts from chat bots (`!donate` command) or payment webhooks.

---

## 🚀 Quickstart

### 1. Start the Local Server
```bash
npm start
```
The widget will be running at `http://localhost:3000`.

### 2. Run Tests
```bash
npm test
```

---

## 🎬 How to Add to OBS Studio

### Option A: As an On-Screen Overlay (Browser Source)

1. Open **OBS Studio**.
2. In the **Sources** dock, click **`+`** and choose **`Browser`**.
3. Name it `TSE Donate Widget`.
4. Configure the Browser Source settings:
   - **URL**: `http://localhost:3000` (or with query parameters below)
   - **Width**: `500` (or `960` for Ticker mode)
   - **Height**: `200` (or `400` for QR Card mode)
   - **Custom CSS**: leave blank (widget has built-in transparent background)
   - Check ✅ **Shutdown source when not visible**
   - Check ✅ **Refresh browser when scene becomes active**
5. Click **OK**.
6. **Interacting with the Widget**: Right-click the Browser Source in OBS and select **`Interact`** to click tabs, toggle the QR code, copy links, or test alerts.

---

### Option B: As a Custom OBS Dock (Control Panel)

1. In OBS Studio top menu, click **`Docks`** ➔ **`Custom Browser Docks...`**
2. In **Dock Name**, enter: `TSE Donate Control`
3. In **URL**, enter: `http://localhost:3000/?mode=dock`
4. Click **Apply**.
5. Dock the new panel anywhere inside OBS Studio! You can now adjust goal targets, test cheers with confetti, and launch platform channels with 1 click.

---

## ⚙️ URL Query Parameters Cheat Sheet

Customize the overlay directly via the Browser Source URL:

| Parameter | Values | Default | Description |
|---|---|---|---|
| `mode` | `compact`, `card`, `goal`, `ticker`, `dock` | `compact` | Layout mode for overlay or dock |
| `target` | `cashapp`, `bmac`, `amazon`, `landing` | `cashapp` | Initial active donation method |
| `platform`| `all`, `twitch`, `velora`, `youtube`, `kick`, `beam` | `all` | Highlighted multistream platform |
| `scale` | `0.8`, `1.0`, `1.2`, `1.5`, etc. | `1` | Widget display scale |
| `align` | `top-left`, `top-right`, `bottom-left`, `bottom-right`, `center` | `top-left` | Alignment in viewport |
| `goal` | Number (e.g. `100`, `250`) | `100` | Target donation goal amount in $ |
| `current` | Number (e.g. `45`, `80`) | `45` | Currently raised donation amount in $ |
| `title` | Text (URL encoded) | `Stream Upgrade Goal` | Goal title text |
| `sound` | `true`, `false` | `true` | Enable/disable audio chimes |
| `autoRotate` | `true`, `false` | `false` | Automatically cycle donation targets |
| `interval` | Number (in seconds) | `12` | Rotation interval between methods |
| `testMode` | `true`, `false` | `false` | Shows background for standalone preview |

### Example Preset URLs for OBS:
- **Compact Floating Pill (Top-Right)**:
  `http://localhost:3000/?mode=compact&align=top-right&scale=1.1`
- **On-Screen Glowing QR Card (Bottom-Right)**:
  `http://localhost:3000/?mode=card&align=bottom-right`
- **Goal Progress HUD (Bottom-Left)**:
  `http://localhost:3000/?mode=goal&align=bottom-left&goal=150&current=75&title=New%20Mic%20Fund`
- **Full Width Stream Ticker (Bottom)**:
  `http://localhost:3000/?mode=ticker&align=center`

---

## ⚡ Triggering Live Alerts (Webhooks & Chat Bots)

You can trigger on-stream cheer alert animations and particle confetti from any local script, webhook, or chat bot command:

### HTTP POST Request:
```bash
curl -X POST http://localhost:3000/api/cheer \
  -H "Content-Type: application/json" \
  -d '{"donor":"Katnip the Brave","amount":"$20.00","message":"Hardcore mode enabled! 🚀"}'
```

### HTTP GET Request (Quick Browser / Stream Deck Trigger):
```
http://localhost:3000/api/cheer?donor=Alleria+the+Best&amount=$50.00&message=For+the+Horde!
```

---

## 📂 Project Structure

```
scriber-donate-widget/
├── public/
│   ├── assets/
│   │   └── images/          # TSE logos, avatars & background
│   ├── index.html           # Main OBS widget & layout modes
│   ├── styles.css           # Glassmorphism, animations & TSE branding
│   ├── widget.js            # Controller, state machine & Web Audio synth
│   ├── qr-generator.js      # Zero-dependency SVG QR code generator
│   └── confetti.js          # Particle cheer explosion engine
├── test/
│   └── widget.test.js       # Automated test suite
├── server.js                # Static file server & SSE / REST alert bridge
├── index.js                 # Entry point
└── package.json
```

---

## 📜 License & Copyright

© 2025–2026 **Eigenscribe Inc.** / **The Scriber Experience**. All rights reserved.
