import { createAuthClient } from 'better-auth/vue'

export const { signIn, useSession, signOut } = createAuthClient()
