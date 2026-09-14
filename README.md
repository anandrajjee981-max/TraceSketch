# traceSketch — Developer Guide

> Stop guessing why your API failed. Capture the request, replay it, fix it, lock it in.

---

## The Problem

An API fails in production. All you get is a 500 error. You don't know what the exact request was, where it failed inside your app, or how to safely try it again. So you guess — copy-paste into Postman, hope you remember every header, hope it reproduces.

## What traceSketch Does

```
Request comes in → automatically captured → you see exactly where time was spent
        ↓
Click Replay → the exact same request runs again, anywhere you choose
        ↓
Fix the bug → confirm with another replay → save it as a regression test
        ↓
That bug is now permanently guarded — if it ever comes back, you'll know instantly
```

Everything runs locally on your own machine. No account, no cloud, no setup beyond one command.

---

## Install

```bash
npm install tracesketch
```

This installs everything: the tracing middleware, the local storage server, and the dashboard.

---

## Step 1 — Add the middleware to your app

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

That's it. Every request your app now receives is automatically captured — no extra code per route.

**Order matters:** `express.json()` has to run before `traceSketch()`, or the request body won't be captured.

---

## Step 2 — Start the collector and dashboard

In a separate terminal:

```bash
npx tracesketch start
```

One command starts:
- The local storage server (port `4000`)
- The dashboard (port `8470`)

Open the dashboard:
```
http://localhost:8470
```

---

## Step 3 — Use your app normally

Hit your routes however you normally would — curl, Postman, or real traffic. Every request shows up in the dashboard automatically. Nothing else to configure.

---

## What's in the Dashboard

| Section | What it shows |
|---|---|
| **Traces** | Every request — method, path, status code, duration |
| **Trace Detail** | Full breakdown of one request |
| **Replay** | Re-run that exact request against any target URL |
| **Regression Tests** | Saved "this should return X" checks you can re-run anytime |

---

## Replaying a request

1. Open any trace in the dashboard
2. Click **Replay**
3. Enter a target base URL (e.g. `http://localhost:3000`)
4. Compare original vs replay — status code, duration, side by side

---

## Saving a Regression Test

1. Pick a trace you've fixed (it now returns the correct response)
2. Click **Save as Regression Test**, set the expected status code (e.g. `200`)
3. Anytime later, click **Run** — instant PASS or FAIL

This is how a one-time production incident becomes permanent protection against the same bug returning.

---

## The `sketch` CLI

Installing traceSketch also gives you a `sketch` command — a fast way to test any endpoint from your terminal, without opening Postman or typing out a full curl command.

```bash
sketch <method> <path> <port-or-url>
```

**Testing something on your own machine** — just pass the port:
```bash
sketch post /api/payment 5000
```
This resolves to `http://localhost:5000/api/payment`.

**Testing something on a live server** — pass the full URL:
```bash
sketch post /api/payment http://yourapp.com
```

**Sending a body with the request:**
```bash
sketch post /api/payment 5000 --body '{"amount":100}'
```

`sketch` automatically reads your local instance credentials, so authenticated calls to your own collector (like creating a trace event) work without any extra setup.

---

## Privacy

- Everything stays on your machine by default — nothing is sent anywhere unless you explicitly replay it against a remote URL
- Sensitive fields (passwords, tokens, auth headers) are automatically redacted before anything is stored
- Traces expire automatically (24 hours by default) and get cleaned up

---

## Status

This is early access. The core loop — capture, replay, regression testing — is tested and working end to end. Expect rough edges elsewhere. Feedback is genuinely useful right now.