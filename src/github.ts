import { Octokit } from '@octokit/rest';
import db from './db.js';

let octokit: Octokit;

export async function checkForNewRelease(owner: string, repo: string) {
  
  if (!octokit) {
    if (!process.env.GITHUB_TOKEN) {
        console.error('CRITICAL: GitHub token is missing! The bot will be rate limited without it.');
    } else {
        console.log(`GitHub Token loaded successfully! (Length: ${process.env.GITHUB_TOKEN.length})`);
    }
    
    octokit = new Octokit({
      auth: process.env.GITHUB_TOKEN,
    });
  }

  const fullName = `${owner}/${repo}`;
  
  const memory = db.prepare('SELECT last_release_id, last_etag FROM releases WHERE repo_full_name = ?').get(fullName) as any;
  
  const lastEtag = memory?.last_etag;
  const lastReleaseId = memory?.last_release_id;

  try {
    const response = await octokit.repos.getLatestRelease({
      owner: owner,
      repo: repo,
      headers: lastEtag ? { 'If-None-Match': lastEtag } : {}
    });

    const latestRelease = response.data;
    const newEtag = response.headers.etag;

    if (latestRelease.id.toString() !== lastReleaseId) {
      
      db.prepare(`
        INSERT INTO releases (repo_full_name, last_release_id, last_etag) 
        VALUES (?, ?, ?)
        ON CONFLICT(repo_full_name) DO UPDATE SET 
          last_release_id = excluded.last_release_id,
          last_etag = excluded.last_etag,
          updated_at = CURRENT_TIMESTAMP
      `).run(fullName, latestRelease.id.toString(), newEtag);

      return latestRelease;
    }

    return null;

  } catch (error: any) {
    if (error.status === 304) {
      return null;
    }

    if (error.status === 404) {
      return null; 
    }
    
    console.error(`Couldn't check ${fullName}:`, error.message);
    return null;
  }
}