/**
 * dsh-whale-galgame — standalone page runtime.
 *
 * The plugin's browser half is compiled as a loader artifact: `dist/client.js`
 * calls `window.__ModuleLoader__.load({ id, factory })` and resolves `react`
 * through the factory's `require`, because inside DSH Web the shell owns the
 * module table that answers those two specifiers. This file is that same
 * contract for the loopback page served by `src/standalone-server.ts`:
 *
 * 1. it installs a loader with the identical `load()` shape, so the real
 *    `dist/client.js` registers itself exactly as it does inside the main UI;
 * 2. it hands the factory the only two modules the bundle asks for — a bundled
 *    `react` and `react-dom/client` — which keeps one React instance for the
 *    whole page;
 * 3. it fetches `/standalone-context` first, publishes the read-only
 *    `__WHALE_GAL_STANDALONE__` marker the client reads, then runs the plugin's
 *    `apply()` and renders the `conversation.view` component it registered.
 *
 * Nothing is re-implemented here: the game on this page is the same bundle, the
 * same components and the same `/whale-galgame-api` calls as the tab inside DSH,
 * and every failure ends in visible text rather than an empty page.
 */
import * as ReactNamespace from 'react'
import * as ReactDomClientNamespace from 'react-dom/client'

type ModuleFactory = (require: (specifier: string) => unknown) => unknown

/** Plugin id stamped into `dist/client.js` by the build banner. */
const PLUGIN_ID = 'dsh-whale-galgame'
/** The marker the client half reads to know it is the whole page, not a tab. */
const FLAG_KEY = '__WHALE_GAL_STANDALONE__'
/** Slot that renders the galgame inside the main UI's conversation view. */
const VIEW_SLOT = 'conversation.view'
const STYLE_ID = 'whg-standalone-runtime-style'
const ERROR_TITLE = '独立页启动失败'
const ERROR_HINT = '重新载入这一页可以再试一次；如果一直失败，请查看 DSH 的日志。'

/**
 * A CJS browser package arrives from the bundler as `{ default: module.exports,
 * ...named }`. The client factory calls `__toESM(require('react'), 1)`, which
 * sets `default` to whatever we return, so each shim must BE the module object
 * (own `createElement` / `createRoot`), not a wrapper around it.
 */
function moduleObject(namespace: unknown): Record<string, unknown> {
  if (namespace !== null && typeof namespace === 'object') {
    const candidate = (namespace as { default?: unknown }).default
    if ((typeof candidate === 'object' && candidate !== null) || typeof candidate === 'function') {
      return candidate as Record<string, unknown>
    }
    return namespace as Record<string, unknown>
  }
  return Object.create(null) as Record<string, unknown>
}

const reactRuntime = moduleObject(ReactNamespace)
const reactDomClientRuntime = moduleObject(ReactDomClientNamespace)

/** Registered plugin factories, keyed by plugin id, exactly like the shell's table. */
const factories = new Map<string, ModuleFactory>()

/** One boot per document; a second `load` must not double-mount the game. */
let booted = false
/** Set by `apply()` through the fake slot table: the component the page renders. */
let registeredView: ((props: Record<string, unknown>) => unknown) | null = null
/** Cleanups registered through `ctx.effect`, run only if the page ever unmounts. */
const disposers: Array<() => void> = []

/** Human-readable one-liner for any thrown value. */
function describeError(error: unknown): string {
  if (error instanceof Error) return error.message || error.name || '未知错误'
  if (typeof error === 'string' && error) return error
  return '未知错误'
}

/** The mount point the served HTML provides. */
function rootElement(): HTMLElement | null {
  return document.getElementById('root')
}

/**
 * Paint a failure the user can read. Plain DOM with `textContent` only: the
 * message may quote a server or runtime error, so it must never be parsed as
 * markup.
 */
function showFailure(detail: string, hint = ERROR_HINT): void {
  const container = rootElement()
  if (container === null) return
  const box = document.createElement('div')
  box.className = 'whg-standalone-error'
  box.setAttribute('role', 'alert')
  const heading = document.createElement('h1')
  heading.textContent = ERROR_TITLE
  const body = document.createElement('p')
  body.textContent = detail
  const footnote = document.createElement('p')
  footnote.className = 'whg-standalone-hint'
  footnote.textContent = hint
  box.append(heading, body, footnote)
  container.replaceChildren(box)
  console.error('[whale-galgame standalone] ' + detail)
}

/** The minimum chrome for the notices; the game's own CSS comes from the bundle. */
function installRuntimeStyles(): void {
  if (document.getElementById(STYLE_ID) !== null) return
  const tag = document.createElement('style')
  tag.id = STYLE_ID
  tag.textContent = [
    'html,body{margin:0;width:100%;height:100%;background:#050b18;color:#eaf5ff}',
    'body{font-family:system-ui,"Segoe UI","Microsoft YaHei",sans-serif}',
    '#root{position:fixed;inset:0;display:flex;min-height:0;overflow:hidden}',
    '#whg-standalone-status{margin:auto;padding:24px 28px;max-width:34em;text-align:center;line-height:1.75;color:#9fc7e6}',
    '.whg-standalone-error{margin:auto;padding:26px 30px;max-width:38em;border:1px solid #2b4a63;border-radius:14px;background:#08192b;color:#dbeaf7;line-height:1.75;text-align:left}',
    '.whg-standalone-error h1{margin:0 0 10px;font-size:17px;font-weight:600;color:#f0c987}',
    '.whg-standalone-error p{margin:0 0 8px;font-size:13px;word-break:break-word}',
    '.whg-standalone-hint{color:#8fb2cc}',
  ].join('\n')
  document.head.appendChild(tag)
}

/**
 * The loader the client bundle talks to. Deliberately tolerant: the factory body
 * runs inside the page's parse phase, so a bad payload must never throw back into
 * `dist/client.js`'s top level (that would only produce an opaque script error).
 */
function installLoader(): void {
  const page = window as unknown as Record<string, unknown>
  const existing = page.__ModuleLoader__
  if (existing !== undefined && existing !== null) {
    // Something already owns the contract (e.g. a future embedded host). Never
    // silently replace it; the boot step reports the missing factory instead.
    console.warn('[whale-galgame standalone] window.__ModuleLoader__ already exists; keeping it')
    return
  }
  page.__ModuleLoader__ = {
    load(payload: unknown): void {
      try {
        if (payload === null || typeof payload !== 'object') return
        const entry = payload as { id?: unknown; factory?: unknown }
        const id = typeof entry.id === 'string' ? entry.id : ''
        if (!id || typeof entry.factory !== 'function') return
        factories.set(id, entry.factory as ModuleFactory)
      } catch (error) {
        console.error('[whale-galgame standalone] module registration failed', error)
      }
    },
  }
}

/** The two-module `require` the bundle expects. Anything else is a hard error. */
function requireModule(specifier: string): unknown {
  if (specifier === 'react') return reactRuntime
  if (specifier === 'react-dom/client') return reactDomClientRuntime
  throw new Error('独立页运行时没有提供模块：' + specifier)
}

/**
 * The plugin's side of the cordis contract, reduced to what the client half
 * actually touches: `slots` (the view registrations), `get('slots')`, and
 * `effect` (cleanups, which cordis also runs immediately).
 *
 * `slots.inject(name, register)` is invoked exactly like the real slot service
 * invokes it: the callback runs at once and its `slots.register(...)` call is the
 * handoff. Only `conversation.view` is captured — `shell.overlay` and the
 * settings tab have no host to attach to on a page that is nothing but the game.
 */
function createPluginContext(): Record<string, unknown> {
  const slots = {
    inject(name: string, register: unknown): () => void {
      if (name !== VIEW_SLOT || typeof register !== 'function') return () => { /* nothing to release */ }
      try {
        const dispose = (register as () => unknown)()
        if (typeof dispose === 'function') disposers.push(dispose as () => void)
      } catch (error) {
        console.error('[whale-galgame standalone] slot injection failed', error)
      }
      return () => { /* released with the page */ }
    },
    register(meta: unknown, component: unknown): () => void {
      const name = meta !== null && typeof meta === 'object'
        ? String((meta as { name?: unknown }).name ?? '')
        : ''
      if (name === VIEW_SLOT && typeof component === 'function' && registeredView === null) {
        registeredView = component as (props: Record<string, unknown>) => unknown
      }
      return () => { /* released with the page */ }
    },
  }
  return {
    slots,
    get(key: unknown): unknown {
      return key === 'slots' ? slots : undefined
    },
    effect(callback: unknown): () => void {
      if (typeof callback !== 'function') return () => { /* nothing to release */ }
      try {
        const dispose = (callback as () => unknown)()
        // cordis runs the callback now and keeps the returned disposer; so do we.
        if (typeof dispose === 'function') disposers.push(dispose as () => void)
      } catch (error) {
        console.error('[whale-galgame standalone] effect failed', error)
      }
      return () => { /* released with the page */ }
    },
    on(): () => void {
      return () => { /* the page subscribes to nothing */ }
    },
    emit(): void { /* the page emits nothing */ },
  }
}

/**
 * A render boundary, so a component throw shows text instead of a blank page.
 * Built from the runtime's React because the plugin bundle shares that instance.
 */
function createRenderBoundary(react: Record<string, any>): unknown {
  function StandaloneFailure(props: { detail: string }): unknown {
    return react.createElement('div', { className: 'whg-standalone-error', role: 'alert' },
      react.createElement('h1', null, ERROR_TITLE),
      react.createElement('p', null, props.detail),
      react.createElement('p', { className: 'whg-standalone-hint' }, ERROR_HINT))
  }
  class StandaloneBoundary extends react.Component {
    constructor(props: unknown) {
      super(props)
      this.state = { error: null }
    }
    static getDerivedStateFromError(error: unknown): Record<string, unknown> {
      return { error }
    }
    componentDidCatch(error: unknown, info: unknown): void {
      console.error('[whale-galgame standalone] render failed', error, info)
    }
    render(): unknown {
      const error = (this.state as { error?: unknown } | null)?.error
      if (error) return react.createElement(StandaloneFailure, { detail: describeError(error) })
      const props = this.props as { children?: unknown } | null
      return props && props.children !== undefined ? props.children : null
    }
  }
  return StandaloneBoundary
}

/**
 * Boot the page: context first, then the plugin factory, then `apply()`, then the
 * registered view into `#root`. Every step either succeeds or paints a readable
 * failure — the loading notice is replaced either way.
 */
async function boot(): Promise<void> {
  if (booted) return
  booted = true
  installRuntimeStyles()
  const response = await fetch('/standalone-context', {
    method: 'GET',
    headers: { accept: 'application/json' },
    credentials: 'same-origin',
    cache: 'no-store',
  })
  if (!response.ok) throw new Error('读取独立页上下文失败（HTTP ' + response.status + '）')
  const context: unknown = await response.json()
  const source = context !== null && typeof context === 'object' ? context as Record<string, unknown> : {}
  const sessionId = typeof source.sessionId === 'string' && source.sessionId.trim() ? source.sessionId.trim() : ''
  // Published before `apply()` runs: the client half reads it synchronously to
  // treat this page as the whole game (no chat behind it) and to keep the title
  // screen as the exit target.
  Object.defineProperty(window, FLAG_KEY, {
    value: Object.freeze({ standalone: true, variant: 'tab', sessionId: sessionId || null }),
    writable: false,
    configurable: false,
    enumerable: false,
  })
  const factory = factories.get(PLUGIN_ID)
  if (factory === undefined) {
    throw new Error('插件客户端还没有注册：/client.js 没有加载成功（先构建 dist/client.js）')
  }
  const plugin = factory(requireModule)
  if (plugin === null || typeof plugin !== 'object') throw new Error('插件客户端没有导出任何东西')
  const apply = (plugin as { apply?: unknown }).apply
  if (typeof apply !== 'function') throw new Error('插件客户端缺少 apply() 入口')
  ;(apply as (ctx: unknown) => void)(createPluginContext())
  const view = registeredView as ((props: Record<string, unknown>) => unknown) | null
  if (view === null) throw new Error('插件客户端没有注册 conversation.view（galgame）组件')
  const container = rootElement()
  if (container === null) throw new Error('页面缺少 #root 挂载点')
  container.replaceChildren()
  const createRoot = reactDomClientRuntime.createRoot
  if (typeof createRoot !== 'function') throw new Error('react-dom/client 缺少 createRoot')
  const root = (createRoot as (element: Element) => { render: (node: unknown) => void; unmount: () => void })(container)
  const Boundary = createRenderBoundary(reactRuntime as Record<string, any>)
  root.render(reactRuntime.createElement(Boundary, null, reactRuntime.createElement(view, {
    useSessions: null,
    sessionId: sessionId || undefined,
    variant: 'tab',
    standalone: true,
  })))
  window.addEventListener('pagehide', () => {
    for (const dispose of disposers.splice(0)) {
      try {
        dispose()
      } catch (error) { /* teardown is best-effort */ }
    }
    try {
      root.unmount()
    } catch (error) { /* already gone */ }
  }, { once: true })
}

/** Run `boot` and turn any failure into visible text. */
function start(): void {
  void boot().catch((error: unknown) => {
    installRuntimeStyles()
    showFailure(describeError(error))
  })
}

// Read-only inspection for automated game checks; no backend request or plot advance.
;(window as unknown as Record<string, unknown>).render_game_to_text = () => JSON.stringify({
  coordinates: 'DOM pixels, origin top left',
  screen: document.querySelector('[aria-label="标题菜单"]') ? 'title' : 'story',
  viewport: { width: innerWidth, height: innerHeight },
  text: (document.getElementById('root')?.innerText || '').slice(0, 5000),
  actions: Array.from(document.querySelectorAll<HTMLButtonElement>('button'))
    .filter(button => button.getClientRects().length > 0)
    .map(button => button.getAttribute('aria-label') || button.innerText.trim()).filter(Boolean),
})

installLoader()
// Both scripts are classic and ordered in the served HTML, so the plugin factory
// is registered by the time `load` fires. `readyState` covers the (unlikely) case
// of this file being evaluated after the document already finished.
if (document.readyState === 'complete') start()
else window.addEventListener('load', start, { once: true })
