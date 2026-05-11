import db from './db.js';

export async function checkForNewGitLabRelease(owner: string, repo: string) {
  const fullName = `gitlab:${owner}/${repo}`; 
  
  const encodedId = encodeURIComponent(`${owner}/${repo}`);
  const url = `https://gitlab.com/api/v4/projects/${encodedId}/releases`;

  const memory = db.prepare('SELECT last_release_id, last_etag FROM releases WHERE repo_full_name = ?').get(fullName) as any;
  
  const lastEtag = memory?.last_etag;
  const lastReleaseId = memory?.last_release_id;

  const headers: any = {
    'User-Agent': 'Discord-Release-Tracker-Bot/1.0'
  };

  if (lastEtag) headers['If-None-Match'] = lastEtag;

  try {
    const response = await fetch(url, { headers });

    if (response.status === 304) return null; 
    if (!response.ok) throw new Error(`GitLab API error: ${response.statusText}`);

    const releases = await response.json() as any[];
    if (!releases || releases.length === 0) return null;

    const latestRelease = releases[0];
    const newEtag = response.headers.get('etag');

    if (latestRelease.tag_name !== lastReleaseId) {
      
      db.prepare(`
        INSERT INTO releases (repo_full_name, last_release_id, last_etag) 
        VALUES (?, ?, ?)
        ON CONFLICT(repo_full_name) DO UPDATE SET 
          last_release_id = excluded.last_release_id,
          last_etag = excluded.last_etag,
          updated_at = CURRENT_TIMESTAMP
      `).run(fullName, latestRelease.tag_name, newEtag);
      
      return {
        name: latestRelease.name,
        tag_name: latestRelease.tag_name,
        html_url: `https://gitlab.com/${owner}/${repo}/-/releases/${latestRelease.tag_name}`,
        body: latestRelease.description,
        published_at: latestRelease.released_at,
        author: {
          login: latestRelease.author?.name || 'GitLab User',
          avatar_url: latestRelease.author?.avatar_url || 'https://about.gitlab.com/images/press/logo/png/gitlab-icon-rgb.png',
        },
        assets: [] 
      };
    }

    return null;

  } catch (error: any) {
    console.error(`Couldn't check GitLab ${owner}/${repo}:`, error.message);
    return null;
  }
}