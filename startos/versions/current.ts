import { IMPOSSIBLE, VersionInfo } from '@start9labs/start-sdk'

// One source of truth for the upstream pin: the package version and the build
// identifiers in the release notes all derive from these literals, so a bump
// cannot desync the version from the build.
const buildNumber = '11580'
const previousBuildNumber = '11561'
const upstreamBuild = `b${buildNumber}`
const previousBuild = `b${previousBuildNumber}`
const compareUrl = `https://github.com/ggml-org/llama.cpp/compare/${previousBuild}...${upstreamBuild}`

export const current = VersionInfo.of({
  version: `1.0.${buildNumber}:0`,
  releaseNotes: {
    en_US: `Updated llama.cpp to build b11580. Notable upstream changes: vulkan: fix buffer logging on 32-bit platforms after source split (#30326); vulkan: use ternary expressions to avoid switch lowering for CM2 quant block size (#30164); sycl: guard DMMV reads at row tails (#29338); llama : report compute graph reallocations during inference (#30329); metal : fix mul_mat_id with duplicate ids (#30373); vulkan: pack FMA for f16 accumulation, no dot product op (#29877); metal: fix metal tensor kernel_mul_mm error for large tensor (#28748). Plus 12 further upstream commits in this range.

Full commit range: ${compareUrl}`,

  },
  migrations: {
    up: async ({ effects }) => {},
    down: IMPOSSIBLE,
  },
})