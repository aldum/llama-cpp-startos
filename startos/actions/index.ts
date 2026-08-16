import { sdk } from '../sdk'
import { setModel } from './setModel'
import { setUiPassword } from './setUiPassword'
import { deleteModelCache } from './deleteModelCache'
import { enableLocalAccess } from './enableLocalAccess'

export const actions = sdk.Actions.of()
  .addAction(setModel)
  .addAction(setUiPassword)
  .addAction(deleteModelCache)
  .addAction(enableLocalAccess)
