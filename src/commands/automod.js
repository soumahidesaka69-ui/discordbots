import {
  SlashCommandBuilder,
  EmbedBuilder,
  AutoModerationRuleTriggerType,
  AutoModerationActionType,
  AutoModerationRuleEventType,
  AutoModerationRuleKeywordPresetType,
  PermissionFlagsBits,
} from "discord.js";
import { hasModPermission } from "../utils/permissions.js";

export const data = new SlashCommandBuilder()
  .setName("automod")
  .setDescription("Discord AutoMod ルールを管理します")
  .addSubcommand((s) =>
    s
      .setName("list")
      .setDescription("現在の AutoMod ルール一覧を表示します")
  )
  .addSubcommand((s) =>
    s
      .setName("keyword")
      .setDescription("キーワードフィルタールールを作成します")
      .addStringOption((o) =>
        o
          .setName("name")
          .setDescription("ルール名")
          .setRequired(true)
      )
      .addStringOption((o) =>
        o
          .setName("keywords")
          .setDescription("ブロックするキーワード（カンマ区切り）例: spam,bad word,禁止ワード")
          .setRequired(true)
      )
      .addChannelOption((o) =>
        o
          .setName("log_channel")
          .setDescription("違反を通知するログチャンネル")
          .setRequired(false)
      )
      .addBooleanOption((o) =>
        o
          .setName("block")
          .setDescription("メッセージをブロックする（false の場合はフラグのみ）")
          .setRequired(false)
      )
  )
  .addSubcommand((s) =>
    s
      .setName("preset")
      .setDescription("プリセットフィルター（有害コンテンツ・スラング・差別用語）を設定します")
      .addStringOption((o) =>
        o
          .setName("type")
          .setDescription("プリセットの種類")
          .setRequired(true)
          .addChoices(
            { name: "プロファニティ（不適切な言葉）", value: "profanity" },
            { name: "性的コンテンツ", value: "sexual_content" },
            { name: "差別・ヘイトスピーチ", value: "slurs" }
          )
      )
      .addChannelOption((o) =>
        o
          .setName("log_channel")
          .setDescription("違反を通知するログチャンネル")
          .setRequired(false)
      )
  )
  .addSubcommand((s) =>
    s
      .setName("spam")
      .setDescription("スパム保護（メンション過多検出）を設定します")
      .addIntegerOption((o) =>
        o
          .setName("mention_limit")
          .setDescription("1メッセージあたりの最大メンション数（デフォルト: 5）")
          .setRequired(false)
          .setMinValue(2)
          .setMaxValue(50)
      )
      .addChannelOption((o) =>
        o
          .setName("log_channel")
          .setDescription("違反を通知するログチャンネル")
          .setRequired(false)
      )
  )
  .addSubcommand((s) =>
    s
      .setName("link")
      .setDescription("URLリンクフィルターを設定します")
      .addStringOption((o) =>
        o
          .setName("name")
          .setDescription("ルール名")
          .setRequired(true)
      )
      .addStringOption((o) =>
        o
          .setName("allowed_domains")
          .setDescription("許可するドメイン（カンマ区切り）例: youtube.com,discord.com")
          .setRequired(false)
      )
      .addChannelOption((o) =>
        o
          .setName("log_channel")
          .setDescription("違反を通知するログチャンネル")
          .setRequired(false)
      )
  )
  .addSubcommand((s) =>
    s
      .setName("enable")
      .setDescription("AutoMod ルールを有効化します")
      .addStringOption((o) =>
        o
          .setName("rule_id")
          .setDescription("有効にするルールの ID")
          .setRequired(true)
      )
  )
  .addSubcommand((s) =>
    s
      .setName("disable")
      .setDescription("AutoMod ルールを無効化します")
      .addStringOption((o) =>
        o
          .setName("rule_id")
          .setDescription("無効にするルールの ID")
          .setRequired(true)
      )
  )
  .addSubcommand((s) =>
    s
      .setName("delete")
      .setDescription("AutoMod ルールを削除します")
      .addStringOption((o) =>
        o
          .setName("rule_id")
          .setDescription("削除するルールの ID")
          .setRequired(true)
      )
  )
  .addSubcommand((s) =>
    s
      .setName("exempt")
      .setDescription("特定のロール・チャンネルをルールの除外対象にします")
      .addStringOption((o) =>
        o
          .setName("rule_id")
          .setDescription("対象ルールの ID")
          .setRequired(true)
      )
      .addRoleOption((o) =>
        o
          .setName("role")
          .setDescription("除外するロール")
          .setRequired(false)
      )
      .addChannelOption((o) =>
        o
          .setName("channel")
          .setDescription("除外するチャンネル")
          .setRequired(false)
      )
  );

const TRIGGER_TYPE_NAMES = {
  [AutoModerationRuleTriggerType.Keyword]: "キーワードフィルター",
  [AutoModerationRuleTriggerType.KeywordPreset]: "プリセットフィルター",
  [AutoModerationRuleTriggerType.MentionSpam]: "メンションスパム",
  [AutoModerationRuleTriggerType.Spam]: "スパム検出",
};

const PRESET_NAMES = {
  [AutoModerationRuleKeywordPresetType.Profanity]: "プロファニティ",
  [AutoModerationRuleKeywordPresetType.SexualContent]: "性的コンテンツ",
  [AutoModerationRuleKeywordPresetType.Slurs]: "差別・ヘイトスピーチ",
};

function buildActions(logChannel, block = true) {
  const actions = [];
  if (block) {
    actions.push({ type: AutoModerationActionType.BlockMessage });
  }
  if (logChannel) {
    actions.push({
      type: AutoModerationActionType.SendAlertMessage,
      metadata: { channel: logChannel },
    });
  }
  if (actions.length === 0) {
    actions.push({ type: AutoModerationActionType.BlockMessage });
  }
  return actions;
}

export async function execute(interaction) {
  if (!hasModPermission(interaction.member)) {
    return interaction.reply({
      content: "このコマンドを使用する権限がありません。",
      ephemeral: true,
    });
  }

  if (!interaction.guild.members.me.permissions.has(PermissionFlagsBits.ManageGuild)) {
    return interaction.reply({
      content: "Botに「サーバーの管理」権限が必要です。",
      ephemeral: true,
    });
  }

  await interaction.deferReply();

  const sub = interaction.options.getSubcommand();
  const guild = interaction.guild;

  if (sub === "list") {
    const rules = await guild.autoModerationRules.fetch();

    if (rules.size === 0) {
      return interaction.editReply({ content: "AutoMod ルールが設定されていません。" });
    }

    const embed = new EmbedBuilder()
      .setTitle("AutoMod ルール一覧")
      .setColor(0xfee75c)
      .setTimestamp();

    const fields = [];
    for (const [, rule] of rules) {
      const typeName = TRIGGER_TYPE_NAMES[rule.triggerType] || "不明";
      const status = rule.enabled ? "有効" : "無効";
      const actions = rule.actions.map((a) => {
        if (a.type === AutoModerationActionType.BlockMessage) return "ブロック";
        if (a.type === AutoModerationActionType.SendAlertMessage) return "アラート送信";
        if (a.type === AutoModerationActionType.Timeout) return "タイムアウト";
        return "不明";
      });

      let detail = "";
      if (rule.triggerType === AutoModerationRuleTriggerType.Keyword) {
        const kws = rule.triggerMetadata?.keywordFilter || [];
        detail = kws.length > 0 ? `キーワード: ${kws.slice(0, 5).join(", ")}${kws.length > 5 ? ` 他${kws.length - 5}件` : ""}` : "";
      } else if (rule.triggerType === AutoModerationRuleTriggerType.KeywordPreset) {
        const presets = (rule.triggerMetadata?.presets || []).map((p) => PRESET_NAMES[p] || p);
        detail = `プリセット: ${presets.join(", ")}`;
      } else if (rule.triggerType === AutoModerationRuleTriggerType.MentionSpam) {
        detail = `最大メンション数: ${rule.triggerMetadata?.mentionTotalLimit || "?"}`;
      }

      fields.push({
        name: `${rule.name} (${status})`,
        value: `ID: \`${rule.id}\`\n種類: ${typeName}\nアクション: ${actions.join(", ")}${detail ? `\n${detail}` : ""}`,
      });
    }

    embed.addFields(fields.slice(0, 25));
    return interaction.editReply({ embeds: [embed] });
  }

  if (sub === "keyword") {
    const name = interaction.options.getString("name");
    const keywords = interaction.options
      .getString("keywords")
      .split(",")
      .map((k) => k.trim())
      .filter((k) => k.length > 0);
    const logChannel = interaction.options.getChannel("log_channel");
    const block = interaction.options.getBoolean("block") ?? true;

    if (keywords.length === 0) {
      return interaction.editReply({ content: "キーワードを1つ以上入力してください。" });
    }

    try {
      const rule = await guild.autoModerationRules.create({
        name,
        eventType: AutoModerationRuleEventType.MessageSend,
        triggerType: AutoModerationRuleTriggerType.Keyword,
        triggerMetadata: { keywordFilter: keywords },
        actions: buildActions(logChannel, block),
        enabled: true,
        reason: `AutoMod設定: ${interaction.user.tag}`,
      });

      const embed = new EmbedBuilder()
        .setTitle("AutoMod ルール作成完了")
        .setColor(0x57f287)
        .addFields(
          { name: "ルール名", value: rule.name, inline: true },
          { name: "ルール ID", value: `\`${rule.id}\``, inline: true },
          { name: "ブロック対象キーワード", value: keywords.join(", ") },
          { name: "アクション", value: block ? "メッセージをブロック" : "フラグのみ" },
          {
            name: "ログチャンネル",
            value: logChannel ? `<#${logChannel.id}>` : "なし",
            inline: true,
          }
        )
        .setTimestamp();

      return interaction.editReply({ embeds: [embed] });
    } catch (err) {
      console.error("[automod keyword]", err);
      return interaction.editReply({ content: `ルールの作成に失敗しました: ${err.message}` });
    }
  }

  if (sub === "preset") {
    const type = interaction.options.getString("type");
    const logChannel = interaction.options.getChannel("log_channel");

    const presetMap = {
      profanity: AutoModerationRuleKeywordPresetType.Profanity,
      sexual_content: AutoModerationRuleKeywordPresetType.SexualContent,
      slurs: AutoModerationRuleKeywordPresetType.Slurs,
    };

    const presetNames = {
      profanity: "プロファニティ（不適切な言葉）",
      sexual_content: "性的コンテンツ",
      slurs: "差別・ヘイトスピーチ",
    };

    try {
      const rule = await guild.autoModerationRules.create({
        name: `AutoMod: ${presetNames[type]}`,
        eventType: AutoModerationRuleEventType.MessageSend,
        triggerType: AutoModerationRuleTriggerType.KeywordPreset,
        triggerMetadata: { presets: [presetMap[type]] },
        actions: buildActions(logChannel, true),
        enabled: true,
        reason: `AutoMod プリセット設定: ${interaction.user.tag}`,
      });

      const embed = new EmbedBuilder()
        .setTitle("AutoMod プリセットルール作成完了")
        .setColor(0x57f287)
        .addFields(
          { name: "ルール名", value: rule.name, inline: true },
          { name: "ルール ID", value: `\`${rule.id}\``, inline: true },
          { name: "フィルター種類", value: presetNames[type] },
          { name: "アクション", value: "メッセージをブロック" },
          {
            name: "ログチャンネル",
            value: logChannel ? `<#${logChannel.id}>` : "なし",
            inline: true,
          }
        )
        .setTimestamp();

      return interaction.editReply({ embeds: [embed] });
    } catch (err) {
      console.error("[automod preset]", err);
      return interaction.editReply({ content: `ルールの作成に失敗しました: ${err.message}` });
    }
  }

  if (sub === "spam") {
    const limit = interaction.options.getInteger("mention_limit") ?? 5;
    const logChannel = interaction.options.getChannel("log_channel");

    try {
      const rule = await guild.autoModerationRules.create({
        name: "AutoMod: メンションスパム保護",
        eventType: AutoModerationRuleEventType.MessageSend,
        triggerType: AutoModerationRuleTriggerType.MentionSpam,
        triggerMetadata: { mentionTotalLimit: limit },
        actions: buildActions(logChannel, true),
        enabled: true,
        reason: `AutoMod スパム設定: ${interaction.user.tag}`,
      });

      const embed = new EmbedBuilder()
        .setTitle("AutoMod スパム保護ルール作成完了")
        .setColor(0x57f287)
        .addFields(
          { name: "ルール ID", value: `\`${rule.id}\``, inline: true },
          { name: "最大メンション数", value: `${limit} 回/メッセージ`, inline: true },
          { name: "アクション", value: "メッセージをブロック" },
          {
            name: "ログチャンネル",
            value: logChannel ? `<#${logChannel.id}>` : "なし",
            inline: true,
          }
        )
        .setTimestamp();

      return interaction.editReply({ embeds: [embed] });
    } catch (err) {
      console.error("[automod spam]", err);
      return interaction.editReply({ content: `ルールの作成に失敗しました: ${err.message}` });
    }
  }

  if (sub === "link") {
    const name = interaction.options.getString("name");
    const allowedDomainsStr = interaction.options.getString("allowed_domains") || "";
    const logChannel = interaction.options.getChannel("log_channel");

    const allowedDomains = allowedDomainsStr
      .split(",")
      .map((d) => d.trim())
      .filter((d) => d.length > 0);

    try {
      const rule = await guild.autoModerationRules.create({
        name,
        eventType: AutoModerationRuleEventType.MessageSend,
        triggerType: AutoModerationRuleTriggerType.Keyword,
        triggerMetadata: {
          keywordFilter: [],
          regexPatterns: [
            "https?://(?!(" +
              (allowedDomains.length > 0
                ? allowedDomains.map((d) => d.replace(".", "\\.")).join("|")
                : "discord\\.com|discord\\.gg") +
              "))[\\w.-]+\\.[a-z]{2,}",
          ],
        },
        actions: buildActions(logChannel, true),
        enabled: true,
        reason: `AutoMod リンクフィルター設定: ${interaction.user.tag}`,
      });

      const embed = new EmbedBuilder()
        .setTitle("AutoMod リンクフィルタールール作成完了")
        .setColor(0x57f287)
        .addFields(
          { name: "ルール名", value: rule.name, inline: true },
          { name: "ルール ID", value: `\`${rule.id}\``, inline: true },
          {
            name: "許可ドメイン",
            value: allowedDomains.length > 0 ? allowedDomains.join(", ") : "discord.com, discord.gg のみ",
          },
          { name: "アクション", value: "メッセージをブロック" },
          {
            name: "ログチャンネル",
            value: logChannel ? `<#${logChannel.id}>` : "なし",
            inline: true,
          }
        )
        .setTimestamp();

      return interaction.editReply({ embeds: [embed] });
    } catch (err) {
      console.error("[automod link]", err);
      return interaction.editReply({ content: `ルールの作成に失敗しました: ${err.message}` });
    }
  }

  if (sub === "enable") {
    const ruleId = interaction.options.getString("rule_id");
    try {
      const rule = await guild.autoModerationRules.edit(ruleId, { enabled: true });
      return interaction.editReply({
        embeds: [
          new EmbedBuilder()
            .setTitle("AutoMod ルール有効化")
            .setColor(0x57f287)
            .setDescription(`**${rule.name}** (\`${rule.id}\`) を有効にしました。`)
            .setTimestamp(),
        ],
      });
    } catch (err) {
      return interaction.editReply({ content: `ルールの有効化に失敗しました: ${err.message}` });
    }
  }

  if (sub === "disable") {
    const ruleId = interaction.options.getString("rule_id");
    try {
      const rule = await guild.autoModerationRules.edit(ruleId, { enabled: false });
      return interaction.editReply({
        embeds: [
          new EmbedBuilder()
            .setTitle("AutoMod ルール無効化")
            .setColor(0xed4245)
            .setDescription(`**${rule.name}** (\`${rule.id}\`) を無効にしました。`)
            .setTimestamp(),
        ],
      });
    } catch (err) {
      return interaction.editReply({ content: `ルールの無効化に失敗しました: ${err.message}` });
    }
  }

  if (sub === "delete") {
    const ruleId = interaction.options.getString("rule_id");
    try {
      const rule = await guild.autoModerationRules.fetch(ruleId);
      const ruleName = rule.name;
      await guild.autoModerationRules.delete(ruleId, `AutoMod削除: ${interaction.user.tag}`);
      return interaction.editReply({
        embeds: [
          new EmbedBuilder()
            .setTitle("AutoMod ルール削除")
            .setColor(0xed4245)
            .setDescription(`**${ruleName}** (\`${ruleId}\`) を削除しました。`)
            .setTimestamp(),
        ],
      });
    } catch (err) {
      return interaction.editReply({ content: `ルールの削除に失敗しました: ${err.message}` });
    }
  }

  if (sub === "exempt") {
    const ruleId = interaction.options.getString("rule_id");
    const role = interaction.options.getRole("role");
    const channel = interaction.options.getChannel("channel");

    if (!role && !channel) {
      return interaction.editReply({ content: "ロールまたはチャンネルを1つ以上指定してください。" });
    }

    try {
      const rule = await guild.autoModerationRules.fetch(ruleId);

      const currentExemptRoles = [...(rule.exemptRoles?.map((r) => r.id) || [])];
      const currentExemptChannels = [...(rule.exemptChannels?.map((c) => c.id) || [])];

      if (role && !currentExemptRoles.includes(role.id)) {
        currentExemptRoles.push(role.id);
      }
      if (channel && !currentExemptChannels.includes(channel.id)) {
        currentExemptChannels.push(channel.id);
      }

      const updated = await guild.autoModerationRules.edit(ruleId, {
        exemptRoles: currentExemptRoles,
        exemptChannels: currentExemptChannels,
      });

      const embed = new EmbedBuilder()
        .setTitle("AutoMod 除外設定完了")
        .setColor(0x5865f2)
        .addFields(
          { name: "ルール", value: `${updated.name} (\`${updated.id}\`)` },
          {
            name: "除外ロール",
            value:
              currentExemptRoles.length > 0
                ? currentExemptRoles.map((r) => `<@&${r}>`).join(", ")
                : "なし",
          },
          {
            name: "除外チャンネル",
            value:
              currentExemptChannels.length > 0
                ? currentExemptChannels.map((c) => `<#${c}>`).join(", ")
                : "なし",
          }
        )
        .setTimestamp();

      return interaction.editReply({ embeds: [embed] });
    } catch (err) {
      return interaction.editReply({ content: `除外設定に失敗しました: ${err.message}` });
    }
  }
}
