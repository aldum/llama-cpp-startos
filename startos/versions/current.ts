import { IMPOSSIBLE, VersionInfo } from '@start9labs/start-sdk'

// One source of truth for the upstream pin: the package version and the build
// identifiers in the release notes all derive from these literals, so a bump
// cannot desync the version from the build.
const buildNumber = '11854'
const previousBuildNumber = '11749'
const upstreamBuild = `b${buildNumber}`
const previousBuild = `b${previousBuildNumber}`
const compareUrl = `https://github.com/ggml-org/llama.cpp/compare/${previousBuild}...${upstreamBuild}`

export const current = VersionInfo.of({
  version: `1.0.${buildNumber}:0`,
  releaseNotes: {
    en_US: `Updated llama.cpp to build b11854. Notable upstream changes: sycl: fix compiler warnings - missing prototypes, dead code, extra semicolons (#30271); metal : fix missing MoE kernel variant for 9 experts per token (#30610) (#30699); server : pass id_slot through the Anthropic /v1/messages conversion (#28554); CUDA: Clear CUDA graphs after legacy memory pool flush (#26771); sycl : replace memset due to not always ordered (#30812); metal : optimize argmax and pool_1d (#30862); server: fix missing output_index in Responses API SSE events for compatibility (#30863); server: Router wasn't propagating the client disconnects fully to the child, the response wait could cause a d. Plus 97 further upstream commits in this range.

Full commit range: ${compareUrl}`,

  },
  migrations: {
    up: async ({ effects }) => {},
    down: IMPOSSIBLE,
  },
})
