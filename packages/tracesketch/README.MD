# traceSketch

Local-first API tracing, replay, regression testing, and real-time pair debugging for Node.js.

Capture real requests, replay them anywhere, turn fixed bugs into permanent regression tests, and debug together with another developer in real time — all local-first by default.

```bash
npm install tracesketch
```

---

## The Problem

An API fails in production. You get a 500 error and nothing else. You don't know what the exact request was, where it failed, or how to reproduce it safely. So you guess — or you're stuck saying "it works on my machine" with no way to show the other developer what actually happened.

## What traceSketch Does

```
Request comes in → automatically captured → you see exactly where time was spent
        ↓
Click Replay → the exact same request runs again, anywhere you choose
        ↓
Fix the bug → confirm with another replay → save it as a regression test
        ↓
That bug is now permanently guarded
```

Everything runs locally by default. No account, no cloud, no signup — except when you explicitly choose to debug together with another developer (see Relay below).

---

## Quick Start

### 1. Add the middleware to your app

```javascript
import express from 'express';
import { traceSketch } from 'tracesketch';

const app = express();

app.use(express.json());   // must come first
app.use(traceSketch());     // then this

app.get('/api/hello', (req, res) => {
  res.json({ message: "hello" });
});

app.listen(3000);
```

Every request your app receives is now automatically captured. No extra code per route.

### 2. Start the collector and dashboard

```bash
npx tracesketch start
```

This starts:
- The local storage server — `http://localhost:4000`
- The dashboard — `http://localhost:8470`

> **Note:** Ports `4000` and `8470` are reserved by traceSketch. Please choose a different port for your own application.

### 3. Use your app normally

Hit your routes however you normally would. Every request shows up in the dashboard automatically.

---

## Dashboard

| Section | What it shows |
|---|---|
| **Traces** | Every request — method, path, status code, duration |
| **Trace Detail** | Full breakdown of one request, including headers and body |
| **Replay** | Re-run any captured request against a target URL |
| **Regression Tests** | Saved checks you can re-run anytime to confirm a bug hasn't returned |
| **Relay** | Real-time pair debugging with another developer (see below) |

### Replaying a request

1. Open any trace
2. Click **Replay**
3. Enter a target base URL (e.g. `http://localhost:3000`)
4. Compare original vs replay — status code and duration, side by side

### Saving a regression test

1. Pick a trace you've fixed
2. Click **Save as Regression Test**, set the expected status code
3. Click **Run** anytime — instant PASS or FAIL

---

## Relay — Real-Time Pair Debugging

Sometimes "it works on my machine" needs a second pair of eyes. Relay lets two developers connect and debug together in real time, without setting up screen share or a call.

### How it works

1. One developer clicks **Create Group** in the Relay tab — gets a short 4-character code (e.g. `KLSP`)
2. The other developer clicks **Join Group** and enters that code
3. Both are now connected in a live session, limited to 2 developers per group

### Message types

The Relay chat supports four kinds of messages, each handled differently:

| Type | Purpose | Persistence |
|---|---|---|
| **Note** | A plain text message between developers | Saved to the relay session (expires with the session) |
| **Trace Share** | Share a specific captured trace with the other developer | Saved to the relay session, and a reference is kept in your local history |
| **Replay Result** | Share the outcome of a replay you just ran | Saved to the relay session, and a reference is kept in your local history |
| **Crazy** | An ephemeral, off-the-record message — brainstorming, venting, anything you don't want recorded anywhere | **Never saved anywhere.** Delivered live over the socket connection only, and gone the instant it's sent. Not stored in the relay database, not stored locally. |

### What's stored where

- **Relay session data** (group code, who's in it, Note/Trace Share/Replay Result messages) lives on a lightweight relay server for **6 hours**, then is automatically and permanently deleted.
- **Crazy messages** are never written to any database, at any point — they exist only as a live broadcast to whoever is connected at that moment.
- **Your local machine** keeps a permanent record of only the meaningful parts — which traces were shared and which replay results were shared during a session — in your own local database, which you can view or delete anytime. Casual chat (Notes, Crazy messages) never ends up here; only `trace_share` and `replay_result` entries are kept locally, so your history stays a useful debugging record instead of a chat log.

This keeps the core local-first promise intact: the only thing that ever leaves your machine is what you explicitly share, and even that disappears from the shared relay within hours. What's worth keeping permanently, you keep yourself, locally, under your own control.

---

## The `sketch` CLI

A command-line tool for quickly testing any endpoint, without Postman or curl.

```bash
sketch <method> <path> <port-or-url>
```

**Local testing** — pass just the port:
```bash
sketch post /api/payment 5000
```

**Remote testing** — pass the full URL:
```bash
sketch post /api/payment http://yourapp.com
```

**With a request body:**
```bash
sketch post /api/payment 5000 --body '{"amount":100}'
```

`sketch` automatically uses your local instance credentials — no extra setup for authenticated calls to your own collector.

---

## What Gets Captured

- HTTP method, path, status code, duration
- Request headers, body, and query parameters
- Sensitive fields (passwords, tokens, `Authorization` headers, API keys) are automatically redacted before anything is saved — including nested fields

---
## Privacy & Storage

- Local-first by default — nothing leaves your machine unless you explicitly replay a trace against a remote URL, or explicitly share something via Relay
- Local data is stored in SQLite at `~/.tracesketch/`
- Traces expire automatically (24 hours by default) and are cleaned up
- Relay sessions expire automatically after 6 hours; Crazy-type Relay messages are never stored at all, anywhere

---

## Security

`Replay` makes outbound HTTP requests to a target URL you provide, so it's protected against being misused as an open network proxy:

- Only `http:` and `https:` protocols are allowed
- The target hostname is resolved and the actual IP is validated — private and reserved network ranges (`10.0.0.0/8`, `172.16.0.0/12`, `192.168.0.0/16`), link-local addresses, and cloud metadata endpoints (`169.254.169.254`) are blocked by default, including when a domain name resolves to one of these (DNS rebinding protection)
- `localhost` / `127.0.0.1` is allowed, since local-first replay against your own machine is the core use case
- Redirects are not followed automatically — a redirect response is returned as-is rather than silently chased to a new destination
- Every replay request has a strict timeout

If you find a security issue, please report it privately rather than opening a public issue.

---

## Updating

New versions are published regularly. To update to the latest version:

```bash
npm install -g tracesketch@latest
```

If a new version doesn't seem to take effect, your npm cache may be holding an old copy:

```bash
npm uninstall -g tracesketch
npm cache clean --force
npm install -g tracesketch@latest
```

Open a new terminal window afterward — PATH changes don't apply to terminals that were already open.

To check what version you have versus the latest available:

```bash
npm list -g tracesketch
npm view tracesketch version
```

---

## Status

Early access. The core loop — capture, replay, regression testing — is tested end to end and works. Relay (pair debugging) is a newer addition and still evolving. The API surface may still change as the project grows. Feedback is genuinely welcome.

## Author

Built by Anand Raj.

- GitHub: [github.com/anandrajjee981-max](https://github.com/anandrajjee981-max)
- LinkedIn: [linkedin.com/in/anand-raj-059011387](https://www.linkedin.com/in/anand-raj-059011387/)
- Instagram :[instagram.com/anand_raj9435/](https://www.instagram.com/anand_raj9435/)
## License

MIT