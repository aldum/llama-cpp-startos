import { IMPOSSIBLE, VersionInfo } from '@start9labs/start-sdk'

// One source of truth for the upstream pin: the package version and the build
// identifiers in the release notes all derive from these literals, so a bump
// cannot desync the version from the build.
const buildNumber = '11561'
const previousBuildNumber = '11371'
const upstreamBuild = `b${buildNumber}`
const previousBuild = `b${previousBuildNumber}`
const compareUrl = `https://github.com/ggml-org/llama.cpp/compare/${previousBuild}...${upstreamBuild}`

export const current = VersionInfo.of({
  version: `1.0.${buildNumber}:0`,
  releaseNotes: {
    en_US: `Updated llama.cpp to build b11561. Notable upstream changes: server : fix laya abort by limiting n_batch to n_ubatch (#29903); server : fix dead LLAMA_ARG_HF_REPO_FILE key in preset allow-list (#29938); vulkan: fix rdna4 mat_vec tuning (#29934); CUDA: fix MMQ memory fault if n_expert >> n_ubatch (#29941); cuda : move blocks_per_col to where it is used (#29939); cuda : move neu_padded to where it is used (#29940); CUDA: refactor swizzling code (#29612); llama: support both embd + raw tokens in batch (#29622). Plus 182 further upstream commits in this range.

Full commit range: ${compareUrl}`,

  },
  migrations: {
    up: async ({ effects }) => {},
    down: IMPOSSIBLE,
  },
})