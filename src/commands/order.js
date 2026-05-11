import { SlashCommandBuilder, EmbedBuilder } from "discord.js";
import { setCustomInstruction, removeCustomInstruction, getCustomInstruction } from "../utils/database.js";
import { hasModPermission } from "../utils/permissions.js";
import { CORE_PROMPT } from "../utils/aiManager.js";

export const data = new SlashCommandBuilder()
  .setName("order")
  .setDescription("AIへの追加命令を設定します")
  .addSubcommand((sub) =>
    sub
      .setName("setup")
      .setDescription("AIへの追加命令を設定します（コア命令は変更不可）")
      .addStringOption((opt) =>
        opt
          .setName("instruction")
          .setDescription(
            "追加する命令 (例: もっとカジュアルに話す、返答は3文以内にする)"
          )
          .setRequired(true)
      )
  )
  .addSubcommand((sub) =>
    sub.setName("reset").setDescription("追加命令をリセットします")
  )
  .addSubcommand((sub) =>
    sub.setName("view").setDescription("現在の命令設定を確認します")
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

  if (sub === "setup") {
    const instruction = interaction.options.getString("instruction");

    const forbidden = [
      "絵文字",
      "emoji",
      "日本語",
      "english",
      "英語",
      "コーディング",
      "coding",
      "技術",
      "コアルール",
    ];

    const hasForbidden = forbidden.some((f) =>
      instruction.toLowerCase().includes(f.toLowerCase())
    );

    setCustomInstruction(guildId, instruction);

    const embed = new EmbedBuilder()
      .setTitle("AI 追加命令 設定完了")
      .setColor(0x5865f2)
      .addFields(
        {
          name: "固定コア命令（変更不可）",
          value: "日本語・英語対応 / 絵文字なし / コーディングに詳しい",
        },
        {
          name: "設定した追加命令",
          value: `\`\`\`${instruction}\`\`\``,
        }
      )
      .setTimestamp();

    if (hasForbidden) {
      embed.setFooter({
        text: "コア命令に関わる設定は反映されない場合があります",
      });
    }

    return interaction.reply({ embeds: [embed] });
  }

  if (sub === "reset") {
    removeCustomInstruction(guildId);
    return interaction.reply({
      content: "追加命令をリセットしました。コア命令のみで動作します。",
    });
  }

  if (sub === "view") {
    const current = getCustomInstruction(guildId);
    const embed = new EmbedBuilder()
      .setTitle("現在の AI 命令設定")
      .setColor(0x5865f2)
      .addFields({
        name: "固定コア命令（変更不可）",
        value: "日本語・英語対応 / 絵文字なし / コーディングに詳しい / フレンドリーな口調",
      })
      .setTimestamp();

    if (current) {
      embed.addFields({ name: "追加命令", value: `\`\`\`${current}\`\`\`` });
    } else {
      embed.addFields({ name: "追加命令", value: "設定なし" });
    }

    return interaction.reply({ embeds: [embed] });
  }
}
