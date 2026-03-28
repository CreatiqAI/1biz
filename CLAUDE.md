# AI Vibe Coding — Security Playbook

## Authentication & Sessions

1. Set session expiration limits. JWT sessions must never exceed 7 days and must use refresh token rotation.
2. Never use AI-built auth from scratch. Use established libraries (Clerk, Supabase Auth, Auth.js) or the existing JWT + refresh token system already in this codebase.
3. Keep API keys strictly secured. Always use `process.env` — never hardcode secrets or commit `.env` files.

## Secure API Development

4. Rotate secrets every 90 days minimum.
5. Verify all suggested packages for security before installing. Always opt for newer, more secure package versions.
6. Run `npm audit fix` after every build.
7. Sanitize all inputs using parameterized queries — always. Never interpolate user input into SQL strings.

## API & Access Control

8. Enable Row-Level Security in the DB from day one.
9. Remove all `console.log` statements before deploying to production.
10. Use CORS to restrict access to the allow-listed production domain only.
11. Validate all redirect URLs against an allow-list.
12. Add auth and rate limiting to every endpoint.

## Data & Infrastructure

13. Cap AI API costs within code and dashboard.
14. Add DDoS protection via Cloudflare or Vercel edge config.
15. Lock down storage access so users can only access their own files.
16. Validate upload file types by signature (magic bytes), not by extension.
17. Verify webhook signatures before processing payment data.

## Other Rules

18. Review permissions server-side — UI-level checks are not security.
19. Log critical actions: deletions, role changes, payments, exports.
20. Build real account deletion flows. Large fines are not fun.
21. Automate backups, then actually test them. An untested backup is useless.
22. Keep test and production environments fully separate.
23. Never let webhooks touch real systems in the test environment.
