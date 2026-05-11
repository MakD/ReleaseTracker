import { EmbedBuilder } from 'discord.js';

export function createReleaseEmbed(release: any, repoName: string) {
  
  let notes = release.body || '*No release notes provided for this update.*';
  
  notes = notes.replace(/^#+\s+(.*)$/gm, '**$1**');

  const htmlCommentPattern = '<' + '!--[\\s\\S]*?-->';
  const commentRegex = new RegExp(htmlCommentPattern, 'g');
  notes = notes.replace(commentRegex, '').trim();

  if (notes.length > 700) {
    notes = notes.substring(0, 700) + `...\n\n**[Read the full release notes here](${release.html_url})**`;
  }

  let embedColor = '#2ecc71';
  if (release.prerelease) embedColor = '#e67e22';
  if (release.name && release.name.toLowerCase().includes('hotfix')) embedColor = '#e74c3c';

  const publishTime = Math.floor(new Date(release.published_at).getTime() / 1000);

  const embed = new EmbedBuilder()
    .setTitle(release.name && release.name !== release.tag_name 
      ? `${repoName}: ${release.name}` 
      : `New Release: ${repoName}`)
    .setURL(release.html_url)
    .setDescription(notes)
    .setColor(embedColor as any)
    .setAuthor({ 
      name: release.author?.login || 'GitHub', 
      iconURL: release.author?.avatar_url || 'https://github.githubassets.com/images/modules/logos_page/GitHub-Mark.png',
      url: release.author?.html_url 
    })
    .addFields(
      { name: 'Tag', value: `\`${release.tag_name}\``, inline: true },
      { name: 'Published', value: `<t:${publishTime}:R>`, inline: true } 
    )
    .setFooter({ text: `${repoName}` })
    .setTimestamp();
    
  if (release.assets && release.assets.length > 0) {
    const topAssets = release.assets.slice(0, 5);
    
    let assetLinks = '';
    for (const asset of topAssets) {
      const sizeMB = (asset.size / 1024 / 1024).toFixed(2);
      const nextLink = `[${asset.name}](${asset.browser_download_url}) *( ${sizeMB} MB )*\n`;
      
      if ((assetLinks.length + nextLink.length) > 1000) {
          assetLinks += `\n*...and more files available on GitHub!*`;
          break;
      }
      
      assetLinks += nextLink;
    }

    embed.addFields({ name: 'Assets', value: assetLinks.trim(), inline: false });
  }

  return embed;
}