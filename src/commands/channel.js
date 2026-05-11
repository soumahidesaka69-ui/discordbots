import { SlashCommandBuilder, EmbedBuilder } from "discord.js";
import {
  setChannelSetting,
  removeChannelSetting,
  getAllChannelSettings,
  clearAllChannelHistory,
} from "../utils/database.js";
import { hasModPermission } from "../utils/permissions.js";

export const data = new SlashCommandBuilder()
  .setName("channel")
  .setDescription("チャンネルのAI設定を管理します")
  .addSubcommand((sub) =>
    sub
      .setName("set")
      .setDescription("このチャンネルでAI自動応答を有効にします")
  )
  .addSubcommand((sub) =>
    sub.setName("remove").setDescription("このチャンネルのAI設定を削除します")
  )
  .addSubcommand((sub) =>
    sub.setName("list").setDescription("このサーバーのAI設定チャンネル一覧を表示します")
  )
  .addSubcommand((sub) =>
    sub.setName("clear").setDescription("このチャンネルの会話履歴をリセットします")
  );

export async function execute(interaction) {
  if (!hasModPermission(interaction.member)) {
    return interaction.reply({
      content: "このコマンドを使用する権限がありません。",
      ephemeral: true,
    });
  }

  const sub = interaction.options.getSubcommand();
  const guildId = interaction.guild.id;
  const channelId = interaction.channel.id;

  if (sub === "set") {
    setChannelSetting(guildId, channelId, { enabledAt: Date.now() });

    const embed = new EmbedBuilder()
      .setTitle("チャンネル AI 設定完了")
      .setColor(0x5865f2)
      .addFields(
        { name: "チャンネル", value: `<#${channelId}>`, inline: true },
        { name: "状態", value: "有効", inline: true },
        { name: "応答モード", value: "全メッセージ・画像に自動応答", inline: false }
      )
      .setTimestamp();

    return interaction.reply({ embeds: [embed] });
  }

  if (sub === "remove") {
    removeChannelSetting(guildId, channelId);
    return interaction.reply({
      content: `<#${channelId}> のAI設定を削除しました。`,
    });
  }

  if (sub === "list") {
    const settings = getAllChannelSettings(guildId);
    const entries = Object.entries(settings);

    if (entries.length === 0) {
      return interaction.reply({
        content: "このサーバーにはAI設定済みチャンネルがありません。",
        ephemeral: true,
      });
    }

    const embed = new EmbedBuilder()
      .setTitle("AI 設定チャンネル一覧")
      .setColor(0x5865f2)
      .setDescription(entries.map(([cid]) => `<#${cid}>`).join("\n"))
      .setTimestamp();

    return interaction.reply({ embeds: [embed] });
  }

  if (sub === "clear") {
    clearAllChannelHistory(guildId, channelId);
    return interaction.reply({
      content: `<#${channelId}> の全ユーザーの会話履歴をリセットしました。`,
    });
  }
}
