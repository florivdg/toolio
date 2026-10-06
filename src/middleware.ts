import { auth } from '@/lib/auth'
import { requiresSession, signInRedirect } from '@/lib/auth-access'
import { defineMiddleware } from 'astro:middleware'

export const onRequest = defineMiddleware(async (context, next) => {
  const currentPath = new URL(context.request.url).pathname

  const isAuthed = await auth.api.getSession({
    headers: context.request.headers,
  })

  if (isAuthed) {
    context.locals.user = isAuthed.user
    context.locals.session = isAuthed.session

    // Signing in again when already signed in just lands on the home page.
    if (currentPath === '/sign-in') return context.redirect('/')
  } else {
    context.locals.user = null
    context.locals.session = null

    if (requiresSession(currentPath)) {
      return context.redirect(signInRedirect(currentPath))
    }
  }

  return next()
})
