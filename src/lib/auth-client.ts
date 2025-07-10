import { createAuthClient } from 'better-auth/vue'
import { passkeyClient } from 'better-auth/client/plugins'

export const { signIn, useSession, signOut, passkey } = createAuthClient({
  plugins: [passkeyClient()],
})
