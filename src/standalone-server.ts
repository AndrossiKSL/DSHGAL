/**
 * dsh-whale-galgame — the standalone GAL page.
 *
 * The plugin's browser half is a loader artifact (`dist/client.js`): it calls
 * `window.__ModuleLoader__.load({id, factory})` and resolves `react` through the
 * factory's `require`, because inside DSH Web the shell owns that module table.
 * This server gives that same artifact a second home — a loopback-only page
 * whose runtime (`dist/standalone-runtime.js`) plays the shell's role for exactly
 * two modules. Nothing is re-implemented and no game state is copied: the page
 * reaches the running DSH host through the very same `/whale-galgame-api` route
 * it uses inside the main UI, so a save written in one is a save in the other.
 *
 * Security posture (the page shares the machine with the user's agent):
 * - loopback bind only, never a wildcard address;
 * - a fixed whitelist of proxied prefixes — no open proxy, no fetch-by-URL, no
 *   header smuggling (hop-by-hop headers are stripped both ways);
 * - Host/Origin gate: only the same loopback host on this exact port, or the
 *   browser-stripped-port form together with `Sec-Fetch-Site: same-origin`, so a
 *   foreign page cannot read the API through this port;
 * - no CORS headers at all — a cross-site `fetch` is refused, not answered;
 * - `/` carries markup only. Every piece of user data arrives from
 *   `/standalone-context` or the proxied API, and no source file is served.
 */
import { createReadStream } from 'node:fs'
import {
  createServer,
  request as createUpstreamRequest,
  type IncomingMessage,
  type ServerResponse,
} from 'node:http'
import { join } from 'node:path'

/** Default port the independent page listens on. `0` disables it at the call site. */
export const STANDALONE_DEFAULT_PORT = 9988

/** The only address this page ever binds. */
const STANDALONE_HOST = '127.0.0.1'

/** Hostnames a browser may legitimately use to reach a loopback listener. */
const LOOPBACK_HOSTNAMES = new Set(['127.0.0.1', 'localhost', '::1'])

/**
 * The proxied surface, spelled exactly as the plugin registers it. The media
 * entry keeps its trailing slash (it is a directory prefix); an entry without
 * one matches that exact path plus its subtree only, so `/whale-galgame-api-x`
 * never matches `/whale-galgame-api`.
 */
const PROXY_PREFIXES = [
  '/whale-galgame-api',
  '/whale-galgame-media/',
  '/character-party/',
  '/character-party-api',
  '/character-party-artifact',
] as const

/** Hop-by-hop headers that must not be forwarded in either direction. */
const HOP_BY_HOP_HEADERS: readonly string[] = [
  'connection',
  'keep-alive',
  'proxy-authenticate',
  'proxy-authorization',
  'te',
  'trailer',
  'transfer-encoding',
  'upgrade',
]

/** Only these two scripts are ever read from disk, by literal name. */
const STATIC_ASSETS: Readonly<Record<string, { readonly file: string; readonly type: string }>> = {
  '/runtime.js': { file: 'standalone-runtime.js', type: 'text/javascript; charset=utf-8' },
  '/client.js': { file: 'client.js', type: 'text/javascript; charset=utf-8' },
}

/**
 * The page is a shell with no inline script: the runtime registers the same
 * module-loader contract the DSH shell does, so `'self'` is enough for scripts.
 * Styles stay inline-only because the plugin paints its CSS through
 * `<style>` tags it owns; images are embedded data URLs plus the proxied media
 * prefix, both of which the same-origin rule already covers.
 */
const CONTENT_SECURITY_POLICY = [
  "default-src 'none'",
  "script-src 'self'",
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob:",
  "font-src 'self' data:",
  "connect-src 'self'",
  "media-src 'self' data: blob:",
  // The party workshop is an iframe of this same origin (proxied, not embedded
  // cross-site), so frames stay on 'self' and everywhere else stays closed.
  "frame-src 'self'",
  "base-uri 'none'",
  "form-action 'none'",
  "frame-ancestors 'none'",
].join('; ')

/** The only markup this server owns. It must never carry user data. */
const STANDALONE_HTML = `<!doctype html>
<html lang="zh-CN">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<meta name="color-scheme" content="dark" />
<meta name="referrer" content="no-referrer" />
<title>深海女仆工坊</title>
<link rel="icon" href="data:," />
</head>
<body>
<div id="root"><div id="whg-standalone-status" role="status">正在载入深海女仆工坊…<br />如果一直停在这里，说明独立页运行时没有加载成功，请查看 dsh-whale-galgame 的日志。</div></div>
<script src="/runtime.js"></script>
<script src="/client.js"></script>
</body>
</html>
`

/** One selectable DSH session, as far as the page is allowed to know it. */
export interface StandaloneSession {
  readonly id: string
  readonly title?: string
  readonly cwd?: string
  readonly updatedAt?: number
}

/** The context handshake. No token, no key, no transcript — ids and paths only. */
export interface StandaloneContext {
  readonly ok: true
  readonly standalone: true
  readonly variant: 'tab'
  readonly sessionId: string | null
  readonly workspace: string | null
  readonly sessions: readonly StandaloneSession[]
}

/** Options for {@link startStandaloneGal}. */
export interface StandaloneGalOptions {
  /** Private headers for a locally owned backend; never emitted to the browser. */
  readonly upstreamHeaders?: Readonly<Record<string, string>>
  /** Optional local application routes, called after the same-origin gate. */
  readonly handleRequest?: (req: IncomingMessage, res: ServerResponse) => boolean | Promise<boolean>
  /** Listen port; defaults to {@link STANDALONE_DEFAULT_PORT}. A fixed 9988 keeps bookmarks working. */
  readonly port?: number
  /** The real port the DSH web server listens on; the proxy target. */
  readonly upstreamPort: number
  /** The plugin's `dist/` directory — the only directory read for static assets. */
  readonly clientRoot: string
  /** Supplies the loopback handshake; may be async and may answer with no session. */
  readonly getContext: () => StandaloneContext | Record<string, unknown> | Promise<StandaloneContext | Record<string, unknown>>
  /** Receives async failures (listen, upstream, handler) so they never crash the host. */
  readonly onError?: (error: unknown) => void
}

/** What the caller keeps, so the page can be torn down with its plugin. */
export interface StandaloneGalHandle {
  /** `http://127.0.0.1:<port>` once assigned; safe to log (loopback only). */
  readonly url: string
  readonly port: number
  /** Resolves on bind, rejects on listen failure (port in use, no permission). */
  readonly ready: Promise<void>
  readonly close: () => Promise<void>
}

/**
 * Start the loopback-only GAL page.
 *
 * The server binds before this returns' `ready` settles, so a caller that wants
 * a hard failure (for example a CLI probe) can await it; a plugin that must
 * survive a taken port just logs the rejection.
 * @param options - port, upstream port, static root, context supplier.
 * @returns handle with the loopback URL and an idempotent close.
 */
export function startStandaloneGal(options: StandaloneGalOptions): StandaloneGalHandle {
  const requestedPort = normalizePort(options.port, STANDALONE_DEFAULT_PORT)
  const upstreamPort = normalizePort(options.upstreamPort, 0)
  if (upstreamPort === 0) throw new Error('standalone page needs a real upstream DSH web port')
  const clientRoot = typeof options.clientRoot === 'string' ? options.clientRoot.trim() : ''
  if (!clientRoot) throw new Error('standalone page needs the plugin lib directory as clientRoot')
  const getContext = typeof options.getContext === 'function' ? options.getContext : async () => null

  /** Logger failures stay local: a broken logger must not take serving down. */
  const reportError = (error: unknown): void => {
    if (typeof options.onError !== 'function') return
    try {
      options.onError(error)
    } catch (loggerFailure) { /* swallow: never re-enter the failure path */ }
  }

  let listeningPort = requestedPort

  const server = createServer((req, res) => {
    void serve(req, res).catch((error: unknown) => {
      reportError(error)
      sendPlain(res, 500, '独立页面内部错误')
    })
  })

  /**
   * Whether a request may talk to this page at all.
   *
   * Loopback binding keeps other machines out, but a page the user visits can
   * still `fetch("http://127.0.0.1:PORT/...")`; the answer must therefore be a
   * refusal, not a response. Two shapes are legitimate:
   * - browser keeps the port: Host (and Origin, when sent) name the same loopback
   *   host on exactly this port;
   * - browser strips the port (canonical-port elision in some WebViews): only
   *   with `Sec-Fetch-Site: same-origin`, which a foreign page cannot forge.
   * Anything cross-site, any other port, any foreign host is refused.
   * @param req - the inbound request.
   * @returns true when the request may be answered.
   */
  function isTrustedRequest(req: IncomingMessage): boolean {
    const host = parseAuthority(firstHeader(req.headers.host))
    const hostName = host === null ? null : canonicalLoopbackHostname(host.hostname)
    if (host === null || hostName === null) return false
    const fetchSite = (firstHeader(req.headers['sec-fetch-site']) ?? '').toLowerCase()
    // `same-site` also covers a foreign origin on the very same host (a different
    // port), which is exactly the case this gate exists to refuse.
    if (fetchSite === 'cross-site' || fetchSite === 'same-site') return false
    // A missing Host port is not proof of same-origin: only the browser's
    // unforgeable Fetch Metadata assertion makes that WebView form acceptable.
    if (host.port === null ? fetchSite !== 'same-origin' : host.port !== listeningPort) return false

    const rawOrigin = firstHeader(req.headers.origin)
    if (rawOrigin === undefined) return true
    const origin = parseOrigin(rawOrigin)
    const originName = origin === null ? null : canonicalLoopbackHostname(origin.hostname)
    // Loopback alone is insufficient: localhost and 127.0.0.1 are different
    // origins, as are two ports on the same hostname.
    if (origin === null || originName !== hostName) return false
    if (origin.port !== null) return origin.port === listeningPort
    return fetchSite === 'same-origin'
  }

  /**
   * Answer one request. Routes in order: trust gate, proxy whitelist, health,
   * context handshake, page shell, the two runtime scripts, and a plain 404 for
   * everything else — this server never becomes a general file server.
   */
  async function serve(req: IncomingMessage, res: ServerResponse): Promise<void> {
    const method = typeof req.method === 'string' ? req.method.toUpperCase() : 'GET'
    if (!isTrustedRequest(req)) {
      sendPlain(res, 403, '拒绝：该独立页面只接受本机同源请求')
      return
    }
    const target = parseRequestPath(req.url)
    if (target === null) {
      sendPlain(res, 400, '无效的请求路径')
      return
    }
    if (options.handleRequest && await options.handleRequest(req, res)) return
    if (isProxiedPath(target.pathname)) {
      proxy(req, res, upstreamPort)
      return
    }
    if (target.pathname === '/health') {
      if (!isReadMethod(method)) {
        sendPlain(res, 405, '仅支持 GET/HEAD')
        return
      }
      sendJson(res, 200, { ok: true, service: 'dsh-whale-galgame-standalone' }, method === 'HEAD')
      return
    }
    if (target.pathname === '/standalone-context') {
      if (method !== 'GET') {
        sendPlain(res, 405, '仅支持 GET')
        return
      }
      let payload: unknown = null
      try {
        payload = await getContext()
      } catch (error) {
        reportError(error)
      }
      sendJson(res, 200, sanitizeContext(payload))
      return
    }
    if (target.pathname === '/') {
      if (!isReadMethod(method)) {
        sendPlain(res, 405, '仅支持 GET/HEAD')
        return
      }
      const body = Buffer.from(STANDALONE_HTML, 'utf8')
      res.writeHead(200, {
        'Content-Type': 'text/html; charset=utf-8',
        'Content-Length': String(body.length),
        'Cache-Control': 'no-store',
        'Content-Security-Policy': CONTENT_SECURITY_POLICY,
        'Cross-Origin-Resource-Policy': 'same-origin',
        'Referrer-Policy': 'no-referrer',
        'X-Content-Type-Options': 'nosniff',
        'X-Frame-Options': 'DENY',
      })
      if (method === 'HEAD') {
        res.end()
        return
      }
      res.end(body)
      return
    }
    const asset = STATIC_ASSETS[target.pathname]
    if (asset !== undefined) {
      if (!isReadMethod(method)) {
        sendPlain(res, 405, '仅支持 GET/HEAD')
        return
      }
      sendAsset(res, join(clientRoot, asset.file), asset.type, method === 'HEAD')
      return
    }
    sendPlain(res, 404, '未找到')
  }

  /** Stream one of the two runtime scripts straight off disk. */
  function sendAsset(res: ServerResponse, file: string, type: string, headOnly: boolean): void {
    const stream = createReadStream(file)
    let opened = false
    stream.once('open', () => {
      opened = true
      res.writeHead(200, {
        'Content-Type': type,
        'Cache-Control': 'no-store',
        'Cross-Origin-Resource-Policy': 'same-origin',
        'X-Content-Type-Options': 'nosniff',
      })
      if (headOnly) {
        res.end()
        stream.destroy()
        return
      }
      stream.pipe(res)
    })
    stream.once('error', (error: unknown) => {
      if (opened) {
        res.destroy()
        return
      }
      reportError(error)
      sendPlain(res, 404, '运行时文件不可用')
    })
  }

  /**
   * Forward one whitelisted request to the DSH host. The upstream only ever
   * sees its own origin: `Host` and `Origin` are rewritten so the host's own
   * request checks see the same shape they see from the main UI, and the
   * standalone port never leaks upstream.
   */
  function proxy(req: IncomingMessage, res: ServerResponse, targetPort: number): void {
    const upstreamOrigin = 'http://' + STANDALONE_HOST + ':' + targetPort
    const headers: Record<string, string | string[]> = {}
    for (const [name, value] of Object.entries(req.headers)) {
      if (value === undefined) continue
      if (HOP_BY_HOP_HEADERS.includes(name.toLowerCase())) continue
      headers[name] = value
    }
    headers.host = STANDALONE_HOST + ':' + targetPort
    headers.origin = upstreamOrigin
    headers['sec-fetch-site'] = 'same-origin'
    Object.assign(headers, options.upstreamHeaders || {})
    // The page URL is meaningless to the host and would only leak the port.
    delete headers.referer
    delete headers.forwarded
    delete headers['x-forwarded-host']
    delete headers['x-forwarded-proto']
    const upstream = createUpstreamRequest({
      host: STANDALONE_HOST,
      port: targetPort,
      method: req.method,
      path: req.url !== undefined && req.url !== '' ? req.url : '/',
      headers,
    }, (answer: IncomingMessage) => {
      if (res.headersSent) {
        answer.destroy()
        return
      }
      const responseHeaders: Record<string, string | string[]> = {}
      for (const [name, value] of Object.entries(answer.headers)) {
        if (value === undefined) continue
        const lowerName = name.toLowerCase()
        if (HOP_BY_HOP_HEADERS.includes(lowerName) || lowerName.startsWith('access-control-')) continue
        responseHeaders[name] = value
      }
      responseHeaders['x-content-type-options'] = 'nosniff'
      res.writeHead(answer.statusCode !== undefined ? answer.statusCode : 502, responseHeaders)
      answer.pipe(res)
      answer.once('error', () => { res.destroy() })
    })
    upstream.once('error', (error: unknown) => {
      reportError(error)
      if (!res.headersSent) sendPlain(res, 502, '上游 DSH 服务不可达')
      else res.destroy()
    })
    req.once('aborted', () => { upstream.destroy() })
    req.pipe(upstream)
  }

  let settled = false
  const ready = new Promise<void>((resolve, reject) => {
    const onListenError = (error: unknown): void => {
      if (settled) return
      settled = true
      reject(error)
    }
    server.once('error', onListenError)
    server.listen(requestedPort, STANDALONE_HOST, () => {
      settled = true
      server.removeListener('error', onListenError)
      // Past listen time an error is a client/transport problem, not a reason to
      // reject `ready` again; report it and keep serving.
      server.on('error', (error: unknown) => { reportError(error) })
      const address = server.address()
      if (address !== null && typeof address === 'object' && Number.isInteger(address.port)) listeningPort = address.port
      resolve()
    })
  })
  // Start-up failures are surfaced through `ready`; this keeps an unawaited
  // rejection from tripping the process-level unhandledRejection trap.
  void ready.catch(() => { /* reported by the caller */ })

  const close = (): Promise<void> => new Promise<void>((resolve) => {
    try {
      server.close(() => { resolve() })
      const connections = (server as unknown as { closeAllConnections?: () => void }).closeAllConnections
      if (typeof connections === 'function') connections.call(server)
    } catch (error) {
      resolve()
    }
  })

  return {
    get url(): string {
      return 'http://' + STANDALONE_HOST + ':' + listeningPort
    },
    get port(): number {
      return listeningPort
    },
    ready,
    close,
  }
}

/** Coerce a port-like value, falling back when it is not usable. */
function normalizePort(value: unknown, fallback: number): number {  const port = Number(value)
  if (!Number.isInteger(port) || port < 0 || port > 65535) return fallback
  return port
}

/** The first value of a request header that may legally repeat. */
function firstHeader(value: string | string[] | undefined): string | undefined {
  if (Array.isArray(value)) return typeof value[0] === 'string' ? value[0] : undefined
  return typeof value === 'string' ? value : undefined
}

function canonicalLoopbackHostname(hostname: string): string | null {
  const normalized = hostname.toLowerCase().replace(/^\[|\]$/g, '')
  return LOOPBACK_HOSTNAMES.has(normalized) ? normalized : null
}

/** Split `host:port` / `[::1]:port` into a lowercase hostname and an optional port. */
function parseAuthority(raw: string | undefined): { hostname: string; port: number | null } | null {
  if (typeof raw !== 'string') return null
  const value = raw.trim()
  if (!value || /[\s/@\\?#]/.test(value)) return null
  const closeBracket = value.startsWith('[') ? value.indexOf(']') : -1
  if (closeBracket >= 0) {
    const hostname = value.slice(0, closeBracket + 1).toLowerCase()
    const rest = value.slice(closeBracket + 1)
    if (!rest) return { hostname, port: null }
    if (!rest.startsWith(':')) return null
    const port = Number(rest.slice(1))
    return Number.isInteger(port) && port >= 0 && port <= 65535 ? { hostname, port } : null
  }
  const separator = value.lastIndexOf(':')
  if (separator < 0) return { hostname: value.toLowerCase(), port: null }
  const hostname = value.slice(0, separator).toLowerCase()
  const port = Number(value.slice(separator + 1))
  if (!hostname) return null
  return Number.isInteger(port) && port >= 0 && port <= 65535 ? { hostname, port } : null
}

/** Parse an `Origin` header into hostname plus optional port; protocol is enforced separately. */
function parseOrigin(raw: string | undefined): { hostname: string; port: number | null } | null {
  if (typeof raw !== 'string' || !raw.trim()) return null
  const value = raw.trim()
  if (!/^https?:\/\//i.test(value)) return null
  // The page itself is http on loopback; an https origin is never the same origin.
  if (!/^http:\/\//i.test(value)) return null
  const rest = value.slice('http://'.length)
  const authority = rest.endsWith('/') ? rest.slice(0, -1) : rest
  if (!authority || authority.includes('/')) return null
  return parseAuthority(authority)
}

/** Parse only origin-form request targets; encoded separators stay encoded for whitelist matching. */
function parseRequestPath(rawUrl: string | undefined): { pathname: string; raw: string } | null {
  const raw = typeof rawUrl === 'string' && rawUrl ? rawUrl : '/'
  if (!raw.startsWith('/') || raw.startsWith('//') || /[\\\u0000-\u001f\u007f]/.test(raw)) return null
  try {
    const parsed = new URL(raw, 'http://' + STANDALONE_HOST)
    return { pathname: parsed.pathname, raw }
  } catch (error) {
    return null
  }
}

/** Exact-path-or-subtree match for one whitelist entry. */
function isProxiedPath(pathname: string): boolean {
  for (const prefix of PROXY_PREFIXES) {
    if (prefix.endsWith('/')) {
      if (pathname.startsWith(prefix)) return true
      continue
    }
    if (pathname === prefix) return true
    if (pathname.startsWith(prefix + '/')) return true
    if (pathname.startsWith(prefix + '?')) return true
  }
  return false
}

/** GET and HEAD are the only methods the page shell itself answers. */
function isReadMethod(method: string): boolean {
  return method === 'GET' || method === 'HEAD'
}

/** A plain-text refusal/notice with no reflection of request data. */
function sendPlain(res: ServerResponse, status: number, message: string): void {
  if (res.headersSent) {
    res.destroy()
    return
  }
  const body = Buffer.from(message, 'utf8')
  res.writeHead(status, {
    'Content-Type': 'text/plain; charset=utf-8',
    'Content-Length': String(body.length),
    'Cache-Control': 'no-store',
    'X-Content-Type-Options': 'nosniff',
    'Referrer-Policy': 'no-referrer',
  })
  res.end(body)
}

/** A JSON answer for the handshake and the health probe. */
function sendJson(res: ServerResponse, status: number, payload: unknown, headOnly = false): void {
  if (res.headersSent) {
    res.destroy()
    return
  }
  const body = Buffer.from(JSON.stringify(payload), 'utf8')
  res.writeHead(status, {
    'Content-Type': 'application/json; charset=utf-8',
    'Content-Length': String(body.length),
    'Cache-Control': 'no-store',
    'X-Content-Type-Options': 'nosniff',
    'Referrer-Policy': 'no-referrer',
  })
  if (headOnly) {
    res.end()
    return
  }
  res.end(body)
}

/**
 * Reduce whatever the plugin supplies to the published handshake shape.
 *
 * The page never needs more than "which session am I looking at" and "where does
 * that session live", and this is the last place a leak could happen, so the
 * server — not the caller — decides which fields survive.
 */
function sanitizeContext(raw: unknown): StandaloneContext {
  const source = raw !== null && typeof raw === 'object' ? raw as Record<string, unknown> : {}
  const sessions: StandaloneSession[] = []
  const seen = new Set<string>()
  if (Array.isArray(source.sessions)) {
    for (const row of source.sessions.slice(0, 20)) {
      if (row === null || typeof row !== 'object') continue
      const entry = row as Record<string, unknown>
      const id = clampText(entry.id, 120)
      if (!id || seen.has(id)) continue
      seen.add(id)
      const session: { id: string; title?: string; cwd?: string; updatedAt?: number } = { id }
      const title = clampText(entry.title, 120)
      if (title !== undefined) session.title = title
      const cwd = clampText(entry.cwd, 400)
      if (cwd !== undefined) session.cwd = cwd
      const updatedAt = Number(entry.updatedAt)
      if (Number.isFinite(updatedAt) && updatedAt > 0) session.updatedAt = updatedAt
      sessions.push(session)
    }
  }
  const declared = clampText(source.sessionId, 120)
  const fallback = sessions.length > 0 ? sessions[0].id : null
  return {
    ok: true,
    standalone: true,
    variant: 'tab',
    sessionId: declared !== undefined ? declared : fallback,
    workspace: clampText(source.workspace, 400) ?? null,
    sessions,
  }
}

/** Trim and bound one optional string field; empty means absent. */
function clampText(value: unknown, limit: number): string | undefined {
  if (typeof value !== 'string') return undefined
  const trimmed = value.trim().slice(0, limit)
  return trimmed ? trimmed : undefined
}
