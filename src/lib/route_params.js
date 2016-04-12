
export function readQueryParams(builds, query = {}) {
  // validate params
  const { branch, release, format = 'tarball' } = query

  if (branch && release) {
    throw new TypeError('this api only accepts branch or release, not both')
  }

  if (format !== 'tarball' && format !== 'zip') {
    throw new TypeError('format must be either "tarball" or "zip"')
  }

  const ref = branch || release || 'master'
  const type = release ? 'releases' : 'branches'
  const urls = release ? builds.releases : builds.branches

  if (!urls.hasOwnProperty(ref) || !urls[ref]) {
    const opts = Object.keys(urls).map(u => JSON.stringify(u)).join(', ')
    throw new Error(`Unknown ${type} "${ref}", expected one of ${opts}`)
  }

  const url = urls[ref]
  return { ref, type, url, format }
}
