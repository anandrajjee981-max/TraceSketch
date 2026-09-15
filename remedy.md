# TraceSketch --- Security Risk Remediation Plan

## Current Risk: SSRF in Replay Functionality

**Status:** Remediation planned\
**Priority:** Critical / High\
**Affected Area:** Regression Replay / HTTP Request Replay\
**Detected By:** Socket Supply Chain Security Analysis\
**Target:** Remove the current SSRF risk without breaking TraceSketch's
replay workflow

------------------------------------------------------------------------

## 1. Executive Summary

Socket has identified a potential **Server-Side Request Forgery (SSRF)**
risk in TraceSketch's replay functionality.

The likely security boundary is:

``` text
Captured Trace
      ↓
Replay Handler
      ↓
HTTP Request
      ↓
Target URL
```

If the replay handler allows an attacker to influence the destination
URL, TraceSketch could be abused as a server-side HTTP client to access
destinations that should not be reachable.

Examples of dangerous destinations include:

-   `localhost`
-   `127.0.0.1`
-   private RFC1918 networks such as `10.0.0.0/8`
-   `172.16.0.0/12`
-   `192.168.0.0/16`
-   link-local addresses such as `169.254.0.0/16`
-   cloud instance metadata endpoints
-   internal services reachable only from the TraceSketch host/network

The goal is **not** to remove networking from TraceSketch. Networking is
a legitimate requirement of replay.

The goal is to ensure:

> TraceSketch can replay requests only against explicitly permitted
> destinations.

------------------------------------------------------------------------

# 2. Security Objective

The replay system must satisfy the following invariant:

``` text
User/Trace Input
      ↓
Destination Validation
      ↓
Allowed Target?
   ┌──┴──┐
   │     │
  YES    NO
   │     │
 Replay  Reject
```

A replay request must never be able to bypass destination validation.

### Security invariant

> No untrusted input may directly determine the network destination
> contacted by the TraceSketch replay engine.

------------------------------------------------------------------------

# 3. Threat Model

## 3.1 Potential Attacker

An attacker may be:

-   a malicious user of an exposed TraceSketch dashboard/API
-   someone able to modify a stored trace
-   someone able to submit a replay request
-   someone able to manipulate a captured URL
-   someone able to trigger a replay endpoint indirectly

## 3.2 Attacker Goal

The attacker may attempt to make TraceSketch send requests to:

``` text
http://localhost:<port>
http://127.0.0.1:<port>
http://10.x.x.x
http://172.16.x.x
http://192.168.x.x
http://169.254.x.x
http://[::1]
```

or other internal destinations.

The attacker may attempt to:

1.  Read internal service responses.
2.  Probe internal ports/services.
3.  Access cloud metadata services.
4.  Reach administrative endpoints.
5.  Use redirects to bypass hostname validation.
6.  Abuse DNS resolution to reach private IPs.
7.  Cause TraceSketch to make requests to arbitrary external systems.

------------------------------------------------------------------------

# 4. Root Cause Investigation

Before changing code, identify the exact data flow.

Search the TraceSketch codebase for:

``` text
fetch(
axios(
http.request(
https.request(
got(
undici
request(
replay
targetUrl
url
```

Then map:

``` text
Input
 ↓
URL extraction
 ↓
URL construction
 ↓
DNS resolution
 ↓
HTTP client
 ↓
Redirect handling
```

The primary question is:

> Where does the replay destination URL come from?

Possible sources:

``` text
Trace database
Request body
Request headers
Dashboard request
Replay API
Environment configuration
User input
```

Do not assume that a URL stored in a trace is trusted.

A captured request should be treated as **untrusted data**.

------------------------------------------------------------------------

# 5. Required Security Architecture

## 5.1 Do Not Use Arbitrary URLs

Avoid designs such as:

``` js
await fetch(userProvidedUrl);
```

or:

``` js
await replay(trace.url);
```

when `trace.url` can be influenced by an untrusted source.

Instead:

``` text
Replay Request
      ↓
Resolve Target Environment
      ↓
Validate Destination
      ↓
Validate Resolved IP
      ↓
Send Request
```

------------------------------------------------------------------------

# 6. Target Environment Model

Replay should be based on configured environments rather than arbitrary
URLs.

Recommended conceptual model:

``` text
TraceSketch
│
├── Local
│   └── http://localhost:3000
│
├── Development
│   └── https://dev.example.com
│
├── Staging
│   └── https://staging.example.com
│
└── Production
    └── Disabled by default
```

A trace may contain its original URL, but the replay engine should not
automatically trust it as the replay destination.

Example configuration:

``` js
traceSketch({
  replay: {
    environments: {
      local: "http://localhost:3000",
      staging: "https://staging.example.com"
    }
  }
});
```

The dashboard can then provide:

``` text
Replay Target

○ Local
○ Development
○ Staging
```

instead of:

``` text
Enter any URL:
[________________________]
```

------------------------------------------------------------------------

# 7. URL Validation

Create a dedicated security boundary for replay targets.

Conceptually:

``` text
validateReplayTarget(url)
```

Validation should check:

### 7.1 Protocol

Allow only:

``` text
http:
https:
```

Reject:

``` text
file:
ftp:
gopher:
data:
javascript:
unix:
```

------------------------------------------------------------------------

## 7.2 Hostname

Validate the hostname against an explicit allowlist.

Example:

``` text
Allowed:
localhost
127.0.0.1
staging.example.com

Rejected:
internal.example.local
169.254.169.254
attacker.example.com
```

Do not rely only on string matching.

------------------------------------------------------------------------

# 8. Private IP Protection

The replay engine should reject private and reserved network ranges
unless the user explicitly configured them as trusted replay targets.

Important ranges include:

``` text
10.0.0.0/8
172.16.0.0/12
192.168.0.0/16

127.0.0.0/8
169.254.0.0/16

::1/128
fc00::/7
fe80::/10
```

Also account for:

-   IPv4-mapped IPv6 addresses
-   loopback representations
-   unusual IPv4 formats
-   DNS names resolving to private IPs

------------------------------------------------------------------------

# 9. DNS Rebinding Protection

Hostname validation alone is not enough.

Example:

``` text
staging.example.com
       ↓
DNS
       ↓
127.0.0.1
```

If the application validates only the hostname, the request could still
reach an internal service.

Therefore:

``` text
Hostname
   ↓
DNS Resolution
   ↓
Resolved IP
   ↓
IP Safety Validation
   ↓
HTTP Request
```

Validate the **actual resolved destination IP** before connecting.

------------------------------------------------------------------------

# 10. Redirect Protection

A safe initial target can redirect to an unsafe target.

Example:

``` text
https://staging.example.com
        ↓ 302
http://127.0.0.1:6379
```

Therefore:

> Every redirect destination must pass the same validation rules.

Options:

### Recommended MVP

Disable redirects during replay.

``` text
redirect: false
```

or equivalent behavior in the HTTP client.

### Alternative

Allow redirects only when every destination is validated.

``` text
Request
 ↓
Target Validation
 ↓
Response 302
 ↓
New Location Validation
 ↓
Allowed?
 ↓
Request
```

Never validate only the first URL.

------------------------------------------------------------------------

# 11. Timeout Protection

Replay requests must have a strict timeout.

Example policy:

``` text
Default timeout: 5–10 seconds
Maximum configurable timeout: 30 seconds
```

Why:

-   prevents hanging replay workers
-   reduces resource exhaustion
-   prevents accidental long-running requests
-   limits abuse

------------------------------------------------------------------------

# 12. Response Size Protection

Do not allow a replay request to download unlimited data.

Recommended policy:

``` text
Maximum response body:
1–5 MB for initial implementation
```

Large responses should be truncated or rejected.

This protects TraceSketch from:

``` text
Memory exhaustion
Disk exhaustion
Huge internal responses
Abusive endpoints
```

------------------------------------------------------------------------

# 13. Sensitive Data Redaction

Replay traces may contain:

``` text
Authorization
Cookie
Set-Cookie
API-Key
X-API-Key
Access tokens
Refresh tokens
Passwords
Secrets
```

Never blindly replay captured production secrets.

Create a redaction layer:

``` text
Captured Request
      ↓
Sensitive Field Detection
      ↓
Redaction
      ↓
Replay
```

Example:

``` text
Authorization: Bearer <REDACTED>
Cookie: <REDACTED>
X-API-Key: <REDACTED>
```

For local development, developers may explicitly configure safe
credentials.

------------------------------------------------------------------------

# 14. Production Replay Policy

Production replay should be disabled by default.

Recommended:

``` text
Development → Enabled
Staging     → Enabled
Production  → Disabled
```

If production replay is eventually supported, require explicit
configuration and additional safeguards.

Example:

``` js
replay: {
  production: false
}
```

Do not make production replay the default.

------------------------------------------------------------------------

# 15. Authentication Boundary

If TraceSketch exposes a replay API/dashboard, replay endpoints must not
be publicly callable without authorization.

Example:

``` text
POST /api/replay/:traceId
```

must require appropriate access control.

Security layers:

``` text
Request
 ↓
Authentication
 ↓
Authorization
 ↓
Trace Ownership Check
 ↓
Replay Target Validation
 ↓
Replay
```

Do not rely on a trace ID being difficult to guess as the only security
mechanism.

------------------------------------------------------------------------

# 16. Trace Ownership / Instance Isolation

TraceSketch uses an `instance_id` concept.

The intended relationship is:

``` text
One TraceSketch Installation
        ↓
One instance_id
        ↓
Many traces
```

Every replay request should verify that the requested trace belongs to
the current authorized TraceSketch instance.

Conceptually:

``` text
instance_id
     +
trace_id
     ↓
Trace ownership validation
```

Never allow:

``` text
trace_id → arbitrary instance's trace
```

------------------------------------------------------------------------

# 17. Replay Endpoint Security Flow

Recommended final flow:

``` text
                    Replay Request
                          │
                          ▼
                  Authenticate User
                          │
                          ▼
                  Authorize Instance
                          │
                          ▼
                     Load Trace
                          │
                          ▼
                 Validate Trace Access
                          │
                          ▼
                Select Configured Target
                          │
                          ▼
                  Validate Protocol
                          │
                          ▼
                  Validate Hostname
                          │
                          ▼
                   Resolve DNS
                          │
                          ▼
                  Validate Resolved IP
                          │
                          ▼
                 Apply Timeout/Limit
                          │
                          ▼
                Redact Sensitive Data
                          │
                          ▼
                  Disable/Validate Redirects
                          │
                          ▼
                    Send Request
                          │
                          ▼
                  Capture Response
                          │
                          ▼
                Redact Response Data
                          │
                          ▼
                    Return Replay
```

------------------------------------------------------------------------

# 18. Security Utility Separation

Do not put all security checks directly inside the replay controller.

Prefer a dedicated module:

``` text
src/
├── replay/
│   ├── replay.controller.ts
│   ├── replay.service.ts
│   └── replay.security.ts
│
└── security/
    ├── url-validator.ts
    ├── ip-validator.ts
    ├── redirect-validator.ts
    └── redactor.ts
```

The exact folder structure can follow the existing TraceSketch
architecture, but the security boundary should remain easy to test
independently.

------------------------------------------------------------------------

# 19. Tests Required Before Release

Create tests for every known SSRF category.

## 19.1 Loopback

Reject:

``` text
http://127.0.0.1
http://localhost
http://[::1]
```

unless explicitly configured as an allowed local replay target.

------------------------------------------------------------------------

## 19.2 Private Networks

Reject:

``` text
10.0.0.1
172.16.0.1
192.168.1.1
```

unless explicitly configured.

------------------------------------------------------------------------

## 19.3 Link Local

Reject:

``` text
169.254.169.254
```

and equivalent IPv6 link-local destinations.

------------------------------------------------------------------------

## 19.4 Unsupported Protocols

Reject:

``` text
file://
ftp://
gopher://
data:
javascript:
```

------------------------------------------------------------------------

## 19.5 DNS Resolution

Test:

``` text
allowed-host.example
        ↓
private IP
```

The replay must be rejected.

------------------------------------------------------------------------

## 19.6 Redirect

Test:

``` text
allowed.example
      ↓ 302
127.0.0.1
```

The replay must be blocked.

------------------------------------------------------------------------

## 19.7 Port Restrictions

If the product supports port restrictions, test:

``` text
allowed host + allowed port → allowed
allowed host + unexpected port → rejected
```

------------------------------------------------------------------------

## 19.8 Timeout

Create a server that never responds.

Expected:

``` text
Replay
 ↓
Timeout
 ↓
Controlled error
```

not a permanently hanging process.

------------------------------------------------------------------------

# 20. Security Test Matrix

  Test                              Expected
  --------------------------------- -------------------------------------
  `https://staging.example.com`     Allow
  `http://localhost:3000`           Allow only if explicitly configured
  `http://127.0.0.1`                Reject by default
  `http://[::1]`                    Reject by default
  `http://10.0.0.1`                 Reject
  `http://172.16.0.1`               Reject
  `http://192.168.1.1`              Reject
  `http://169.254.169.254`          Reject
  DNS → private IP                  Reject
  Allowed host → private redirect   Reject
  `file://...`                      Reject
  `gopher://...`                    Reject
  Huge response                     Limit
  Slow response                     Timeout
  Unauthorized replay               Reject

------------------------------------------------------------------------

# 21. What NOT To Do

Do not solve the alert by:

### ❌ Removing replay

Replay is a core TraceSketch capability.

### ❌ Removing network access

TraceSketch legitimately needs network access for HTTP replay.

### ❌ Hiding Socket warnings

The goal is actual security, not a cleaner scanner result.

### ❌ Trusting trace URLs

Captured data is not automatically trusted.

### ❌ Checking only the hostname

DNS can resolve to an unsafe IP.

### ❌ Checking only the first request

Redirects can change the destination.

### ❌ Storing secrets permanently

Captured authentication material should be redacted.

### ❌ Making production replay unrestricted

Production replay needs stronger controls.

------------------------------------------------------------------------

# 22. README Security Documentation

Add a security section to the TraceSketch README.

Example:

``` md
## Security

TraceSketch can make outbound HTTP requests when replaying captured
requests.

For security, replay targets are restricted to explicitly configured
environments. TraceSketch validates the target protocol, hostname,
resolved IP address, and redirect destinations before making requests.

Production replay is disabled by default.

Captured credentials and sensitive headers should be redacted before
storage or replay.

If you discover a security vulnerability, please report it privately
through the repository's security reporting channel.
```

Update this section according to the actual implementation.

Do not claim a security control exists until it is implemented and
tested.

------------------------------------------------------------------------

# 23. Release Plan

## Phase 1 --- Identify

-   Find the exact replay handler.
-   Identify the source of the replay URL.
-   Map the complete URL-to-request data flow.
-   Confirm which code Socket analyzed.

## Phase 2 --- Restrict

-   Introduce configured replay environments.
-   Remove arbitrary destination support.
-   Add protocol validation.
-   Add hostname validation.
-   Add resolved-IP validation.
-   Block unsafe private/reserved destinations by default.

## Phase 3 --- Harden

-   Disable or validate redirects.
-   Add timeout.
-   Add response-size limits.
-   Add request-size limits if applicable.
-   Add sensitive-data redaction.
-   Add replay authentication/authorization where applicable.

## Phase 4 --- Test

-   Add SSRF unit tests.
-   Add integration tests.
-   Test DNS rebinding scenarios.
-   Test redirects.
-   Test IPv4/IPv6 edge cases.
-   Test unauthorized replay.
-   Test production replay restrictions.

## Phase 5 --- Verify

Run:

``` text
npm test
npm audit
npm pack
```

Then run the package through Socket again.

Also manually inspect the generated package to ensure no unnecessary
files or secrets are included.

## Phase 6 --- Release

After the risk is actually fixed:

``` text
0.0.2
  ↓
Security fixes
  ↓
0.0.3
```

Publish release notes describing the security hardening.

------------------------------------------------------------------------

# 24. Definition of Done

The SSRF remediation is complete only when all of the following are
true:

-   [ ] Replay no longer accepts arbitrary untrusted destinations.
-   [ ] Replay targets are explicitly configured.
-   [ ] Protocols are restricted to HTTP/HTTPS.
-   [ ] Hostnames are validated.
-   [ ] Resolved IP addresses are validated.
-   [ ] Private/reserved addresses are blocked by default.
-   [ ] IPv6 loopback/private/link-local cases are handled.
-   [ ] Redirect destinations cannot bypass validation.
-   [ ] Replay has a strict timeout.
-   [ ] Response size is bounded.
-   [ ] Sensitive headers/body fields are redacted appropriately.
-   [ ] Replay API has appropriate authorization.
-   [ ] Trace ownership is validated.
-   [ ] SSRF regression tests exist.
-   [ ] Socket has been re-run after the fix.
-   [ ] No secrets are included in the published npm package.
-   [ ] README security documentation matches the actual implementation.

------------------------------------------------------------------------

# 25. Success Criteria

The objective is **not simply to make Socket show zero warnings**.

The actual success condition is:

``` text
Attacker-controlled URL
        ↓
       ❌
TraceSketch Replay
```

while:

``` text
Configured Safe Target
        ↓
Destination Validation
        ↓
Replay
        ↓
TraceSketch Result
```

continues to work normally.

The ideal final architecture is:

``` text
             TraceSketch
                  │
          ┌───────┴────────┐
          │                │
       Tracing           Replay
                           │
                           ▼
                  Security Boundary
                           │
              ┌────────────┼────────────┐
              │            │            │
          URL Check     IP Check    Redirect Check
              │            │            │
              └────────────┼────────────┘
                           │
                           ▼
                    Safe HTTP Client
                           │
                           ▼
                    Replay Result
```

------------------------------------------------------------------------

# 26. Long-Term Security Direction

As TraceSketch grows from a local developer tool into a larger
open-source infrastructure product, the replay security model should
evolve toward:

``` text
Local-first
    ↓
Explicit environments
    ↓
Instance isolation
    ↓
Authenticated replay
    ↓
Policy-based network access
    ↓
Enterprise security controls
```

Potential future controls:

-   per-environment replay policies
-   per-domain allowlists
-   per-port allowlists
-   egress policies
-   configurable network isolation
-   audit logs for replay operations
-   role-based replay permissions
-   secret-management integrations
-   configurable retention
-   secure cloud replay workers

These are **future hardening features**, not requirements for the first
security patch.

------------------------------------------------------------------------

# Final Principle

TraceSketch's replay capability is valuable because it lets developers
reproduce real failures.

Do not weaken that feature.

Instead, establish a strong security boundary around it:

> **TraceSketch may replay requests, but it must never become an
> unrestricted network proxy.**

That is the core requirement for removing the current SSRF risk while
preserving the product's main debugging workflow.
