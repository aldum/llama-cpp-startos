import { IMPOSSIBLE, VersionInfo } from '@start9labs/start-sdk'

// One source of truth for the upstream pin: the package version and the build
// identifiers in the release notes all derive from these literals, so a bump
// cannot desync the version from the build.
const buildNumber = '11371'
const previousBuildNumber = '11277'
const upstreamBuild = `b${buildNumber}`
const previousBuild = `b${previousBuildNumber}`
const compareUrl = `https://github.com/ggml-org/llama.cpp/compare/${previousBuild}...${upstreamBuild}`

export const current = VersionInfo.of({
  version: `1.0.${buildNumber}:0`,
  releaseNotes: {
    en_US: `Updated llama.cpp to build b11371. Notable upstream changes: SYCL: reduce tensor allreduce sync with pinned host buffers (#29604); llama: llama_prefetch_rows (#29599); llama: properly handle KV on training (#28520); llama : preserve original batch order for speculative decoding layer inputs (#29019); cuda: guard the iq4_nl dequantize row kernel against short rows (#29683); llama-bench : fix docs (#29464); metal : use bf16 math for mxfp4 mul-mat (#29770); llama-bench : fix verbosity filter to show GGML_LOG_ERROR (#28229). Plus 86 further upstream commits in this range.

Full commit range: ${compareUrl}`,

  },
  migrations: {
    up: async ({ effects }) => {},
    down: IMPOSSIBLE,
  },
})