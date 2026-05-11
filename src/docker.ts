import db from './db.js';

export async function checkForNewDockerImage(owner: string, repo: string) {
  const fullName = `docker:${owner}/${repo}`;
  
  const url = `https://hub.docker.com/v2/repositories/${owner}/${repo}/tags/?ordering=last_updated&page_size=1`;
  
  const memory = db.prepare('SELECT last_release_id FROM releases WHERE repo_full_name = ?').get(fullName) as any;
  const lastUpdated = memory?.last_release_id;

  try {
    const response = await fetch(url);
    if (!response.ok) {
        if (response.status === 404) return null;
        throw new Error(`Docker API error: ${response.statusText}`);
    }

    const data = await response.json() as any;
    if (!data.results || data.results.length === 0) return null;

    const newestTag = data.results[0];

    if (newestTag.last_updated !== lastUpdated) {
      
      db.prepare(`
        INSERT INTO releases (repo_full_name, last_release_id) 
        VALUES (?, ?)
        ON CONFLICT(repo_full_name) DO UPDATE SET 
          last_release_id = excluded.last_release_id,
          updated_at = CURRENT_TIMESTAMP
      `).run(fullName, newestTag.last_updated);

      const sizeMB = (newestTag.full_size / 1024 / 1024).toFixed(2);
      
      return {
        name: `${repo}:${newestTag.name}`,
        tag_name: newestTag.name,
        html_url: `https://hub.docker.com/r/${owner}/${repo}/tags`,
        body: `A new container image was pushed to Docker Hub!\n\n**Tag:** \`${newestTag.name}\`\n**Image Size:** ${sizeMB} MB`,
        published_at: newestTag.last_updated,
        author: {
          login: owner,
          avatar_url: 'https://www.docker.com/wp-content/uploads/2022/03/Moby-logo.png',
        },
        assets: [] 
      };
    }

    return null;

  } catch (error: any) {
    console.error(`Couldn't check Docker Hub ${owner}/${repo}:`, error.message);
    return null;
  }
}