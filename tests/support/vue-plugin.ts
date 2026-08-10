import { plugin } from 'bun'
import { readFileSync } from 'node:fs'
import { createHash } from 'node:crypto'
import { compileScript, compileTemplate, parse } from 'vue/compiler-sfc'

/**
 * Bun resolves a `.vue` import to the file path as a string, so components
 * cannot be mounted without compiling them first. This registers a loader that
 * runs Vue's own SFC compiler, which is what the dev server and build already
 * use, so tests exercise the same output.
 *
 * Styles are dropped: the tests assert on markup and behaviour, and scoped CSS
 * is not applied by jsdom-style environments anyway.
 */
plugin({
  name: 'vue-sfc',
  setup(build) {
    build.onLoad({ filter: /\.vue$/ }, ({ path }) => {
      const source = readFileSync(path, 'utf8')
      const id = createHash('sha256').update(path).digest('hex').slice(0, 8)
      const { descriptor } = parse(source, { filename: path })

      if (descriptor.script || descriptor.scriptSetup) {
        const compiled = compileScript(descriptor, { id, inlineTemplate: true })
        return { contents: compiled.content, loader: 'ts' }
      }

      // Template-only component: compile the render function on its own.
      const template = compileTemplate({
        source: descriptor.template?.content ?? '',
        filename: path,
        id,
      })

      return {
        contents: `${template.code}\nexport default { render }`,
        loader: 'ts',
      }
    })
  },
})
