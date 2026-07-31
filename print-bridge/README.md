# Receipt Booth — WiFi Print Bridge

The bridge is a small Node.js script that runs on your Mac. It does two things:

1. **Serves the kiosk app** over HTTP on your local network so the iPad can open it
2. **Forwards print jobs** to the MUNBYN P905 over TCP port 9100

> **Why run this instead of using the Replit URL?**  
> Browsers block `fetch()` calls from HTTPS pages to HTTP endpoints (mixed-content policy). Because the bridge serves the app over plain HTTP, the iPad and the print endpoint share the same origin — no restrictions apply.

## Requirements

- Node.js 16+ on your Mac (`node --version` to check — it's pre-installed on most Macs)
- Your Mac and the P905 on the **same WiFi network**
- No `npm install` needed — uses only Node built-in modules

---

## Step 1 — Build the kiosk app

Run this once from the **project root** (the folder containing `artifacts/`):

```bash
PORT=3001 BASE_PATH=/ pnpm --filter @workspace/receipt-booth build
```

This writes the app to `artifacts/receipt-booth/dist/public/`. Only rebuild when you update the app.

---

## Step 2 — Start the bridge

```bash
node print-bridge/bridge.js
```

You'll see something like:

```
  ┌────────────────────────────────────────────────────────┐
  │        Receipt Booth — WiFi Print Bridge               │
  ├────────────────────────────────────────────────────────┤
  │  Open on iPad →  http://192.168.1.55:3001              │
  │  App files    →  ✓ built app is ready                  │
  └────────────────────────────────────────────────────────┘

  Printer IP is set per print job from the app Settings.
  Waiting for print jobs… (Ctrl+C to stop)
```

Leave this Terminal window open while using the kiosk.

---

## Step 3 — Open the app on the iPad

In Safari on the iPad, go to the URL shown in the bridge startup output:

```
http://192.168.1.55:3001
```

(Use your actual Mac IP — it's printed for you each time you start the bridge.)

> **Do not** use the Replit preview URL (`https://...replit.dev`). That URL is HTTPS and the bridge is HTTP; they will not be able to communicate.

---

## Step 4 — Configure the printer IP

In the kiosk app on the iPad:

1. Go to **Settings → Thermal Printer → WiFi Printer (MUNBYN P905)**
2. Enter the **Printer IP** — the P905's IP address on your local network

**How to find the printer's IP:**
- Open the MUNBYN app on any device → network/printer settings, or
- Check your router's admin page (usually `192.168.1.1`) and look for a connected device named MUNBYN

Leave **Bridge URL** blank — print requests automatically go to the same address you opened the app from, which is already the bridge. You only need to fill in Bridge URL if the bridge is running on a different machine than the one serving the app.

---

## Optional: protect the bridge with a secret token

To prevent any other device on your network from sending arbitrary print jobs, open `bridge.js` and set:

```js
const SECRET = 'your-secret-phrase';
```

Then add the same phrase as **Bridge Secret** in the app's Settings (if a Bridge Secret field is available). The bridge will reject any request that doesn't include the matching token.

---

## Troubleshooting

| Problem | Fix |
|---|---|
| Bridge startup shows "not built" | Run the build command in Step 1 |
| iPad shows "site can't be reached" | Verify the IP shown at bridge startup; ensure Mac and iPad are on the same WiFi |
| macOS firewall prompt | Allow Node.js to accept incoming connections |
| Print fails — "Invalid IP" | Enter a valid IPv4 address in Settings → Printer IP |
| Print fails — "TCP timed out" | Check the printer IP is correct and the P905 is powered on and connected to WiFi |
| Print output is garbled | Confirm P905 is set to 80mm paper mode in the MUNBYN app |
