import type { UserConfig } from 'tsdown'
import { clientBundle, standaloneRuntimeBundle } from './build/tsdown.client.ts'

const client = clientBundle('dsh-whale-galgame', ['src/index.ts'], {
  portableCssModuleIds: true,
})

/**
 * Three artifacts, one build:
 * - `dist/index.js` — the node half (host routes, scenario engine, image bridge);
 * - `dist/client.js` — the browser half as a `__ModuleLoader__.load` closure
 *   factory loaded by DSH Web;
 * - `dist/standalone-runtime.js` — the loopback page runtime (`src/standalone-server.ts`
 *   serves it next to `dist/client.js`), emitted with the client pass because it
 *   is a browser artifact and must not be built twice per build face.
 *
 * The runtime is optional at build time only: a checkout without React still
 * builds the plugin, and the page reports the missing runtime instead of going
 * blank. See `standaloneRuntimeBundle` for the exact conditions.
 */
export default (inlineConfig: Parameters<typeof client>[0]): UserConfig[] => {
  const configs = client(inlineConfig)
  const face = inlineConfig && inlineConfig.env ? inlineConfig.env.DSH_BUILD_FACE : undefined
  if (face === 'host') return configs
  const runtime = standaloneRuntimeBundle('dsh-whale-galgame', 'src/client/standalone-runtime.ts')
  const serverSupport: UserConfig = {
    name: 'desktop-server-support',
    entry: { 'standalone-server': 'src/standalone-server.ts', 'art-packs': 'src/art-packs.ts', 'default-art': 'src/default-art.ts' },
    outDir: 'dist', format: 'esm', platform: 'node', target: 'es2022', dts: false,
    clean: false, fixedExtension: false, codeSplitting: false,
  }
  return runtime === null ? [...configs, serverSupport] : [...configs, runtime, serverSupport]
}
