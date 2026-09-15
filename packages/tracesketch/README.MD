# traceSketch

Local-first API tracing, replay, and regression testing for Node.js.

Capture real requests, replay them anywhere, and turn fixed bugs into permanent regression tests — all running on your own machine.

```bash
npm install tracesketch
```

---

## The Problem

An API fails in production. You get a 500 error and nothing else. You don't know what the exact request was, where it failed, or how to reproduce it safely. So you guess.

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

Everything runs locally. No account, no cloud, no signup.

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

- Local-first by default — nothing leaves your machine unless you explicitly replay a trace against a remote URL
- Data is stored in SQLite at `~/.tracesketch/`
- Traces expire automatically (24 hours by default) and are cleaned up

---

## Architecture

```
Your App (SDK middleware)
        ↓
Collector (local server, port 4000)
        ↓
SQLite (local storage)
        ↓
Dashboard (port 8470) — view, replay, manage regression tests
```

---

## Status

Early access. The core loop — capture, replay, regression testing — is tested end to end and works. The API surface may still change as the project grows. Feedback is genuinely welcome.

## Author

Built by Anand Raj.

- GitHub: [github.com/anandrajjee981-max](https://github.com/anandrajjee981-max)
- LinkedIn: [linkedin.com/in/anand-raj-059011387](https://www.linkedin.com/in/anand-raj-059011387/)

## License

MIT