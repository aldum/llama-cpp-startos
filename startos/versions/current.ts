import { IMPOSSIBLE, VersionInfo } from '@start9labs/start-sdk'

// One source of truth for the upstream pin: the package version and the build
// identifiers in the release notes all derive from these literals, so a bump
// cannot desync the version from the build.
const buildNumber = '11749'
const previousBuildNumber = '11580'
const upstreamBuild = `b${buildNumber}`
const previousBuild = `b${previousBuildNumber}`
const compareUrl = `https://github.com/ggml-org/llama.cpp/compare/${previousBuild}...${upstreamBuild}`

export const current = VersionInfo.of({
  version: `1.0.${buildNumber}:0`,
  releaseNotes: {
    en_US: `Updated llama.cpp to build ${upstreamBuild}. Notable upstream changes: server: add --connect, allow p2p access to the server outside the LAN (#28277); ui: discover and download models from the HF Hub (#29584); moe-cache: replace the MoE LRU cache with a 50/50 SLRU cache (#30637); cuda: add grouped-experts top-k fusion (#29181); qwen3: bidirectional attention and dense_2 output projection (#30607); model: add Kolibri-1 support (#30673); sycl: fix get_rows on reordered quantized weights (#30430); vulkan: use L2-friendly workgroup scheduling for CM2 mulmat (#30215); kleidiai: add SME2 Q4_K and Q6_K matmul support (#29219). Plus 160 further upstream commits in this range.

Full commit range: ${compareUrl}`,
  },
  migrations: {
    up: async ({ effects }) => {},
    down: IMPOSSIBLE,
  },
})
