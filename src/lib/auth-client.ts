import { createAuthClient } from 'better-auth/vue'
import { passkeyClient } from '@better-auth/passkey/client'

export const { signIn, signOut, passkey } = createAuthClient({
  plugins: [passkeyClient()],
})
