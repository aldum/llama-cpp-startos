import { storeJson } from '../fileModels/store.json'
import { i18n } from '../i18n'
import { sdk } from '../sdk'

export const enableLocalAccess = sdk.Action.withoutInput(
  'enable-local-access',

  async ({ effects }) => ({
    name: i18n('Enable Local Access'),
    description: i18n(
      'Opens the unauthenticated local interface. LAN addresses are reachable by default; public addresses stay off unless you enable them.',
    ),
    warning: i18n(
      'Nothing authenticates this interface. Anyone who can reach it can use your model.',
    ),
    allowedStatuses: 'any',
    group: null,
    visibility: 'enabled',
  }),

  async ({ effects }) => {
    await storeJson.merge(effects, { localAccess: true })

    return {
      version: '1' as const,
      title: 'Local Access',
      message: 'The unauthenticated local interface is now enabled.',
      result: null,
    }
  },
)
