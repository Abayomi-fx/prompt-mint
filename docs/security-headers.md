# Security Headers Implementation

This document describes the security headers implemented across all deployment paths for Prompt Mint.

## Overview

Security headers are applied to all HTTP responses across three deployment paths:

1. **Vercel Frontend & Serverless Functions** - Configured in `vercel.json`
2. **Express Server** - Applied via middleware in `server/src/middleware/securityHeaders.ts`
3. **Serverless API Endpoints** - Applied via observability wrapper in `src/lib/observability/wrapper.ts`

## Security Headers Applied

### Common Headers (All Paths)

- **X-Content-Type-Options: nosniff**
  - Prevents MIME type sniffing
  - Ensures browser respects declared Content-Type
  - Protects against MIME confusion attacks

- **X-Frame-Options: DENY**
  - Prevents clickjacking attacks
  - Blocks all framing attempts
  - No exceptions for same-origin framing

- **X-XSS-Protection: 1; mode=block**
  - Enables browser XSS filtering
  - Blocks response if XSS attack detected
  - Legacy protection for older browsers

- **Referrer-Policy: strict-origin-when-cross-origin**
  - Controls referrer information sent
  - Full referrer sent to same-origin
  - Only origin sent to cross-origin requests
  - No referrer sent to less secure destinations

- **Permissions-Policy: camera=(), microphone=(), geolocation=()**
  - Restricts browser feature access
  - Disables camera, microphone, and geolocation
  - Prevents unauthorized feature access

### HTTPS-Specific Headers

- **Strict-Transport-Security: max-age=31536000; includeSubDomains; preload**
  - Enforces HTTPS connections
  - Applied only in production with HTTPS
  - 1-year max-age with subdomain coverage
  - Eligible for HSTS preload list
  - **Condition**: `NODE_ENV === "production"` AND HTTPS connection detected

### Content Security Policy

#### Express Server
```
Content-Security-Policy: default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval'; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; font-src 'self' data:; connect-src 'self' https://*.stellar.org https://horizon.stellar.org https://soroban-testnet.stellar.org https://soroban.stellar.org; frame-ancestors 'none';
```

#### Serverless API Endpoints
```
Content-Security-Policy: default-src 'none'; frame-ancestors 'none';
```

## Deployment Path Details

### 1. Vercel Configuration (`vercel.json`)

**Scope**: All paths including static assets and serverless functions

**Headers Applied**:
- Common headers to all paths (`/(.*)`)
- HSTS to API paths (`/api/(.*)`)

**Behavior**:
- Headers set at edge level before request reaches application code
- Applied to both frontend routes and API routes
- HSTS only applied to API endpoints

**Edge Cases**:
- Headers apply to all responses including static files
- HSTS conditionally applied to API paths only
- No CSP in Vercel config (handled by application code)

### 2. Express Server (`server/src/server.ts`)

**Scope**: All Express server routes

**Middleware**: `server/src/middleware/securityHeaders.ts`

**Headers Applied**:
- All common headers
- HSTS (production + HTTPS only)
- CSP with Stellar-specific allowlist

**Behavior**:
- Applied globally via `app.use(securityHeaders)`
- Executed before route handlers
- Applied to all responses including error responses

**Edge Cases**:
- HSTS only applied in production with HTTPS
- CSP allows inline scripts/styles for frontend compatibility
- CSP includes Stellar RPC/Horizon domains for blockchain operations
- Local development: HSTS not applied (non-HTTPS)

### 3. Serverless API Endpoints (`src/lib/observability/wrapper.ts`)

**Scope**: All serverless API handlers using `withObservability` wrapper

**Wrapper**: `src/lib/observability/wrapper.ts`

**Headers Applied**:
- All common headers
- HSTS (production + HTTPS only)
- Minimal CSP for API endpoints

**Behavior**:
- Applied via `withObservability` wrapper
- Executed before handler execution
- Applied to both success and error responses

**Edge Cases**:
- HSTS only applied in production with HTTPS
- CSP is minimal (`default-src 'none'`) for API-only responses
- Headers applied even when handler throws errors
- Uses `x-forwarded-proto` header to detect HTTPS in Vercel

## Behavior and Edge Cases

### Environment-Specific Behavior

#### Development Environment
- HSTS not applied (non-HTTPS connections)
- All other headers applied normally
- CSP allows inline scripts/styles for development tools

#### Production Environment
- HSTS applied when HTTPS detected
- All headers applied strictly
- CSP enforces Stellar domain restrictions

### HTTPS Detection

#### Express Server
- Uses `req.secure` property
- Only true when direct HTTPS connection
- May not work behind some proxies

#### Serverless Functions
- Uses `req.headers["x-forwarded-proto"] === "https"`
- Works with Vercel's proxy headers
- Falls back to `req.secure` as backup

### Error Responses

#### Express Server
- Security headers applied via middleware
- Headers present on all responses including errors
- No special handling needed

#### Serverless Functions
- Security headers applied in error handler
- Explicit call to `applySecurityHeaders(req, res)` in catch block
- Ensures headers present even on unhandled errors

### Header Conflicts

#### Vercel vs Application
- Vercel headers set first at edge
- Application headers may override Vercel headers
- No conflicts expected (complementary configuration)

#### Multiple Middleware
- Security headers middleware applied first
- Other middleware may add headers
- No conflicts with existing rate limit headers

### CSP Considerations

#### Frontend Compatibility
- Inline scripts allowed for React hydration
- Inline styles allowed for styled-components
- Data URLs allowed for images/fonts

#### Stellar Integration
- Stellar RPC domains explicitly allowed
- Horizon endpoints explicitly allowed
- WebSocket connections may need additional CSP directives

#### API Endpoints
- Minimal CSP for API responses
- No script/style restrictions needed
- Focus on preventing framing

## Backward Compatibility

### Existing Flows

#### Marketplace Flows
- No impact on contract interactions
- No impact on wallet connections
- No impact on encryption/decryption
- Headers are response-only, no request changes

#### API Endpoints
- No breaking changes to request/response format
- Headers are additive, not modifying existing behavior
- Rate limiting headers continue to work
- Error responses maintain same structure

#### Frontend
- CSP allows existing script loading patterns
- No changes to asset loading
- No changes to Stellar SDK integration
- No changes to wallet extension communication

### Migration Requirements

#### No Migration Needed
- Headers are purely additive
- No database changes required
- No contract changes required
- No client-side changes required

#### Optional Enhancements
- Consider adding nonce-based CSP for stricter security
- Consider adding report-uri for CSP violations
- Consider adding Expect-CT header for certificate transparency

## Testing

### Manual Testing

#### Verify Headers Present
```bash
curl -I https://your-domain.com
curl -I https://your-domain.com/api/health
```

#### Verify HSTS
```bash
curl -I https://your-domain.com/api/health
# Look for: Strict-Transport-Security: max-age=31536000; includeSubDomains; preload
```

#### Verify CSP
```bash
curl -I https://your-domain.com
# Look for: Content-Security-Policy: ...
```

### Automated Testing

See `src/lib/observability/wrapper.test.ts` for security header tests.

## Security Considerations

### HSTS Preload
- Current configuration is preload-eligible
- Consider submitting to HSTS preload list
- Requires permanent commitment to HTTPS
- Test thoroughly before submission

### CSP Evolution
- Current CSP allows inline scripts/styles
- Consider migrating to nonce-based CSP
- Consider adding CSP violation reporting
- Monitor CSP violations in production

### Header Review
- Review headers quarterly for security best practices
- Stay updated on new security headers
- Consider adding Content-Security-Policy-Report-Only for testing
- Consider adding Cross-Origin-Opener-Policy for isolation

## References

- [OWASP Security Headers](https://owasp.org/www-project-secure-headers/)
- [MDN Web Security](https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers)
- [HSTS Preload List](https://hstspreload.org/)
- [Content Security Policy Level 3](https://www.w3.org/TR/CSP3/)
