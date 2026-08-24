export interface UpdateInfo {
  hasUpdate: boolean;
  latestVersion: string;
  currentVersion: string;
  downloadUrl: string;
  releaseNotes: string;
  releaseDate?: string;
}

export const CURRENT_APP_VERSION = 'v1.0.0';
export const UPDATE_REPO_URL = 'https://github.com/Techmastergojo/Engro-Connect-Web';

export async function checkForAppUpdates(): Promise<UpdateInfo> {
  try {
    const response = await fetch(
      'https://api.github.com/repos/Techmastergojo/Engro-Connect-Web/releases/latest',
      { headers: { Accept: 'application/vnd.github.v3+json' } }
    );

    if (response.ok) {
      const data = await response.json();
      const latestTag = data.tag_name || data.name || 'v1.0.1';
      const apkAsset = data.assets?.find((a: { name: string; browser_download_url: string }) =>
        a.name.toLowerCase().endsWith('.apk')
      );
      const downloadUrl = apkAsset?.browser_download_url || `${UPDATE_REPO_URL}/releases`;

      const isNewer = compareVersions(latestTag, CURRENT_APP_VERSION);

      return {
        hasUpdate: isNewer,
        latestVersion: latestTag,
        currentVersion: CURRENT_APP_VERSION,
        downloadUrl,
        releaseNotes: data.body || 'Performance enhancements, new telecom telemetry features, and bug fixes.',
        releaseDate: data.published_at ? new Date(data.published_at).toLocaleDateString() : undefined
      };
    }
  } catch {
    // network or api limit fallback
  }

  return {
    hasUpdate: false,
    latestVersion: CURRENT_APP_VERSION,
    currentVersion: CURRENT_APP_VERSION,
    downloadUrl: `${UPDATE_REPO_URL}/releases`,
    releaseNotes: 'You are running the latest version of Engro NAR.'
  };
}

function compareVersions(remote: string, local: string): boolean {
  const cleanRemote = remote.replace(/^v/, '').split('.').map(n => parseInt(n, 10) || 0);
  const cleanLocal = local.replace(/^v/, '').split('.').map(n => parseInt(n, 10) || 0);

  for (let i = 0; i < Math.max(cleanRemote.length, cleanLocal.length); i++) {
    const r = cleanRemote[i] || 0;
    const l = cleanLocal[i] || 0;
    if (r > l) return true;
    if (r < l) return false;
  }
  return false;
}
