# traceSketch

Save your API requests, send them again, and turn fixed bugs into tests. For Node.js and Express.

```bash
npm install tracesketch
```

---

## Video

[![traceSketch video](https://img.youtube.com/vi/YNaeYQ0bb8k/hqdefault.jpg)](https://www.youtube.com/watch?v=YNaeYQ0bb8k)

A short video that shows how to install and use traceSketch.

---

## What is traceSketch?

When your API gives an error, it is hard to know what happened. You need the exact request that caused it.

traceSketch saves every request your app gets. Later, you can send the same request again, check if your fix works, and save it as a test.

Everything runs on your own computer. Your data stays there unless you choose to share it.

How it works:

```text
Request reaches your Express app
        |
        v
traceSketch captures it
        |
        v
The trace is saved on your computer
        |
        v
You look at it in the dashboard
        |
        v
You replay the request  <---------------+
        |                                |
        v                                |
Does the fix work?                       |
   |                                     |
   |-- No: keep debugging ---------------+
   |
   '-- Yes
        |
        v
Save it as a regression test
        |
        v
Run it after future changes
```

## Who is it for?

Developers who use Express with Node.js. Other frameworks are not supported yet.

---

## Quick start

### Step 1: Add traceSketch to your app

```javascript
// If you use ES modules (import):
import express from 'express';
import { traceSketch } from 'tracesketch';

// If you use CommonJS (require), use these two lines instead:
// const express = require('express');
// const { traceSketch } = require('tracesketch');

const app = express();

app.use(express.json());   // put this before traceSketch
app.use(traceSketch());

app.get('/api/hello', (req, res) => {
  res.json({ message: 'hello' });
});

app.listen(3000);
```

If you use TypeScript, the `import` version works. The types are included.

You do not need to change anything in your routes.

### Step 2: Start traceSketch

Open a new terminal and run:

```bash
npx tracesketch start
```

Keep this terminal open. It starts two things:

- The collector, which saves your traces: `http://localhost:4000`
- The dashboard, which shows your traces: `http://localhost:8470`

> **Note:** traceSketch uses ports `4000` and `8470`. Run your own app on a different port.

### Step 3: Use your app

Send requests to your app as usual. Then open `http://localhost:8470` to see them.

---

## Dashboard

| Page | What it shows |
|---|---|
| **Traces** | All requests, with method, path, status code, and time |
| **Trace detail** | One request, with its headers, body, and query |
| **Replays** | The replays you ran, and their results |
| **Regressions** | Your saved tests |
| **Relay** | Chat and share traces with another developer |
| **CLI** | Send test requests from the dashboard |

### Replay a request

1. Open a trace and click **Replay**.
2. Enter the base URL to send it to. For example: `http://localhost:3000`.
3. Compare the original result with the new result.

```text
Choose a saved trace
        |
        v
Enter the target URL
        |
        v
Replay the request  <--------------+
        |                           |
        v                           |
Compare the results                 |
        |                           |
        v                           |
Fix the issue if needed ------------+
```

### Save a regression test

1. Open a trace of a bug you fixed.
2. Click **Save as Regression Test**. Enter the status code you expect, usually `200`.
3. Click **Run** any time. You will see PASS or FAIL.

---

## Relay: debug with another developer

Relay lets two developers work on the same problem at the same time.

How to use it:

1. Developer 1 opens the Relay page and clicks **Create Group**. They get a code with 4 letters, for example `KLSP`.
2. Developer 2 clicks **Join Group** and enters the code.
3. Now you are connected. A group can have 2 developers.

### How Relay connects you

```text
 Developer 1            Relay server             Developer 2
      |                       |                       |
      |-- Create group ------>|                       |
      |<-- Group code --------|                       |
      |                       |<-- Join with code ----|
      |<-- Connected ---------|-- Connected --------->|
      |-- Share trace/msg --->|                       |
      |                       |-- Deliver item ------>|
```

### Message types

There are four types of messages:

| Type | Use | What happens to it |
|---|---|---|
| **Note** | A normal text message | Kept on the relay during the session, then deleted |
| **Trace Share** | Send a trace to the other developer | Kept on the relay during the session. Also saved on your computer |
| **Replay Result** | Send the result of a replay | Kept on the relay during the session. Also saved on your computer |
| **Crazy** | A message that is not saved | Not saved anywhere. It is sent live and then it is gone |

Where the data is stored:

- The relay keeps a session for 6 hours. Then it deletes everything.
- Crazy messages are never saved. Not on the relay and not on your computer.
- Your computer keeps Trace Share and Replay Result items in a local database. You can see them or delete them at any time. Notes are not saved on your computer.

Relay needs the internet. The other features work on your computer. The relay server uses a free plan, so the first request after a long break can be slow.

---

## The `sketch` command

`sketch` sends a request to an endpoint from your terminal.

```bash
sketch <method> <path> <port-or-url>
```

Examples:

```bash
# A port number means localhost
sketch post /api/payment 5000

# A full URL means another server
sketch post /api/payment http://yourapp.com

# Send a JSON body
sketch post /api/payment 5000 --body '{"amount":100}'
```

If you call your own collector, `sketch` uses your local login details automatically.

On Windows PowerShell, JSON in `--body` can break because of the quotes. Use the **CLI** page in the dashboard instead. It has a normal text box for the body.

---

## What traceSketch saves

- The method, path, status code, and time of each request
- The headers, body, and query of each request
- Passwords, tokens, `Authorization` headers, and API keys are replaced with `REDACTED` before saving. This also works for values inside nested JSON.

---

## Privacy

- Your data stays on your computer by default.
- Data leaves your computer only when you replay to a remote URL or share something in Relay.
- Local data is saved in a SQLite file in `~/.tracesketch/`.
- Traces are deleted after 24 hours by default.
- Relay sessions are deleted after 6 hours. Crazy messages are never saved.

## Security

Replay sends requests for you, so it has safety checks:

- Only `http` and `https` are allowed.
- The real IP address of the target is checked. These are blocked: private ranges (`10.x.x.x`, `172.16.x.x` to `172.31.x.x`, `192.168.x.x`), link-local addresses, and cloud metadata addresses (`169.254.169.254`). This also applies when a domain name points to one of them.
- `localhost` and `127.0.0.1` are allowed, because replaying to your own computer is the main use.
- Redirects are not followed. You only see the redirect response.
- Every replay has a time limit.

If you find a security problem, please report it privately. Do not open a public issue.

---

## Update

To get the latest version:

```bash
npm install -g tracesketch@latest
```

If you still see the old version, clear the npm cache and install again:

```bash
npm uninstall -g tracesketch
npm cache clean --force
npm install -g tracesketch@latest
```

Open a new terminal after you update.

To check your version and the latest version:

```bash
npm list -g tracesketch
npm view tracesketch version
```

---

## Status

traceSketch is in early access. Capture, replay, and regression tests work well. Relay is new and may change. If you find a bug or have an idea, please tell me.

## Author

Built by Anand Raj.

- GitHub: [github.com/anandrajjee981-max](https://github.com/anandrajjee981-max)
- LinkedIn: [linkedin.com/in/anand-raj-059011387](https://www.linkedin.com/in/anand-raj-059011387/)
- Instagram: [instagram.com/anand_raj9435](https://www.instagram.com/anand_raj9435/)

## License

MIT