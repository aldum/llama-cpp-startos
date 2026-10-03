#!/usr/bin/env node
// Daily upstream-pin automation: detect the newest llama.cpp build that has all
// four server images published on ghcr.io, bump the package pin, and open a PR.
//
// Usage:
//   node scripts/check-update.mjs --dry-run   # detect only, change nothing
//   node scripts/check-update.mjs             # bump, commit, push branch, print PR link
//
// Detection procedure per UPDATING.md: ask GHCR what it has published (never
// GitHub releases — upstream cuts one for every merged commit, most without
// images), then verify each of the four variant manifests, stepping down until
// one passes. See the "Automation" section of UPDATING.md.
//
// Requires node >= 18. No third-party dependencies. Intended to run from cron.

import { execFileSync } from 'node:child_process'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const DRY_RUN = process.argv.includes('--dry-run')

const GHCR_PACKAGE = 'ggml-org/llama.cpp'
const UPSTREAM_REPO = 'ggml-org/llama.cpp'
const PR_BASE_REPO = 'Start9Labs/llama-cpp-startos'
const PR_FORK_OWNER = 'aldum' // push target for the bump branch (origin)
const MANIFEST = path.join(ROOT, 'startos/manifest/index.ts')
const CURRENT = path.join(ROOT, 'startos/versions/current.ts')
const VARIANT_PREFIXES = ['', 'cuda-', 'rocm-', 'vulkan-'] // keys into VARIANT_LABELS
const VARIANT_LABELS = ['', 'CUDA', 'ROCm', 'Vulkan']
const COMMIT_NAME = 'llama-cpp-startos updater'
const COMMIT_EMAIL = 'updater@local'

const log = msg => console.log(`[check-update] ${msg}`)
const die = msg => {
  console.error(`[check-update] ERROR: ${msg}`)
  process.exit(1)
}
const sleep = ms => new Promise(r => setTimeout(r, ms))

function git(...args) {
  return execFileSync('git', args, { cwd: ROOT, encoding: 'utf8' }).trim()
}

async function fetchJson(url, { headers = {}, tries = 2 } = {}) {
  let lastErr
  for (let i = 0; i < tries; i++) {
    try {
      const res = await fetch(url, {
        headers: { 'user-agent': 'llama-cpp-startos-updater', ...headers },
        signal: AbortSignal.timeout(30_000),
      })
      if (!res.ok) throw new Error(`HTTP ${res.status} for ${url}`)
      return await res.json()
    } catch (err) {
      lastErr = err
      if (i + 1 < tries) await sleep(2000)
    }
  }
  throw lastErr
}

function readCurrentPin() {
  const m = fs.readFileSync(MANIFEST, 'utf8').match(/const upstreamBuild = 'b(\d+)'/)
  if (!m) die(`could not find 'const upstreamBuild = ...' in startos/manifest/index.ts`)
  return Number(m[1])
}

// Newest build newer than `from` whose four variant images all exist on GHCR,
// per UPDATING.md: list tags published after the current pin (lexical `last=`
// is equivalent to numeric while build numbers keep their digit count), filter
// to bare server tags, then verify candidates newest-first.
async function newestPublishedBuild(from) {
  const tokenRes = await fetchJson(
    `https://ghcr.io/token?scope=repository:${GHCR_PACKAGE}:pull`,
  )
  const auth = { authorization: `Bearer ${tokenRes.token}` }
  const tags = await fetchJson(
    `https://ghcr.io/v2/${GHCR_PACKAGE}/tags/list?n=1000&last=server-b${from}`,
    { headers: auth },
  )
  if (!Array.isArray(tags.tags)) die(`GHCR tag list returned no tags`)
  const candidates = [...new Set(
    tags.tags
      .map(t => t.match(/^server-b(\d+)$/)?.[1])
      .filter(n => n !== undefined && Number(n) > from)
      .map(Number),
  )].sort((a, b) => b - a)
  log(`current pin b${from}; GHCR lists ${candidates.length} newer bare server tag(s)${candidates.length ? `: ${candidates.slice(0, 5).join(', ')}${candidates.length > 5 ? ' …' : ''}` : ''}`)
  if (candidates.length === 0) return null

  for (const build of candidates) {
    const missing = []
    for (let i = 0; i < VARIANT_PREFIXES.length; i++) {
      // Without the Accept header GHCR answers MANIFEST_UNKNOWN even for
      // existing tags — these are OCI indexes (see UPDATING.md).
      const res = await fetch(
        `https://ghcr.io/v2/${GHCR_PACKAGE}/manifests/server-${VARIANT_PREFIXES[i]}b${build}`,
        {
          headers: {
            ...auth,
            'user-agent': 'llama-cpp-startos-updater',
            accept:
              'application/vnd.oci.image.index.v1+json,application/vnd.docker.distribution.manifest.list.v2+json',
          },
          signal: AbortSignal.timeout(30_000),
        },
      ).catch(() => null)
      if (!res || !res.ok) missing.push(VARIANT_LABELS[i] || 'generic')
    }
    if (missing.length === 0) return build
    log(`b${build} published but missing variant(s): ${missing.join(', ')} — stepping down`)
  }
  return null
}

// Draft en_US release notes from the upstream commit range. Human review at
// PR-merge time is expected: these are commit subjects, not real prose, and
// the other locales are dropped (add translations back before merging).
async function draftReleaseNotes(prev, next) {
  const compareUrl =
    `https://github.com/${UPSTREAM_REPO}/compare/b${prev}...b${next}`
  const headers = {}
  if (process.env.GITHUB_TOKEN) headers.authorization = `Bearer ${process.env.GITHUB_TOKEN}`
  const compare = await fetchJson(
    `https://api.github.com/repos/${UPSTREAM_REPO}/compare/b${prev}...b${next}`,
    { headers },
  ).catch(() => null)
  if (!compare || !Array.isArray(compare.commits)) {
    log('could not fetch the upstream commit range; using bare notes')
    return { notes: `Updated llama.cpp to build b${next}.`, compareUrl }
  }
  if (compare.truncated) log('commit range truncated by GitHub — summary covers the first batch only')

  const subjects = compare.commits
    .map(c => (c.commit?.message ?? '').split('\n')[0].trim())
    .filter(Boolean)
    .filter(s => !/^merge /i.test(s) && !/^revert/i.test(s))
  const preferred = subjects.filter(s =>
    /^((feat|fix|server|llama|vulkan|metal|cuda|rocm|sycl)\b|fix(?:ed)?[:\s])/i.test(s),
  )
  const picked = (preferred.length >= 4 ? preferred : subjects).slice(0, 8)
  const list = picked
    .map(s => s.replace(/[`$]/g, '').replace(/\s+/g, ' ').slice(0, 110))
    .join('; ')
  const more = subjects.length - picked.length
  const notes =
    `Updated llama.cpp to build b${next}.` +
    (list ? ` Notable upstream changes: ${list}.` : '') +
    (more > 0 ? ` Plus ${more} further upstream commits in this range.` : '')
  return { notes, compareUrl }
}

async function main() {
  const current = readCurrentPin()
  const head = git('rev-parse', '--abbrev-ref', 'HEAD')
  if (head === 'HEAD') die('detached HEAD; refusing to branch from an unknown base')
  const dirty = git('status', '--porcelain', '--untracked-files=no')
  if (dirty) {
    log(`working tree dirty on ${head}; skipping this run`)
    return
  }

  const next = await newestPublishedBuild(current)
  if (!next) {
    log('up to date: no newer build has all four server images published')
    return
  }
  log(`newest fully-published build: b${next} (current pin b${current})`)

  const branch = `chore/bump-b${next}`
  const remoteBranch = git('ls-remote', '--heads', 'origin', branch)
  if (remoteBranch) {
    log(`branch ${branch} already exists on origin; a PR for this build was likely already opened — skipping`)
    return
  }

  const { notes, compareUrl } = await draftReleaseNotes(current, next)
  if (DRY_RUN) {
    log(`[dry-run] would branch ${branch} from ${head} and:`)
    log(`[dry-run]   manifest/index.ts  upstreamBuild 'b${current}' → 'b${next}'`)
    log(`[dry-run]   versions/current.ts buildNumber ${current} → ${next}, previousBuildNumber → ${current}`)
    log(`[dry-run]   en_US notes: ${notes}`)
    log(`[dry-run]   compare URL: ${compareUrl}`)
    log('[dry-run]   other release-note locales would be dropped — add translations at merge time')
    return
  }

  git('checkout', '-B', branch)

  const apply = () => {
    const manifest = fs.readFileSync(MANIFEST, 'utf8')
    if (!manifest.includes(`const upstreamBuild = 'b${current}'`)) {
      throw new Error('manifest upstreamBuild does not match the read pin; refusing to edit')
    }
    fs.writeFileSync(MANIFEST, manifest.replace(
      `const upstreamBuild = 'b${current}'`,
      `const upstreamBuild = 'b${next}'`,
    ))

    let currentTs = fs.readFileSync(CURRENT, 'utf8')
    currentTs = currentTs
      .replace(/const buildNumber = '\d+'/, `const buildNumber = '${next}'`)
      .replace(/const previousBuildNumber = '\d+'/, `const previousBuildNumber = '${current}'`)
    const notesStart = currentTs.indexOf('releaseNotes: {')
    const notesEnd = currentTs.indexOf('\n  },\n  migrations:', notesStart)
    if (notesStart === -1 || notesEnd === -1) {
      throw new Error('could not locate the releaseNotes block in versions/current.ts')
    }
    currentTs =
      currentTs.slice(0, notesStart) +
      `releaseNotes: {\n` +
      `    en_US: \`${notes}\n\n` +
      `Full commit range: \${compareUrl}\`,\n` +
      currentTs.slice(notesEnd)
    fs.writeFileSync(CURRENT, currentTs)
  }

  try {
    apply()
  } catch (err) {
    git('checkout', '--', 'startos')
    die(`${err.message}; reverted edits`)
  }

  try {
    execFileSync(path.join(ROOT, 'node_modules/.bin/tsc'), ['--noEmit'], {
      cwd: ROOT,
      encoding: 'utf8',
    })
  } catch (err) {
    console.error(String(err.stdout ?? '') + String(err.stderr ?? ''))
    git('checkout', '--', 'startos')
    git('checkout', head)
    git('branch', '-D', branch)
    die('typecheck failed after the bump; reverted to the pre-bump state')
  }

  const commitMsg =
    `chore: bump llama.cpp to b${next}; 1.0.${current}:0 → 1.0.${next}:0`
  git('-c', `user.name=${COMMIT_NAME}`, '-c', `user.email=${COMMIT_EMAIL}`,
    'commit', '--no-verify', '-am', commitMsg)
  git('push', 'origin', `HEAD:refs/heads/${branch}`)
  log(`pushed ${branch} to origin (base for review: ${head})`)

  git('checkout', head)

  const prUrl = `https://github.com/${PR_BASE_REPO}/compare/master...${PR_FORK_OWNER}:${branch}?expand=1`
  log(`open the PR: ${prUrl}`)
  log(`review before merging: draft en_US release notes come straight from commit subjects; other locales were dropped; skim the range for llama-server flag changes affecting startos/actions/presets.ts`)
}

main().catch(err => die(err.stack ?? err.message))
