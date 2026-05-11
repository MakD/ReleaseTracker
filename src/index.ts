import 'dotenv/config';
import { Client, GatewayIntentBits, TextChannel } from 'discord.js';
import cron from 'node-cron';
import fs from 'fs';
import './db.js';
import { checkForNewRelease } from './github.js';
import { checkForNewGitLabRelease } from './gitlab.js';
import { checkForNewDockerImage } from './docker.js';
import { createReleaseEmbed } from './embed.js';

const rawData = fs.readFileSync('./repos.json', 'utf-8');
const config = JSON.parse(rawData);

const bot = new Client({ intents: [GatewayIntentBits.Guilds] });

bot.once('clientReady', async () => {
    console.log(`Logged in as ${bot.user?.tag}`);

    const checkRepositories = async () => {
        console.log('Checking repositories...');
        const channelId = process.env.DEFAULT_CHANNEL_ID;
        
        const channel = bot.channels.cache.get(channelId as string) as TextChannel;
        if (!channel) {
            console.error('Cannot find the Discord channel! Check the Channel ID.');
            return;
        }

        if (config.repositories) {
            for (const repo of config.repositories) {
                console.log(`Checking GitHub: ${repo.owner}/${repo.repo}...`);
                const newRelease = await checkForNewRelease(repo.owner, repo.repo);

                if (newRelease) {
                    console.log(`Found a new release for ${repo.repo}! Sending to Discord...`);
                    const embed = createReleaseEmbed(newRelease, `${repo.owner}/${repo.repo}`);
                    await channel.send({ embeds: [embed] });
                }
            }
        }

        if (config.gitlabRepositories) {
            for (const repo of config.gitlabRepositories) {
                console.log(`Checking GitLab: ${repo.owner}/${repo.repo}...`);
                const newRelease = await checkForNewGitLabRelease(repo.owner, repo.repo);

                if (newRelease) {
                    console.log(`Found a new release for ${repo.repo}! Sending to Discord...`);
                    const embed = createReleaseEmbed(newRelease, `gitlab:${repo.owner}/${repo.repo}`);
                    await channel.send({ embeds: [embed] });
                }
            }
        }

        if (config.dockerRepositories) {
            for (const repo of config.dockerRepositories) {
                console.log(`Checking Docker Hub: ${repo.owner}/${repo.repo}...`);
                const newRelease = await checkForNewDockerImage(repo.owner, repo.repo);

                if (newRelease) {
                    console.log(`Found a new image for ${repo.repo}! Sending to Discord...`);
                    const embed = createReleaseEmbed(newRelease, `docker:${repo.owner}/${repo.repo}`);
                    await channel.send({ embeds: [embed] });
                }
            }
        }

        console.log('Finished checking all repositories! Going back to sleep.');
    };

    await checkRepositories();

    cron.schedule(config.pollingInterval, checkRepositories);
    console.log(`Alarm is set to go off on this schedule: ${config.pollingInterval}`);
});

bot.login(process.env.DISCORD_TOKEN);