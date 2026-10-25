import { IMPOSSIBLE, VersionInfo } from '@start9labs/start-sdk'

// One source of truth for the upstream pin: the package version and the build
// identifiers in the release notes all derive from these literals, so a bump
// cannot desync the version from the build.
const buildNumber = '12242'
const previousBuildNumber = '11854'
const upstreamBuild = `b${buildNumber}`
const previousBuild = `b${previousBuildNumber}`
const compareUrl = `https://github.com/ggml-org/llama.cpp/compare/${previousBuild}...${upstreamBuild}`

export const current = VersionInfo.of({
  version: `1.0.${buildNumber}:0`,
  releaseNotes: {
    en_US: `Updated llama.cpp to build ${upstreamBuild}. Notable upstream changes: server: add an OpenAI-compatible /v1/audio/speech endpoint (#31763); common: fix -hf quant tag matching inside longer quant names (#31620); llama-server: use reference-counted checkpoints instead of deep copies (#30137); quant: add OCP FP8 E4M3 support (#27512); ROCm/HIP: add the RDNA4_M family for gfx1170/gfx1171 (#31373); gemma4: graph optimizations with large prompt-processing gains on E2B and E4B (#31356); mtmd: accurate Qwen3-VL video prompt format (#31619) and Gemma 4 audio streaming (#31965); add NCCL support for multi-node tensor-parallel inference (#28967); kv-cache: keep rotation constants on the GPU (#31073); model: add Clover support (#31306). Plus 377 further upstream commits in this range.

Full commit range: ${compareUrl}`,
  },
  migrations: {
    up: async ({ effects }) => {},
    down: IMPOSSIBLE,
  },
})
