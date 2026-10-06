import { afterEach, beforeEach, describe, expect, test } from 'bun:test'
import {
  chmodSync,
  existsSync,
  mkdirSync,
  mkdtempSync,
  rmSync,
  writeFileSync,
} from 'fs'
import { tmpdir } from 'os'
import { join } from 'path'

/**
 * Runs the real cron script against a stand-in `curl` on PATH, which records
 * its arguments and stdin and answers as told. Nothing goes over the network,
 * and the script gets a clean environment rather than the developer's .env.
 */

const SCRIPT = join(import.meta.dir, '../../scripts/update-prices-cron.sh')
const SECRET = 'test-only-cron-secret'
const SERVER_URL = 'http://cron-fixture.invalid:4321'

const FAKE_CURL = `#!/bin/sh
echo call >>"$FAKE_CURL_DIR/calls"
for arg in "$@"; do printf '%s\\n' "$arg"; done >"$FAKE_CURL_DIR/args"
cat >"$FAKE_CURL_DIR/stdin"
while [ $# -gt 0 ]; do
  if [ "$1" = --output ]; then printf '%s' "$FAKE_CURL_BODY" >"$2"; fi
  shift
done
printf '%s' "$FAKE_CURL_STATUS"
exit "$FAKE_CURL_EXIT"
`

let dir: string

beforeEach(() => {
  dir = mkdtempSync(join(tmpdir(), 'toolio-cron-'))
  writeFileSync(join(dir, 'curl'), FAKE_CURL)
  chmodSync(join(dir, 'curl'), 0o755)
})

afterEach(() => {
  rmSync(dir, { recursive: true, force: true })
})

function runCron(
  env: Record<string, string> = {},
  curl: { status?: string; exit?: number; body?: string } = {},
) {
  const result = Bun.spawnSync(['sh', SCRIPT], {
    env: {
      PATH: `${dir}:${process.env.PATH}`,
      CRON_ENV_DIR: join(dir, 'cron-env'),
      FAKE_CURL_DIR: dir,
      FAKE_CURL_STATUS: curl.status ?? '200',
      FAKE_CURL_EXIT: String(curl.exit ?? 0),
      FAKE_CURL_BODY: curl.body ?? '{"success":true}',
      ...env,
    },
  })

  return {
    exitCode: result.exitCode,
    output: result.stdout.toString() + result.stderr.toString(),
  }
}

const curlArgs = () => Bun.file(join(dir, 'args')).text()
const curlStdin = () => Bun.file(join(dir, 'stdin')).text()
const curlCalls = async () => {
  const calls = await Bun.file(join(dir, 'calls')).text()
  return calls.trim().split('\n').length
}

describe('update-prices-cron.sh', () => {
  test('POSTs JSON to the price endpoint', async () => {
    const { exitCode, output } = runCron({
      PRICE_UPDATE_CRON_SECRET: SECRET,
      SERVER_URL,
    })

    expect(exitCode).toBe(0)
    expect(output).toContain('completed successfully (HTTP 200)')

    const args = await curlArgs()
    expect(args).toContain(`-X\nPOST\n${SERVER_URL}/api/itunes/update-prices\n`)
    expect(args).toContain('-H\nContent-Type: application/json\n')
    expect(args).toContain('--data\n{}\n')
  })

  /** Arguments are visible to every user in the process list; stdin is not. */
  test('hands the bearer secret to curl on stdin only', async () => {
    const { output } = runCron({ PRICE_UPDATE_CRON_SECRET: SECRET, SERVER_URL })

    const args = await curlArgs()
    expect(args).toContain('-H\n@-\n')
    expect(args).not.toContain(SECRET)
    expect(await curlStdin()).toBe(`Authorization: Bearer ${SECRET}\n`)
    expect(output).not.toContain(SECRET)
  })

  test('reads the secret and URL from the root-only cron files', async () => {
    const envDir = join(dir, 'cron-env')
    mkdirSync(envDir)
    writeFileSync(join(envDir, 'price-update-secret'), SECRET)
    writeFileSync(join(envDir, 'server-url'), SERVER_URL)

    expect(runCron().exitCode).toBe(0)
    expect(await curlArgs()).toContain(
      `${SERVER_URL}/api/itunes/update-prices\n`,
    )
    expect(await curlStdin()).toBe(`Authorization: Bearer ${SECRET}\n`)
  })

  test('fails with curl’s exit code when the server refuses', async () => {
    const { exitCode, output } = runCron(
      { PRICE_UPDATE_CRON_SECRET: SECRET, SERVER_URL },
      {
        status: '401',
        exit: 22,
        body: '{"success":false,"message":"Nicht autorisiert"}',
      },
    )

    expect(exitCode).toBe(22)
    expect(output).toContain('Failed to update iTunes prices')
    expect(output).toContain('HTTP 401')
    expect(output).toContain('Nicht autorisiert')
    expect(output).not.toContain(SECRET)
  })

  /**
   * A price update is not idempotent, and curl's --retry would treat a 500,
   * a 429 (waiting out Retry-After) or a timeout as transient and run it again.
   */
  test.each(['500', '429'])('sends one request on HTTP %s', async (status) => {
    const { exitCode, output } = runCron(
      { PRICE_UPDATE_CRON_SECRET: SECRET, SERVER_URL },
      { status, exit: 22, body: '{"success":false}' },
    )

    expect(exitCode).toBe(22)
    expect(output).toContain('Failed to update iTunes prices')
    expect(output).toContain(`HTTP ${status}`)
    expect(await curlCalls()).toBe(1)
    expect(await curlArgs()).not.toContain('--retry')
  })

  test('refuses to call the server without a secret', () => {
    const { exitCode, output } = runCron({ SERVER_URL })

    expect(exitCode).toBe(1)
    expect(output).toContain('PRICE_UPDATE_CRON_SECRET is not set')
    expect(existsSync(join(dir, 'args'))).toBe(false)
  })
})
