import { ActivityType } from "discord.js";
import { getAntiNuke, getAntiRaid } from "../utils/database.js";

export const name = "clientReady";
export const once = true;

const STATUS_MESSAGES = [
  "Member Come on DM For Mod Help!",
  "Join ing Servers: 2894!",
  "Not using a Discord Bot ModTemplates!",
  "Serverinfo 36ms Botinfo 45ms Indexinfo 12ms",
  "CPU 94% RPC 100% UNC 59% GPU 60%",
  "AI set up CMD is  /channel set",
];

let statusIndex = 0;

function rotateStatus(client) {
  client.user.setPresence({
    activities: [
      {
        name: STATUS_MESSAGES[statusIndex],
        type: ActivityType.Streaming,
        url: "https://www.twitch.tv/placeholder",
      },
    ],
    status: "online",
  });
  statusIndex = (statusIndex + 1) % STATUS_MESSAGES.length;
}

async function setupAutoMod(guild) {
  try {
    const existing = await guild.autoModerationRules.fetch();
    const botMember = guild.members.me;
    if (!botMember?.permissions.has("ManageGuild")) return;

    const hasKeyword = existing.some((r) => r.triggerType === 1);
    const hasMention = existing.some((r) => r.triggerType === 5);
    const actions = [{ type: 1, metadata: {} }];

    if (!hasKeyword) {
      await guild.autoModerationRules.create({
        name: "AutoMod: スパムキーワード保護",
        eventType: 1,
        triggerType: 1,
        triggerMetadata: {
          keywordFilter: ["discord.gg/*", "discordapp.com/invite/*"],
          regexPatterns: [],
          presets: [1, 2, 3],
        },
        actions,
        enabled: true,
      });
      console.log(`[AutoMod] Keyword rule created in ${guild.name}`);
    }

    if (!hasMention) {
      await guild.autoModerationRules.create({
        name: "AutoMod: メンションスパム保護",
        eventType: 1,
        triggerType: 5,
        triggerMetadata: { mentionTotalLimit: 5 },
        actions,
        enabled: true,
      });
      console.log(`[AutoMod] Mention rule created in ${guild.name}`);
    }
  } catch (err) {
    console.log(`[AutoMod] Skip ${guild.name}: ${err.message?.slice(0, 60)}`);
  }
}

export async function execute(client) {
  console.log(`[Bot] Logged in as ${client.user.tag}`);
  console.log(`[Bot] Serving ${client.guilds.cache.size} guilds`);

  rotateStatus(client);
  setInterval(() => rotateStatus(client), 4000);

  for (const [, guild] of client.guilds.cache) {
    await setupAutoMod(guild);
  }
}
