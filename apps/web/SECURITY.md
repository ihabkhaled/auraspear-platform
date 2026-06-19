# Security Policy

## Reporting a Vulnerability

If you discover a security vulnerability in AuraSpear SOC, please report it responsibly.

**Email:** [security@auraspear.io](mailto:security@auraspear.io)

Please include:

- A description of the vulnerability and its potential impact
- Steps to reproduce the issue
- Any proof-of-concept code or screenshots
- Your name and affiliation (optional, for credit)

**Do not** open a public GitHub issue for security vulnerabilities.

## Supported Versions

| Version | Supported |
| ------- | --------- |
| 1.x     | Yes       |
| < 1.0   | No        |

## Response Timeline

| Stage              | Target   |
| ------------------ | -------- |
| Acknowledgment     | 48 hours |
| Initial assessment | 5 days   |
| Fix development    | 30 days  |
| Public disclosure  | 90 days  |

We may request an extension for complex issues. Critical vulnerabilities are prioritized.

## Security Best Practices

This project follows these security practices:

- **No `eval()` or dynamic code execution** — enforced via ESLint (`no-eval`, `no-implied-eval`, `no-new-func`)
- **No `dangerouslySetInnerHTML`** — enforced via ESLint (`react/no-danger`)
- **Strict Content Security Policy** — security headers configured in `next.config.ts`
- **Input validation** — all forms validated with Zod schemas
- **No secrets in client bundles** — only `NEXT_PUBLIC_*` variables are exposed to the browser
- **Dependency auditing** — run `npm audit` regularly
- **Pre-commit hooks** — ESLint security plugin checks run on every commit
- **HttpOnly cookies** — preferred for token storage when possible

## AI Memory Security

- Memories strictly scoped by `tenantId` + `userId` — no cross-tenant or cross-user leakage
- Memory CRUD requires `AI_MEMORY_VIEW`/`AI_MEMORY_EDIT` permissions
- Embeddings stored server-side only — never in localStorage
- Memory retrieval failures are non-blocking (graceful fallback)

## Scope

The following are in scope for vulnerability reports:

- Authentication and authorization bypasses
- Cross-site scripting (XSS)
- Cross-site request forgery (CSRF)
- Server-side request forgery (SSRF)
- Injection vulnerabilities (SQL, NoSQL, command)
- Sensitive data exposure
- Insecure direct object references

Out of scope:

- Denial of service (DoS) attacks
- Social engineering
- Issues in third-party dependencies (report upstream)
- Issues requiring physical access
