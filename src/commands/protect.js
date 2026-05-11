import { SlashCommandBuilder, EmbedBuilder, PermissionsBitField } from "discord.js";
import { getAntiNuke, setAntiNuke, getAntiRaid, setAntiRaid } from "../utils/database.js";
import { hasModPermission } from "../utils/permissions.js";

function noMod(i) { return i.reply({ content: "権限がありません。", ephemeral: true }); }

// /antinuke
const antiNukeData = new SlashCommandBuilder()
  .setName("antinuke")
  .setDescription("AntiNuke保護を管理します（サーバー破壊行為の自動BAN）")
  .addSubcommand(s => s.setName("enable").setDescription("AntiNukeを有効化")
    .addIntegerOption(o => o.setName("threshold").setDescription("何アクションで発動するか（デフォルト: 3）").setMinValue(2).setMaxValue(10)))
  .addSubcommand(s => s.setName("disable").setDescription("AntiNukeを無効化"))
  .addSubcommand(s => s.setName("status").setDescription("AntiNukeの設定状況を確認"));

async function antiNukeExecute(interaction) {
  if (!hasModPermission(interaction.member)) return noMod(interaction);
  const sub = interaction.options.getSubcommand();
  const guildId = interaction.guild.id;

  if (sub === "enable") {
    const threshold = interaction.options.getInteger("threshold") || 3;
    setAntiNuke(guildId, { enabled: true, threshold, windowMs: 10000 });
    const embed = new EmbedBuilder().setColor(0x00cc66).setTitle("AntiNuke 有効化")
      .setDescription(`サーバー破壊行為（チャンネル/ロール大量削除・連続BAN）を検出し、実行者を自動BANします。`)
      .addFields({ name: "発動しきい値", value: `10秒以内に ${threshold} アクション`, inline: true }).setTimestamp();
    return interaction.reply({ embeds: [embed] });
  }

  if (sub === "disable") {
    const s = getAntiNuke(guildId);
    setAntiNuke(guildId, { ...s, enabled: false });
    return interaction.reply({ content: "AntiNukeを無効化しました。" });
  }

  if (sub === "status") {
    const s = getAntiNuke(guildId);
    const embed = new EmbedBuilder().setColor(s.enabled ? 0x00cc66 : 0xff4444)
      .setTitle("AntiNuke 状況")
      .addFields(
        { name: "状態", value: s.enabled ? "有効" : "無効", inline: true },
        { name: "しきい値", value: `${s.threshold} アクション / 10秒`, inline: true }
      ).setTimestamp();
    return interaction.reply({ embeds: [embed], ephemeral: true });
  }
}

// /antiraid
const antiRaidData = new SlashCommandBuilder()
  .setName("antiraid")
  .setDescription("AntiRaid保護を管理します（大量参加の自動対処）")
  .addSubcommand(s => s.setName("enable").setDescription("AntiRaidを有効化")
    .addIntegerOption(o => o.setName("threshold").setDescription("何人/10秒でレイド判定するか（デフォルト: 10）").setMinValue(3).setMaxValue(30)))
  .addSubcommand(s => s.setName("disable").setDescription("AntiRaidを無効化"))
  .addSubcommand(s => s.setName("status").setDescription("AntiRaidの設定状況を確認"));

async function antiRaidExecute(interaction) {
  if (!hasModPermission(interaction.member)) return noMod(interaction);
  const sub = interaction.options.getSubcommand();
  const guildId = interaction.guild.id;

  if (sub === "enable") {
    const threshold = interaction.options.getInteger("threshold") || 10;
    setAntiRaid(guildId, { enabled: true, threshold, windowMs: 10000 });
    const embed = new EmbedBuilder().setColor(0x00cc66).setTitle("AntiRaid 有効化")
      .setDescription("短時間の大量参加を検出すると、認証レベルを最高に引き上げます（60秒後に自動復元）。")
      .addFields({ name: "レイド判定", value: `10秒以内に ${threshold} 人参加`, inline: true }).setTimestamp();
    return interaction.reply({ embeds: [embed] });
  }

  if (sub === "disable") {
    const s = getAntiRaid(guildId);
    setAntiRaid(guildId, { ...s, enabled: false });
    return interaction.reply({ content: "AntiRaidを無効化しました。" });
  }

  if (sub === "status") {
    const s = getAntiRaid(guildId);
    const embed = new EmbedBuilder().setColor(s.enabled ? 0x00cc66 : 0xff4444)
      .setTitle("AntiRaid 状況")
      .addFields(
        { name: "状態", value: s.enabled ? "有効" : "無効", inline: true },
        { name: "しきい値", value: `${s.threshold} 人 / 10秒`, inline: true }
      ).setTimestamp();
    return interaction.reply({ embeds: [embed], ephemeral: true });
  }
}

// /nuke
const nukeData = new SlashCommandBuilder()
  .setName("nuke")
  .setDescription("チャンネルを完全リセットします（全メッセージ削除・チャンネル再作成）")
  .addChannelOption(o => o.setName("channel").setDescription("対象チャンネル（省略時は現在のチャンネル）"));

async function nukeExecute(interaction) {
  if (!interaction.member.permissions.has(PermissionsBitField.Flags.Administrator))
    return interaction.reply({ content: "このコマンドは管理者専用です。", ephemeral: true });

  const target = interaction.options.getChannel("channel") || interaction.channel;
  await interaction.reply({ content: `${target} をリセットします...`, ephemeral: true });

  try {
    const pos = target.position;
    const parent = target.parentId;
    const topic = target.topic;
    const nsfw = target.nsfw;
    const slowmode = target.rateLimitPerUser;
    const name = target.name;
    const perms = target.permissionOverwrites.cache;

    const newChannel = await target.clone({
      name, topic, nsfw, rateLimitPerUser: slowmode, parent, reason: `Nuke by ${interaction.user.tag}`
    });
    await newChannel.setPosition(pos);
    for (const [, overwrite] of perms) {
      await newChannel.permissionOverwrites.create(overwrite.id, {
        allow: overwrite.allow.toArray(),
        deny: overwrite.deny.toArray(),
      }).catch(() => {});
    }
    await target.delete(`Nuke by ${interaction.user.tag}`);
    await newChannel.send("このチャンネルはリセットされました。");
  } catch (err) {
    console.error("[nuke]", err.message);
  }
}

export const commands = [
  { data: antiNukeData, execute: antiNukeExecute },
  { data: antiRaidData, execute: antiRaidExecute },
  { data: nukeData, execute: nukeExecute },
];
