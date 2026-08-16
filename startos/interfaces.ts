import { i18n } from './i18n'
import { sdk } from './sdk'
import { storeJson } from './fileModels/store.json'
import { apiHostId, apiPort, uiUsername, localHostId } from './utils'

export const setInterfaces = sdk.setupInterfaces(async ({ effects }) => {
  // llama-server itself runs keyless; the OS reverse proxy enforces basic auth
  // at the edge. The Set UI Password critical task blocks the service from
  // starting until a password is set, so the empty fallback never serves.
  const password =
    (await storeJson.read((s) => s?.uiPassword).const(effects)) ?? ''

  const apiMulti = sdk.MultiHost.of(effects, apiHostId)
  const apiMultiOrigin = await apiMulti.bindPort(apiPort, {
    protocol: 'http',
    addSsl: {
      auth: {
        type: 'basic',
        credentials: [{ username: uiUsername, password }],
        realm: null,
      },
    },
  })

  const api = sdk.createInterface(effects, {
    name: i18n('llama.cpp Server'),
    id: 'api',
    description: i18n('OpenAI-compatible API and built-in chat UI'),
    type: 'ui',
    masked: false,
    schemeOverride: null,
    username: null,
    path: '',
    query: {},
  })

  const receipts = [await apiMultiOrigin.export([api])]

  // Local interface: the same llama-server, on a second host with no
  // authentication at all. Disabled by default; the Enable Local Access
  // action sets the `localAccess` flag that brings it up.
  const localAccess = await storeJson.read((s) => s?.localAccess).const(effects)

  if (localAccess === true) {
    const localMulti = sdk.MultiHost.of(effects, localHostId)
    const localOrigin = await localMulti.bindPort(apiPort, {
      protocol: 'http',
    })
    const local = sdk.createInterface(effects, {
      name: i18n('llama.cpp Local'),
      id: 'local',
      description: i18n('Unauthenticated access for local clients'),
      type: 'ui',
      masked: false,
      schemeOverride: null,
      username: null,
      path: '',
      query: {},
    })
    receipts.push(await localOrigin.export([local]))
  }

  return receipts
})
