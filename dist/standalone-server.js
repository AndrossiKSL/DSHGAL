import { createReadStream } from "node:fs";
import { createServer, request } from "node:http";
import { join } from "node:path";
// src/standalone-server.ts
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
/** Default port the independent page listens on. `0` disables it at the call site. */
const STANDALONE_DEFAULT_PORT = 9988;
/** The only address this page ever binds. */
const STANDALONE_HOST = "127.0.0.1";
/** Hostnames a browser may legitimately use to reach a loopback listener. */
const LOOPBACK_HOSTNAMES = /* @__PURE__ */ new Set([
	"127.0.0.1",
	"localhost",
	"::1"
]);
/**
* The proxied surface, spelled exactly as the plugin registers it. The media
* entry keeps its trailing slash (it is a directory prefix); an entry without
* one matches that exact path plus its subtree only, so `/whale-galgame-api-x`
* never matches `/whale-galgame-api`.
*/
const PROXY_PREFIXES = [
	"/whale-galgame-api",
	"/whale-galgame-media/",
	"/character-party/",
	"/character-party-api",
	"/character-party-artifact"
];
/** Hop-by-hop headers that must not be forwarded in either direction. */
const HOP_BY_HOP_HEADERS = [
	"connection",
	"keep-alive",
	"proxy-authenticate",
	"proxy-authorization",
	"te",
	"trailer",
	"transfer-encoding",
	"upgrade"
];
/** Only these two scripts are ever read from disk, by literal name. */
const STATIC_ASSETS = {
	"/runtime.js": {
		file: "standalone-runtime.js",
		type: "text/javascript; charset=utf-8"
	},
	"/client.js": {
		file: "client.js",
		type: "text/javascript; charset=utf-8"
	}
};
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
	"frame-src 'self'",
	"base-uri 'none'",
	"form-action 'none'",
	"frame-ancestors 'none'"
].join("; ");
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
<script src="/runtime.js"><\/script>
<script src="/client.js"><\/script>
</body>
</html>
`;
/**
* Start the loopback-only GAL page.
*
* The server binds before this returns' `ready` settles, so a caller that wants
* a hard failure (for example a CLI probe) can await it; a plugin that must
* survive a taken port just logs the rejection.
* @param options - port, upstream port, static root, context supplier.
* @returns handle with the loopback URL and an idempotent close.
*/
function startStandaloneGal(options) {
	const requestedPort = normalizePort(options.port, STANDALONE_DEFAULT_PORT);
	const upstreamPort = normalizePort(options.upstreamPort, 0);
	if (upstreamPort === 0) throw new Error("standalone page needs a real upstream DSH web port");
	const clientRoot = typeof options.clientRoot === "string" ? options.clientRoot.trim() : "";
	if (!clientRoot) throw new Error("standalone page needs the plugin lib directory as clientRoot");
	const getContext = typeof options.getContext === "function" ? options.getContext : async () => null;
	/** Logger failures stay local: a broken logger must not take serving down. */
	const reportError = (error) => {
		if (typeof options.onError !== "function") return;
		try {
			options.onError(error);
		} catch (loggerFailure) {}
	};
	let listeningPort = requestedPort;
	const server = createServer((req, res) => {
		serve(req, res).catch((error) => {
			reportError(error);
			sendPlain(res, 500, "独立页面内部错误");
		});
	});
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
	function isTrustedRequest(req) {
		const host = parseAuthority(firstHeader(req.headers.host));
		const hostName = host === null ? null : canonicalLoopbackHostname(host.hostname);
		if (host === null || hostName === null) return false;
		const fetchSite = (firstHeader(req.headers["sec-fetch-site"]) ?? "").toLowerCase();
		if (fetchSite === "cross-site" || fetchSite === "same-site") return false;
		if (host.port === null ? fetchSite !== "same-origin" : host.port !== listeningPort) return false;
		const rawOrigin = firstHeader(req.headers.origin);
		if (rawOrigin === void 0) return true;
		const origin = parseOrigin(rawOrigin);
		const originName = origin === null ? null : canonicalLoopbackHostname(origin.hostname);
		if (origin === null || originName !== hostName) return false;
		if (origin.port !== null) return origin.port === listeningPort;
		return fetchSite === "same-origin";
	}
	/**
	* Answer one request. Routes in order: trust gate, proxy whitelist, health,
	* context handshake, page shell, the two runtime scripts, and a plain 404 for
	* everything else — this server never becomes a general file server.
	*/
	async function serve(req, res) {
		const method = typeof req.method === "string" ? req.method.toUpperCase() : "GET";
		if (!isTrustedRequest(req)) {
			sendPlain(res, 403, "拒绝：该独立页面只接受本机同源请求");
			return;
		}
		const target = parseRequestPath(req.url);
		if (target === null) {
			sendPlain(res, 400, "无效的请求路径");
			return;
		}
		if (options.handleRequest && await options.handleRequest(req, res)) return;
		if (isProxiedPath(target.pathname)) {
			proxy(req, res, upstreamPort);
			return;
		}
		if (target.pathname === "/health") {
			if (!isReadMethod(method)) {
				sendPlain(res, 405, "仅支持 GET/HEAD");
				return;
			}
			sendJson(res, 200, {
				ok: true,
				service: "dsh-whale-galgame-standalone"
			}, method === "HEAD");
			return;
		}
		if (target.pathname === "/standalone-context") {
			if (method !== "GET") {
				sendPlain(res, 405, "仅支持 GET");
				return;
			}
			let payload = null;
			try {
				payload = await getContext();
			} catch (error) {
				reportError(error);
			}
			sendJson(res, 200, sanitizeContext(payload));
			return;
		}
		if (target.pathname === "/") {
			if (!isReadMethod(method)) {
				sendPlain(res, 405, "仅支持 GET/HEAD");
				return;
			}
			const body = Buffer.from(STANDALONE_HTML, "utf8");
			res.writeHead(200, {
				"Content-Type": "text/html; charset=utf-8",
				"Content-Length": String(body.length),
				"Cache-Control": "no-store",
				"Content-Security-Policy": CONTENT_SECURITY_POLICY,
				"Cross-Origin-Resource-Policy": "same-origin",
				"Referrer-Policy": "no-referrer",
				"X-Content-Type-Options": "nosniff",
				"X-Frame-Options": "DENY"
			});
			if (method === "HEAD") {
				res.end();
				return;
			}
			res.end(body);
			return;
		}
		const asset = STATIC_ASSETS[target.pathname];
		if (asset !== void 0) {
			if (!isReadMethod(method)) {
				sendPlain(res, 405, "仅支持 GET/HEAD");
				return;
			}
			sendAsset(res, join(clientRoot, asset.file), asset.type, method === "HEAD");
			return;
		}
		sendPlain(res, 404, "未找到");
	}
	/** Stream one of the two runtime scripts straight off disk. */
	function sendAsset(res, file, type, headOnly) {
		const stream = createReadStream(file);
		let opened = false;
		stream.once("open", () => {
			opened = true;
			res.writeHead(200, {
				"Content-Type": type,
				"Cache-Control": "no-store",
				"Cross-Origin-Resource-Policy": "same-origin",
				"X-Content-Type-Options": "nosniff"
			});
			if (headOnly) {
				res.end();
				stream.destroy();
				return;
			}
			stream.pipe(res);
		});
		stream.once("error", (error) => {
			if (opened) {
				res.destroy();
				return;
			}
			reportError(error);
			sendPlain(res, 404, "运行时文件不可用");
		});
	}
	/**
	* Forward one whitelisted request to the DSH host. The upstream only ever
	* sees its own origin: `Host` and `Origin` are rewritten so the host's own
	* request checks see the same shape they see from the main UI, and the
	* standalone port never leaks upstream.
	*/
	function proxy(req, res, targetPort) {
		const upstreamOrigin = "http://127.0.0.1:" + targetPort;
		const headers = {};
		for (const [name, value] of Object.entries(req.headers)) {
			if (value === void 0) continue;
			if (HOP_BY_HOP_HEADERS.includes(name.toLowerCase())) continue;
			headers[name] = value;
		}
		headers.host = "127.0.0.1:" + targetPort;
		headers.origin = upstreamOrigin;
		headers["sec-fetch-site"] = "same-origin";
		Object.assign(headers, options.upstreamHeaders || {});
		delete headers.referer;
		delete headers.forwarded;
		delete headers["x-forwarded-host"];
		delete headers["x-forwarded-proto"];
		const upstream = request({
			host: STANDALONE_HOST,
			port: targetPort,
			method: req.method,
			path: req.url !== void 0 && req.url !== "" ? req.url : "/",
			headers
		}, (answer) => {
			if (res.headersSent) {
				answer.destroy();
				return;
			}
			const responseHeaders = {};
			for (const [name, value] of Object.entries(answer.headers)) {
				if (value === void 0) continue;
				const lowerName = name.toLowerCase();
				if (HOP_BY_HOP_HEADERS.includes(lowerName) || lowerName.startsWith("access-control-")) continue;
				responseHeaders[name] = value;
			}
			responseHeaders["x-content-type-options"] = "nosniff";
			res.writeHead(answer.statusCode !== void 0 ? answer.statusCode : 502, responseHeaders);
			answer.pipe(res);
			answer.once("error", () => {
				res.destroy();
			});
		});
		upstream.once("error", (error) => {
			reportError(error);
			if (!res.headersSent) sendPlain(res, 502, "上游 DSH 服务不可达");
			else res.destroy();
		});
		req.once("aborted", () => {
			upstream.destroy();
		});
		req.pipe(upstream);
	}
	let settled = false;
	const ready = new Promise((resolve, reject) => {
		const onListenError = (error) => {
			if (settled) return;
			settled = true;
			reject(error);
		};
		server.once("error", onListenError);
		server.listen(requestedPort, STANDALONE_HOST, () => {
			settled = true;
			server.removeListener("error", onListenError);
			server.on("error", (error) => {
				reportError(error);
			});
			const address = server.address();
			if (address !== null && typeof address === "object" && Number.isInteger(address.port)) listeningPort = address.port;
			resolve();
		});
	});
	ready.catch(() => {});
	const close = () => new Promise((resolve) => {
		try {
			server.close(() => {
				resolve();
			});
			const connections = server.closeAllConnections;
			if (typeof connections === "function") connections.call(server);
		} catch (error) {
			resolve();
		}
	});
	return {
		get url() {
			return "http://127.0.0.1:" + listeningPort;
		},
		get port() {
			return listeningPort;
		},
		ready,
		close
	};
}
/** Coerce a port-like value, falling back when it is not usable. */
function normalizePort(value, fallback) {
	const port = Number(value);
	if (!Number.isInteger(port) || port < 0 || port > 65535) return fallback;
	return port;
}
/** The first value of a request header that may legally repeat. */
function firstHeader(value) {
	if (Array.isArray(value)) return typeof value[0] === "string" ? value[0] : void 0;
	return typeof value === "string" ? value : void 0;
}
function canonicalLoopbackHostname(hostname) {
	const normalized = hostname.toLowerCase().replace(/^\[|\]$/g, "");
	return LOOPBACK_HOSTNAMES.has(normalized) ? normalized : null;
}
/** Split `host:port` / `[::1]:port` into a lowercase hostname and an optional port. */
function parseAuthority(raw) {
	if (typeof raw !== "string") return null;
	const value = raw.trim();
	if (!value || /[\s/@\\?#]/.test(value)) return null;
	const closeBracket = value.startsWith("[") ? value.indexOf("]") : -1;
	if (closeBracket >= 0) {
		const hostname = value.slice(0, closeBracket + 1).toLowerCase();
		const rest = value.slice(closeBracket + 1);
		if (!rest) return {
			hostname,
			port: null
		};
		if (!rest.startsWith(":")) return null;
		const port = Number(rest.slice(1));
		return Number.isInteger(port) && port >= 0 && port <= 65535 ? {
			hostname,
			port
		} : null;
	}
	const separator = value.lastIndexOf(":");
	if (separator < 0) return {
		hostname: value.toLowerCase(),
		port: null
	};
	const hostname = value.slice(0, separator).toLowerCase();
	const port = Number(value.slice(separator + 1));
	if (!hostname) return null;
	return Number.isInteger(port) && port >= 0 && port <= 65535 ? {
		hostname,
		port
	} : null;
}
/** Parse an `Origin` header into hostname plus optional port; protocol is enforced separately. */
function parseOrigin(raw) {
	if (typeof raw !== "string" || !raw.trim()) return null;
	const value = raw.trim();
	if (!/^https?:\/\//i.test(value)) return null;
	if (!/^http:\/\//i.test(value)) return null;
	const rest = value.slice(7);
	const authority = rest.endsWith("/") ? rest.slice(0, -1) : rest;
	if (!authority || authority.includes("/")) return null;
	return parseAuthority(authority);
}
/** Parse only origin-form request targets; encoded separators stay encoded for whitelist matching. */
function parseRequestPath(rawUrl) {
	const raw = typeof rawUrl === "string" && rawUrl ? rawUrl : "/";
	if (!raw.startsWith("/") || raw.startsWith("//") || /[\\\u0000-\u001f\u007f]/.test(raw)) return null;
	try {
		return {
			pathname: new URL(raw, "http://127.0.0.1").pathname,
			raw
		};
	} catch (error) {
		return null;
	}
}
/** Exact-path-or-subtree match for one whitelist entry. */
function isProxiedPath(pathname) {
	for (const prefix of PROXY_PREFIXES) {
		if (prefix.endsWith("/")) {
			if (pathname.startsWith(prefix)) return true;
			continue;
		}
		if (pathname === prefix) return true;
		if (pathname.startsWith(prefix + "/")) return true;
		if (pathname.startsWith(prefix + "?")) return true;
	}
	return false;
}
/** GET and HEAD are the only methods the page shell itself answers. */
function isReadMethod(method) {
	return method === "GET" || method === "HEAD";
}
/** A plain-text refusal/notice with no reflection of request data. */
function sendPlain(res, status, message) {
	if (res.headersSent) {
		res.destroy();
		return;
	}
	const body = Buffer.from(message, "utf8");
	res.writeHead(status, {
		"Content-Type": "text/plain; charset=utf-8",
		"Content-Length": String(body.length),
		"Cache-Control": "no-store",
		"X-Content-Type-Options": "nosniff",
		"Referrer-Policy": "no-referrer"
	});
	res.end(body);
}
/** A JSON answer for the handshake and the health probe. */
function sendJson(res, status, payload, headOnly = false) {
	if (res.headersSent) {
		res.destroy();
		return;
	}
	const body = Buffer.from(JSON.stringify(payload), "utf8");
	res.writeHead(status, {
		"Content-Type": "application/json; charset=utf-8",
		"Content-Length": String(body.length),
		"Cache-Control": "no-store",
		"X-Content-Type-Options": "nosniff",
		"Referrer-Policy": "no-referrer"
	});
	if (headOnly) {
		res.end();
		return;
	}
	res.end(body);
}
/**
* Reduce whatever the plugin supplies to the published handshake shape.
*
* The page never needs more than "which session am I looking at" and "where does
* that session live", and this is the last place a leak could happen, so the
* server — not the caller — decides which fields survive.
*/
function sanitizeContext(raw) {
	const source = raw !== null && typeof raw === "object" ? raw : {};
	const sessions = [];
	const seen = /* @__PURE__ */ new Set();
	if (Array.isArray(source.sessions)) for (const row of source.sessions.slice(0, 20)) {
		if (row === null || typeof row !== "object") continue;
		const entry = row;
		const id = clampText(entry.id, 120);
		if (!id || seen.has(id)) continue;
		seen.add(id);
		const session = { id };
		const title = clampText(entry.title, 120);
		if (title !== void 0) session.title = title;
		const cwd = clampText(entry.cwd, 400);
		if (cwd !== void 0) session.cwd = cwd;
		const updatedAt = Number(entry.updatedAt);
		if (Number.isFinite(updatedAt) && updatedAt > 0) session.updatedAt = updatedAt;
		sessions.push(session);
	}
	const declared = clampText(source.sessionId, 120);
	const fallback = sessions.length > 0 ? sessions[0].id : null;
	return {
		ok: true,
		standalone: true,
		variant: "tab",
		sessionId: declared !== void 0 ? declared : fallback,
		workspace: clampText(source.workspace, 400) ?? null,
		sessions
	};
}
/** Trim and bound one optional string field; empty means absent. */
function clampText(value, limit) {
	if (typeof value !== "string") return void 0;
	const trimmed = value.trim().slice(0, limit);
	return trimmed ? trimmed : void 0;
}
export { STANDALONE_DEFAULT_PORT, startStandaloneGal };
