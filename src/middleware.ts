import { auth } from '@/lib/auth'
import { defineMiddleware } from 'astro:middleware'

export const onRequest = defineMiddleware(async (context, next) => {
  // Get the current path
  const url = new URL(context.request.url)
  const currentPath = url.pathname

  // List of public paths that don't require authentication
  const publicPaths = ['/sign-in', '/api/auth']

  // Check if the current path is a public path
  const isPublicPath = publicPaths.some(
    (path) => currentPath === path || currentPath.startsWith(path + '/'),
  )

  const isAuthed = await auth.api.getSession({
    headers: context.request.headers,
  })

  if (isAuthed) {
    context.locals.user = isAuthed.user
    context.locals.session = isAuthed.session

    // If user is authenticated and trying to access sign-in page, redirect to home
    if (currentPath === '/sign-in') {
      return context.redirect('/')
    }
  } else {
    context.locals.user = null
    context.locals.session = null

    // If user is not authenticated and trying to access a protected path, redirect to sign-in
    if (!isPublicPath) {
      // Add the current path as a redirect parameter
      let redirectPath = '/sign-in'
      if (currentPath !== '/') {
        redirectPath = `/sign-in?redirect=${encodeURIComponent(currentPath)}`
      }
      return context.redirect(redirectPath)
    }
  }

  return next()
})
