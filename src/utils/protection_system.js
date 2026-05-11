import { getAntiNuke, getAntiRaid } from "./database.js";
import { AuditLogEvent, PermissionsBitField } from "discord.js";

// In-memory trackers: Map<guildId, Map<userId, timestamp[]>>
const nukeTracker = new Map();
const raidTracker = new Map(); // Map<guildId, timestamp[]>

function trackAction(tracker, guildId, userId) {
  if (!tracker.has(guildId)) tracker.set(guildId, new Map());
  const guildMap = tracker.get(guildId);
  if (!guildMap.has(userId)) guildMap.set(userId, []);
  const now = Date.now();
  guildMap.set(userId, [...guildMap.get(userId).filter(t => now - t < 15000), now]);
  return guildMap.get(userId).length;
}

async function getAuditUser(guild, actionType, targetId = null) {
  try {
    await new Promise(r => setTimeout(r, 800));
    const logs = await guild.fetchAuditLogs({ type: actionType, limit: 1 });
    const entry = logs.entries.first();
    if (!entry) return null;
    if (targetId && entry.targetId !== targetId) return null;
    if (Date.now() - entry.createdTimestamp > 5000) return null;
    return entry.executor;
  } catch { return null; }
}

async function handleNuke(guild, executor, reason) {
  if (!executor || executor.id === guild.client.user.id) return;
  console.log(`[AntiNuke] Triggered in ${guild.name} by ${executor.tag} — ${reason}`);

  try {
    const botMember = guild.members.me;
    const member = await guild.members.fetch(executor.id).catch(() => null);
    if (!member) {
      await guild.bans.create(executor.id, { reason: `[AntiNuke] ${reason}` });
      return;
    }
    if (member.roles.highest.position >= botMember.roles.highest.position) return;
    await member.ban({ reason: `[AntiNuke] ${reason}`, deleteMessageSeconds: 0 });
    console.log(`[AntiNuke] Banned ${executor.tag} in ${guild.name}`);

    const logChannel = guild.channels.cache.find(
      c => c.isTextBased() && c.permissionsFor(botMember).has("SendMessages") &&
        (c.name.includes("log") || c.name.includes("mod") || c.name.includes("audit"))
    ) || guild.channels.cache.find(
      c => c.isTextBased() && c.permissionsFor(botMember).has("SendMessages")
    );
    if (logChannel) {
      await logChannel.send(`[AntiNuke] ${executor.tag} (${executor.id}) がサーバー破壊行為のため自動BANされました。理由: ${reason}`);
    }
  } catch (err) {
    console.error(`[AntiNuke] Error banning: ${err.message}`);
  }
}

export function registerProtectionEvents(client) {
  // --- AntiNuke: Channel Delete ---
  client.on("channelDelete", async (channel) => {
    if (!channel.guild) return;
    const { guild } = channel;
    const settings = getAntiNuke(guild.id);
    if (!settings.enabled) return;

    const executor = await getAuditUser(guild, AuditLogEvent.ChannelDelete, channel.id);
    if (!executor) return;
    const count = trackAction(nukeTracker, guild.id, executor.id);
    if (count >= settings.threshold) {
      nukeTracker.get(guild.id)?.set(executor.id, []);
      await handleNuke(guild, executor, `${count}件のチャンネルを削除`);
    }
  });

  // --- AntiNuke: Role Delete ---
  client.on("roleDelete", async (role) => {
    const { guild } = role;
    const settings = getAntiNuke(guild.id);
    if (!settings.enabled) return;

    const executor = await getAuditUser(guild, AuditLogEvent.RoleDelete, role.id);
    if (!executor) return;
    const count = trackAction(nukeTracker, guild.id, executor.id);
    if (count >= settings.threshold) {
      nukeTracker.get(guild.id)?.set(executor.id, []);
      await handleNuke(guild, executor, `${count}件のロールを削除`);
    }
  });

  // --- AntiNuke: Mass Ban ---
  client.on("guildBanAdd", async (ban) => {
    const { guild } = ban;
    const settings = getAntiNuke(guild.id);
    if (!settings.enabled) return;

    const executor = await getAuditUser(guild, AuditLogEvent.MemberBanAdd, ban.user.id);
    if (!executor) return;
    const count = trackAction(nukeTracker, guild.id, executor.id);
    if (count >= settings.threshold) {
      nukeTracker.get(guild.id)?.set(executor.id, []);
      await handleNuke(guild, executor, `${count}件の連続BAN`);
    }
  });

  // --- AntiRaid: Mass Join ---
  client.on("guildMemberAdd", async (member) => {
    const { guild } = member;
    const settings = getAntiRaid(guild.id);
    if (!settings.enabled) return;

    if (!raidTracker.has(guild.id)) raidTracker.set(guild.id, []);
    const now = Date.now();
    const times = raidTracker.get(guild.id).filter(t => now - t < settings.windowMs);
    times.push(now);
    raidTracker.set(guild.id, times);

    if (times.length >= settings.threshold) {
      raidTracker.set(guild.id, []);
      console.log(`[AntiRaid] Raid detected in ${guild.name}! ${times.length} joins in ${settings.windowMs}ms`);

      try {
        const botMember = guild.members.me;
        if (!botMember.permissions.has(PermissionsBitField.Flags.ManageGuild)) return;

        const prevLevel = guild.verificationLevel;
        await guild.setVerificationLevel(4, "[AntiRaid] Raid detected — verification level raised");

        const logChannel = guild.channels.cache.find(
          c => c.isTextBased() && c.permissionsFor(botMember).has("SendMessages")
        );
        if (logChannel) {
          await logChannel.send(
            `[AntiRaid] レイドを検出しました。${times.length}人が短時間に参加。\n認証レベルを最高に引き上げました。60秒後に自動で元に戻します。`
          );
        }

        setTimeout(async () => {
          try {
            await guild.setVerificationLevel(prevLevel, "[AntiRaid] Auto-restore verification level");
            if (logChannel) await logChannel.send("[AntiRaid] 認証レベルをレイド前の設定に戻しました。");
          } catch {}
        }, 60000);
      } catch (err) {
        console.error(`[AntiRaid] Error: ${err.message}`);
      }
    }
  });

  console.log("[Protection] AntiNuke and AntiRaid event listeners registered.");
}
