# Security Policy

## Supported Versions

| Version | Supported |
|---------|-----------|
| 0.1.x   | ✅ Yes    |
| < 0.1   | ❌ No     |

## Reporting a Vulnerability

**Do NOT open a public GitHub issue for security vulnerabilities.**

Instead, please report vulnerabilities privately:

1. **Email:** [aviraldua93](mailto:aviraldua9@gmail.com)
2. **Subject line:** `[SECURITY] architect-ai — <brief description>`
3. **Include:**
   - Description of the vulnerability
   - Steps to reproduce
   - Potential impact
   - Suggested fix (if any)

## Response Timeline

| Stage | SLA |
|-------|-----|
| Acknowledge receipt | **72 hours** |
| Initial triage and severity assessment | 5 business days |
| Fix released (P0 — critical) | **30 days** |
| Fix released (P1 — high) | 60 days |
| Fix released (P2 — medium/low) | Next minor release |

## Scope

### In Scope

- **API key handling** — exposure, leakage, or insecure storage of `ANTHROPIC_API_KEY`
- **Input validation** — malformed question bank JSON causing unexpected behaviour
- **CLI input sanitisation** — injection via user input in the terminal quiz
- **Dependency vulnerabilities** — known CVEs in `@anthropic-ai/sdk`, `zod`, or other dependencies
- **MCP server security** — malicious JSON-RPC payloads, unauthorised tool execution
- **Build pipeline integrity** — supply chain attacks via compromised build artefacts in `dist/`

### Out of Scope

- **Question content accuracy** — incorrect exam answers or misleading rationale (file a regular issue)
- **Exam strategy advice** — study plan effectiveness or domain weighting disputes
- **Cosmetic issues** — formatting, typos, or colour rendering in the terminal UI
- **Third-party service availability** — Anthropic API outages or rate limiting

## Disclosure Policy

We follow coordinated disclosure:

1. Reporter submits privately via email.
2. We acknowledge within 72 hours.
3. We work with the reporter to understand and fix the issue.
4. Once a fix is released, we credit the reporter in the changelog (unless they prefer anonymity).
5. Public disclosure occurs after the fix is available.

## Security Best Practices for Contributors

- **Never commit API keys** — use `.env` files (already in `.gitignore`).
- **Validate all external input** — the codebase uses Zod schemas for runtime validation; maintain this pattern.
- **Keep dependencies minimal** — every dependency increases the attack surface.
- **Run `npm audit`** periodically to check for known vulnerabilities.
