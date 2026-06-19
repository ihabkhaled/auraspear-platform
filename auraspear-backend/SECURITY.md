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

- **No `eval()` or dynamic code execution** — enforced via ESLint
- **Parameterized queries** — Prisma ORM prevents SQL injection by default
- **Input validation** — all request payloads validated with Zod schemas and NestJS pipes
- **Rate limiting** — `@nestjs/throttler` applied globally
- **Helmet** — security headers set via `helmet` middleware
- **CORS** — configured to allow only trusted origins
- **Authentication** — JWT + OIDC (Microsoft Entra ID) with JWKS verification
- **Authorization** — RBAC with permission-based guards on every endpoint
- **Dependency auditing** — run `npm audit` regularly
- **Pre-commit hooks** — ESLint security plugin checks run on every commit
- **No secrets in logs** — tokens and credentials are never logged

## Scope

The following are in scope for vulnerability reports:

- Authentication and authorization bypasses
- Cross-site scripting (XSS)
- Cross-site request forgery (CSRF)
- Server-side request forgery (SSRF)
- Injection vulnerabilities (SQL, NoSQL, command)
- Sensitive data exposure
- Insecure direct object references
- Privilege escalation

Out of scope:

- Denial of service (DoS) attacks
- Social engineering
- Issues in third-party dependencies (report upstream)
- Issues requiring physical access
