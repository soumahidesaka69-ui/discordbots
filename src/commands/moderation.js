import { SlashCommandBuilder, EmbedBuilder, PermissionsBitField } from "discord.js";
import { getWarnings, addWarning, clearWarnings } from "../utils/database.js";
import { hasModPermission } from "../utils/permissions.js";

function noMod(i) { return i.reply({ content: "権限がありません。", ephemeral: true }); }
function ms(str) {
  const match = str.match(/^(\d+)(s|m|h|d)$/);
  if (!match) return null;
  const n = parseInt(match[1]);
  const units = { s: 1, m: 60, h: 3600, d: 86400 };
  return n * units[match[2]] * 1000;
}

// /warn
const warnData = new SlashCommandBuilder()
  .setName("warn")
  .setDescription("ユーザーへの警告を管理します")
  .addSubcommand(s => s.setName("add").setDescription("ユーザーに警告を追加")
    .addUserOption(o => o.setName("user").setDescription("対象ユーザー").setRequired(true))
    .addStringOption(o => o.setName("reason").setDescription("理由").setRequired(true)))
  .addSubcommand(s => s.setName("list").setDescription("ユーザーの警告一覧を表示")
    .addUserOption(o => o.setName("user").setDescription("対象ユーザー").setRequired(true)))
  .addSubcommand(s => s.setName("clear").setDescription("ユーザーの警告をすべて削除")
    .addUserOption(o => o.setName("user").setDescription("対象ユーザー").setRequired(true)));

async function warnExecute(interaction) {
  if (!hasModPermission(interaction.member)) return noMod(interaction);
  const sub = interaction.options.getSubcommand();
  const user = interaction.options.getUser("user");
  const guildId = interaction.guild.id;

  if (sub === "add") {
    const reason = interaction.options.getString("reason");
    addWarning(guildId, user.id, reason, interaction.user.id);
    const warns = getWarnings(guildId, user.id);
    const embed = new EmbedBuilder().setColor(0xff9900).setTitle("警告を追加")
      .addFields(
        { name: "対象", value: `${user.tag}`, inline: true },
        { name: "理由", value: reason, inline: true },
        { name: "警告合計", value: `${warns.length}件`, inline: true }
      ).setTimestamp();
    return interaction.reply({ embeds: [embed] });
  }

  if (sub === "list") {
    const warns = getWarnings(guildId, user.id);
    if (warns.length === 0) return interaction.reply({ content: `${user.tag} に警告はありません。`, ephemeral: true });
    const list = warns.map((w, i) => `${i + 1}. ${w.reason} — <@${w.moderatorId}> (${new Date(w.timestamp).toLocaleDateString("ja-JP")})`).join("\n");
    const embed = new EmbedBuilder().setColor(0x5865f2).setTitle(`${user.tag} の警告一覧`)
      .setDescription(list).setTimestamp();
    return interaction.reply({ embeds: [embed], ephemeral: true });
  }

  if (sub === "clear") {
    clearWarnings(guildId, user.id);
    return interaction.reply({ content: `${user.tag} の警告をすべて削除しました。`, ephemeral: true });
  }
}

// /kick
const kickData = new SlashCommandBuilder()
  .setName("kick")
  .setDescription("ユーザーをサーバーからキックします")
  .addUserOption(o => o.setName("user").setDescription("対象ユーザー").setRequired(true))
  .addStringOption(o => o.setName("reason").setDescription("理由"));

async function kickExecute(interaction) {
  if (!hasModPermission(interaction.member)) return noMod(interaction);
  if (!interaction.guild.members.me.permissions.has(PermissionsBitField.Flags.KickMembers))
    return interaction.reply({ content: "BotにKick権限がありません。", ephemeral: true });

  const user = interaction.options.getUser("user");
  const reason = interaction.options.getString("reason") || "理由なし";
  try {
    const member = await interaction.guild.members.fetch(user.id);
    if (member.roles.highest.position >= interaction.guild.members.me.roles.highest.position)
      return interaction.reply({ content: "そのユーザーをKickできません（ロール上限）。", ephemeral: true });
    await member.kick(reason);
    const embed = new EmbedBuilder().setColor(0xff6600).setTitle("メンバーをKick")
      .addFields({ name: "ユーザー", value: user.tag, inline: true }, { name: "理由", value: reason, inline: true }).setTimestamp();
    return interaction.reply({ embeds: [embed] });
  } catch (err) {
    return interaction.reply({ content: `Kickに失敗: ${err.message}`, ephemeral: true });
  }
}

// /ban
const banData = new SlashCommandBuilder()
  .setName("ban")
  .setDescription("ユーザーをBANします")
  .addUserOption(o => o.setName("user").setDescription("対象ユーザー").setRequired(true))
  .addStringOption(o => o.setName("reason").setDescription("理由"))
  .addIntegerOption(o => o.setName("days").setDescription("メッセージ削除日数（0-7）").setMinValue(0).setMaxValue(7));

async function banExecute(interaction) {
  if (!hasModPermission(interaction.member)) return noMod(interaction);
  if (!interaction.guild.members.me.permissions.has(PermissionsBitField.Flags.BanMembers))
    return interaction.reply({ content: "BotにBan権限がありません。", ephemeral: true });

  const user = interaction.options.getUser("user");
  const reason = interaction.options.getString("reason") || "理由なし";
  const days = interaction.options.getInteger("days") ?? 0;
  try {
    await interaction.guild.bans.create(user.id, { reason, deleteMessageSeconds: days * 86400 });
    const embed = new EmbedBuilder().setColor(0xff0000).setTitle("メンバーをBAN")
      .addFields(
        { name: "ユーザー", value: user.tag, inline: true },
        { name: "理由", value: reason, inline: true },
        { name: "メッセージ削除", value: `${days}日分`, inline: true }
      ).setTimestamp();
    return interaction.reply({ embeds: [embed] });
  } catch (err) {
    return interaction.reply({ content: `BANに失敗: ${err.message}`, ephemeral: true });
  }
}

// /unban
const unbanData = new SlashCommandBuilder()
  .setName("unban")
  .setDescription("ユーザーのBANを解除します")
  .addStringOption(o => o.setName("userid").setDescription("ユーザーID").setRequired(true));

async function unbanExecute(interaction) {
  if (!hasModPermission(interaction.member)) return noMod(interaction);
  const userId = interaction.options.getString("userid");
  try {
    const ban = await interaction.guild.bans.fetch(userId);
    await interaction.guild.bans.remove(userId, `解除者: ${interaction.user.tag}`);
    const embed = new EmbedBuilder().setColor(0x00cc66).setTitle("BAN解除")
      .addFields({ name: "ユーザー", value: ban.user.tag }).setTimestamp();
    return interaction.reply({ embeds: [embed] });
  } catch {
    return interaction.reply({ content: "指定されたユーザーのBANが見つかりません。", ephemeral: true });
  }
}

// /mute
const muteData = new SlashCommandBuilder()
  .setName("mute")
  .setDescription("ユーザーをタイムアウトします")
  .addUserOption(o => o.setName("user").setDescription("対象ユーザー").setRequired(true))
  .addStringOption(o => o.setName("duration").setDescription("期間 例: 10m, 1h, 1d").setRequired(true))
  .addStringOption(o => o.setName("reason").setDescription("理由"));

async function muteExecute(interaction) {
  if (!hasModPermission(interaction.member)) return noMod(interaction);
  const user = interaction.options.getUser("user");
  const durationStr = interaction.options.getString("duration");
  const reason = interaction.options.getString("reason") || "理由なし";
  const duration = ms(durationStr);
  if (!duration) return interaction.reply({ content: "期間の形式が正しくありません。例: 10m, 2h, 1d", ephemeral: true });
  if (duration > 28 * 24 * 3600 * 1000) return interaction.reply({ content: "タイムアウトは最大28日です。", ephemeral: true });

  try {
    const member = await interaction.guild.members.fetch(user.id);
    await member.timeout(duration, reason);
    const embed = new EmbedBuilder().setColor(0xffcc00).setTitle("タイムアウト")
      .addFields(
        { name: "ユーザー", value: user.tag, inline: true },
        { name: "期間", value: durationStr, inline: true },
        { name: "理由", value: reason, inline: true }
      ).setTimestamp();
    return interaction.reply({ embeds: [embed] });
  } catch (err) {
    return interaction.reply({ content: `タイムアウトに失敗: ${err.message}`, ephemeral: true });
  }
}

// /unmute
const unmuteData = new SlashCommandBuilder()
  .setName("unmute")
  .setDescription("ユーザーのタイムアウトを解除します")
  .addUserOption(o => o.setName("user").setDescription("対象ユーザー").setRequired(true));

async function unmuteExecute(interaction) {
  if (!hasModPermission(interaction.member)) return noMod(interaction);
  const user = interaction.options.getUser("user");
  try {
    const member = await interaction.guild.members.fetch(user.id);
    await member.timeout(null);
    return interaction.reply({ content: `${user.tag} のタイムアウトを解除しました。` });
  } catch (err) {
    return interaction.reply({ content: `解除に失敗: ${err.message}`, ephemeral: true });
  }
}

// /purge
const purgeData = new SlashCommandBuilder()
  .setName("purge")
  .setDescription("メッセージを一括削除します")
  .addIntegerOption(o => o.setName("amount").setDescription("削除数（1-100）").setMinValue(1).setMaxValue(100).setRequired(true))
  .addUserOption(o => o.setName("user").setDescription("特定ユーザーのみ削除（省略可）"));

async function purgeExecute(interaction) {
  if (!hasModPermission(interaction.member)) return noMod(interaction);
  const amount = interaction.options.getInteger("amount");
  const user = interaction.options.getUser("user");
  await interaction.deferReply({ ephemeral: true });

  try {
    let messages = await interaction.channel.messages.fetch({ limit: 100 });
    messages = messages.filter(m => {
      if (user && m.author.id !== user.id) return false;
      if (Date.now() - m.createdTimestamp > 14 * 24 * 3600 * 1000) return false;
      return true;
    }).first(amount);

    const deleted = await interaction.channel.bulkDelete(messages, true);
    return interaction.editReply({ content: `${deleted.size}件のメッセージを削除しました。` });
  } catch (err) {
    return interaction.editReply({ content: `削除に失敗: ${err.message}` });
  }
}

// /lock
const lockData = new SlashCommandBuilder()
  .setName("lock")
  .setDescription("チャンネルをロックして送信不可にします")
  .addChannelOption(o => o.setName("channel").setDescription("対象チャンネル（省略時は現在のチャンネル）"));

async function lockExecute(interaction) {
  if (!hasModPermission(interaction.member)) return noMod(interaction);
  const channel = interaction.options.getChannel("channel") || interaction.channel;
  try {
    await channel.permissionOverwrites.edit(interaction.guild.roles.everyone, { SendMessages: false });
    return interaction.reply({ content: `${channel} をロックしました。` });
  } catch (err) {
    return interaction.reply({ content: `ロックに失敗: ${err.message}`, ephemeral: true });
  }
}

// /unlock
const unlockData = new SlashCommandBuilder()
  .setName("unlock")
  .setDescription("チャンネルのロックを解除します")
  .addChannelOption(o => o.setName("channel").setDescription("対象チャンネル（省略時は現在のチャンネル）"));

async function unlockExecute(interaction) {
  if (!hasModPermission(interaction.member)) return noMod(interaction);
  const channel = interaction.options.getChannel("channel") || interaction.channel;
  try {
    await channel.permissionOverwrites.edit(interaction.guild.roles.everyone, { SendMessages: null });
    return interaction.reply({ content: `${channel} のロックを解除しました。` });
  } catch (err) {
    return interaction.reply({ content: `解除に失敗: ${err.message}`, ephemeral: true });
  }
}

// /slowmode
const slowmodeData = new SlashCommandBuilder()
  .setName("slowmode")
  .setDescription("チャンネルのスローモードを設定します")
  .addIntegerOption(o => o.setName("seconds").setDescription("秒数（0で無効）").setMinValue(0).setMaxValue(21600).setRequired(true))
  .addChannelOption(o => o.setName("channel").setDescription("対象チャンネル（省略時は現在のチャンネル）"));

async function slowmodeExecute(interaction) {
  if (!hasModPermission(interaction.member)) return noMod(interaction);
  const seconds = interaction.options.getInteger("seconds");
  const channel = interaction.options.getChannel("channel") || interaction.channel;
  try {
    await channel.setRateLimitPerUser(seconds);
    const msg = seconds === 0 ? `${channel} のスローモードを無効にしました。` : `${channel} のスローモードを ${seconds}秒 に設定しました。`;
    return interaction.reply({ content: msg });
  } catch (err) {
    return interaction.reply({ content: `設定に失敗: ${err.message}`, ephemeral: true });
  }
}

export const commands = [
  { data: warnData, execute: warnExecute },
  { data: kickData, execute: kickExecute },
  { data: banData, execute: banExecute },
  { data: unbanData, execute: unbanExecute },
  { data: muteData, execute: muteExecute },
  { data: unmuteData, execute: unmuteExecute },
  { data: purgeData, execute: purgeExecute },
  { data: lockData, execute: lockExecute },
  { data: unlockData, execute: unlockExecute },
  { data: slowmodeData, execute: slowmodeExecute },
];
