import { SlashCommandBuilder, EmbedBuilder } from "discord.js";
import { generateAIResponse, generateWithSpecificProvider } from "../utils/aiManager.js";
import {
  getCustomInstruction,
  getConversationHistory,
  addConversationMessage,
  clearConversationHistory,
} from "../utils/database.js";
import { hasModPermission } from "../utils/permissions.js";

const PROVIDER_CHOICES = [
  { name: "Auto (ローテーション)", value: "auto" },
  { name: "Gemini", value: "gemini" },
  { name: "OpenRouter", value: "openrouter" },
  { name: "Groq", value: "groq" },
];

function providerOpt(opt) {
  return opt
    .setName("provider")
    .setDescription("使用するAIプロバイダー（省略時はAuto）")
    .setRequired(false)
    .addChoices(...PROVIDER_CHOICES);
}

export const data = new SlashCommandBuilder()
  .setName("ai")
  .setDescription("AI高性能コマンド群")
  .addSubcommand((s) =>
    s
      .setName("ask")
      .setDescription("AIに質問する")
      .addStringOption((o) =>
        o.setName("question").setDescription("質問内容").setRequired(true)
      )
      .addStringOption(providerOpt)
  )
  .addSubcommand((s) =>
    s
      .setName("code")
      .setDescription("コードを生成・解説・デバッグする")
      .addStringOption((o) =>
        o.setName("request").setDescription("コードのリクエスト内容").setRequired(true)
      )
      .addStringOption((o) =>
        o
          .setName("language")
          .setDescription("プログラミング言語 (例: Python, JavaScript, Rust)")
          .setRequired(false)
      )
      .addStringOption(providerOpt)
  )
  .addSubcommand((s) =>
    s
      .setName("translate")
      .setDescription("テキストを翻訳する")
      .addStringOption((o) =>
        o.setName("text").setDescription("翻訳するテキスト").setRequired(true)
      )
      .addStringOption((o) =>
        o
          .setName("target")
          .setDescription("翻訳先の言語 (例: 日本語, English, 中文)")
          .setRequired(false)
      )
      .addStringOption(providerOpt)
  )
  .addSubcommand((s) =>
    s
      .setName("summary")
      .setDescription("テキストを要約する")
      .addStringOption((o) =>
        o.setName("text").setDescription("要約するテキスト").setRequired(true)
      )
      .addStringOption((o) =>
        o
          .setName("length")
          .setDescription("要約の長さ")
          .setRequired(false)
          .addChoices(
            { name: "短め (3文以内)", value: "short" },
            { name: "普通 (5文程度)", value: "medium" },
            { name: "詳しく (箇条書き)", value: "detailed" }
          )
      )
      .addStringOption(providerOpt)
  )
  .addSubcommand((s) =>
    s
      .setName("improve")
      .setDescription("テキストを改善・添削する")
      .addStringOption((o) =>
        o.setName("text").setDescription("改善するテキスト").setRequired(true)
      )
      .addStringOption((o) =>
        o
          .setName("goal")
          .setDescription("改善の目的 (例: ビジネスメール, わかりやすく)")
          .setRequired(false)
      )
      .addStringOption(providerOpt)
  )
  .addSubcommand((s) =>
    s
      .setName("explain")
      .setDescription("概念や用語をわかりやすく説明する")
      .addStringOption((o) =>
        o.setName("topic").setDescription("説明してほしい概念・用語").setRequired(true)
      )
      .addStringOption((o) =>
        o
          .setName("level")
          .setDescription("説明のレベル")
          .setRequired(false)
          .addChoices(
            { name: "初心者向け", value: "beginner" },
            { name: "中級者向け", value: "intermediate" },
            { name: "上級者向け", value: "expert" }
          )
      )
      .addStringOption(providerOpt)
  )
  .addSubcommand((s) =>
    s
      .setName("review")
      .setDescription("コードレビューを行う")
      .addStringOption((o) =>
        o.setName("code").setDescription("レビューするコード").setRequired(true)
      )
      .addStringOption((o) =>
        o
          .setName("focus")
          .setDescription("重点的に確認する観点 (例: セキュリティ, パフォーマンス)")
          .setRequired(false)
      )
      .addStringOption(providerOpt)
  )
  .addSubcommand((s) =>
    s
      .setName("debug")
      .setDescription("コードのバグを特定・修正する")
      .addStringOption((o) =>
        o.setName("code").setDescription("デバッグするコード").setRequired(true)
      )
      .addStringOption((o) =>
        o
          .setName("error")
          .setDescription("エラーメッセージ（あれば）")
          .setRequired(false)
      )
      .addStringOption(providerOpt)
  )
  .addSubcommand((s) =>
    s
      .setName("compare")
      .setDescription("2つの選択肢を比較分析する")
      .addStringOption((o) =>
        o.setName("option_a").setDescription("選択肢A").setRequired(true)
      )
      .addStringOption((o) =>
        o.setName("option_b").setDescription("選択肢B").setRequired(true)
      )
      .addStringOption((o) =>
        o
          .setName("context")
          .setDescription("比較の文脈・目的 (例: Webフレームワーク選定)")
          .setRequired(false)
      )
      .addStringOption(providerOpt)
  )
  .addSubcommand((s) =>
    s
      .setName("regex")
      .setDescription("正規表現を生成・説明する")
      .addStringOption((o) =>
        o
          .setName("request")
          .setDescription("正規表現のリクエスト (例: メールアドレスを検出する正規表現)")
          .setRequired(true)
      )
      .addStringOption((o) =>
        o
          .setName("language")
          .setDescription("対象の言語・環境 (例: Python, JavaScript)")
          .setRequired(false)
      )
      .addStringOption(providerOpt)
  )
  .addSubcommand((s) =>
    s
      .setName("sql")
      .setDescription("SQLクエリを生成・最適化する")
      .addStringOption((o) =>
        o
          .setName("request")
          .setDescription("SQLのリクエスト (例: ユーザーの購入履歴を取得するクエリ)")
          .setRequired(true)
      )
      .addStringOption((o) =>
        o
          .setName("schema")
          .setDescription("テーブルスキーマ（あれば）")
          .setRequired(false)
      )
      .addStringOption(providerOpt)
  )
  .addSubcommand((s) =>
    s
      .setName("json")
      .setDescription("JSONを整形・解析・変換する")
      .addStringOption((o) =>
        o.setName("data").setDescription("JSONデータまたは変換リクエスト").setRequired(true)
      )
      .addStringOption((o) =>
        o
          .setName("action")
          .setDescription("実行する操作")
          .setRequired(false)
          .addChoices(
            { name: "整形 (Pretty Print)", value: "format" },
            { name: "解析・説明", value: "analyze" },
            { name: "スキーマ生成", value: "schema" },
            { name: "TypeScript型生成", value: "typescript" }
          )
      )
      .addStringOption(providerOpt)
  )
  .addSubcommand((s) =>
    s
      .setName("security")
      .setDescription("コードのセキュリティチェックを行う")
      .addStringOption((o) =>
        o.setName("code").setDescription("チェックするコード").setRequired(true)
      )
      .addStringOption((o) =>
        o
          .setName("context")
          .setDescription("コードの用途・環境 (例: Webサーバー, 認証処理)")
          .setRequired(false)
      )
      .addStringOption(providerOpt)
  )
  .addSubcommand((s) =>
    s
      .setName("optimize")
      .setDescription("コードのパフォーマンスを最適化する")
      .addStringOption((o) =>
        o.setName("code").setDescription("最適化するコード").setRequired(true)
      )
      .addStringOption((o) =>
        o
          .setName("target")
          .setDescription("最適化の目標 (例: 実行速度, メモリ使用量, 可読性)")
          .setRequired(false)
      )
      .addStringOption(providerOpt)
  )
  .addSubcommand((s) =>
    s
      .setName("history")
      .setDescription("自分の会話履歴をリセットする")
  );

async function runAI(interaction, prompt, providerChoice) {
  await interaction.deferReply();

  const guildId = interaction.guild?.id;
  const customInstruction = guildId ? getCustomInstruction(guildId) : null;

  try {
    let result;
    if (providerChoice && providerChoice !== "auto") {
      result = await generateWithSpecificProvider(
        providerChoice,
        [{ role: "user", content: prompt }],
        customInstruction
      );
    } else {
      result = await generateAIResponse(
        [{ role: "user", content: prompt }],
        customInstruction
      );
    }

    const text = result.text;
    const provider = result.provider;

    const chunks = [];
    let current = "";
    for (const line of text.split("\n")) {
      if (current.length + line.length + 1 > 1900) {
        chunks.push(current);
        current = line;
      } else {
        current += (current ? "\n" : "") + line;
      }
    }
    if (current) chunks.push(current);

    const embed = new EmbedBuilder()
      .setColor(0x5865f2)
      .setDescription(chunks[0] || "応答なし")
      .setFooter({ text: `Provider: ${provider}` })
      .setTimestamp();

    await interaction.editReply({ embeds: [embed] });

    for (let i = 1; i < chunks.length; i++) {
      await interaction.followUp({
        embeds: [new EmbedBuilder().setColor(0x5865f2).setDescription(chunks[i])],
      });
    }
  } catch (err) {
    console.error("[AI Command]", err);
    await interaction.editReply({
      content: "AIの応答に失敗しました。しばらくしてからもう一度お試しください。",
    });
  }
}

export async function execute(interaction) {
  const sub = interaction.options.getSubcommand();

  if (sub !== "history" && !hasModPermission(interaction.member)) {
    return interaction.reply({
      content: "このコマンドを使用する権限がありません。",
      ephemeral: true,
    });
  }

  const provider = interaction.options.getString("provider") || "auto";

  if (sub === "history") {
    const guildId = interaction.guild?.id;
    if (guildId) {
      clearConversationHistory(guildId, interaction.channel.id, interaction.user.id);
    }
    return interaction.reply({
      content: "あなたの会話履歴をリセットしました。",
      ephemeral: true,
    });
  }

  if (sub === "ask") {
    const question = interaction.options.getString("question");
    return runAI(interaction, question, provider);
  }

  if (sub === "code") {
    const request = interaction.options.getString("request");
    const lang = interaction.options.getString("language") || "";
    const prompt = lang
      ? `以下のコードリクエストに${lang}で答えてください:\n${request}`
      : `以下のコードリクエストに答えてください:\n${request}`;
    return runAI(interaction, prompt, provider);
  }

  if (sub === "translate") {
    const text = interaction.options.getString("text");
    const target = interaction.options.getString("target") || "日本語";
    return runAI(
      interaction,
      `以下のテキストを${target}に翻訳してください。翻訳文のみを出力してください:\n${text}`,
      provider
    );
  }

  if (sub === "summary") {
    const text = interaction.options.getString("text");
    const length = interaction.options.getString("length") || "medium";
    const lengthMap = {
      short: "3文以内で簡潔に",
      medium: "5文程度で",
      detailed: "箇条書きで詳しく",
    };
    return runAI(
      interaction,
      `以下のテキストを${lengthMap[length]}要約してください:\n${text}`,
      provider
    );
  }

  if (sub === "improve") {
    const text = interaction.options.getString("text");
    const goal = interaction.options.getString("goal") || "より自然で読みやすく";
    return runAI(
      interaction,
      `以下のテキストを「${goal}」という目的で改善・添削してください。改善後のテキストと変更点を説明してください:\n${text}`,
      provider
    );
  }

  if (sub === "explain") {
    const topic = interaction.options.getString("topic");
    const level = interaction.options.getString("level") || "intermediate";
    const levelMap = {
      beginner: "まったくの初心者向けに、例え話を使いながら",
      intermediate: "ある程度の知識がある人向けに",
      expert: "専門家向けに技術的詳細も含めて",
    };
    return runAI(
      interaction,
      `「${topic}」について${levelMap[level]}説明してください。`,
      provider
    );
  }

  if (sub === "review") {
    const code = interaction.options.getString("code");
    const focus = interaction.options.getString("focus") || "全般";
    return runAI(
      interaction,
      `以下のコードを「${focus}」の観点でレビューしてください。問題点、改善案、良い点を指摘してください:\n\`\`\`\n${code}\n\`\`\``,
      provider
    );
  }

  if (sub === "debug") {
    const code = interaction.options.getString("code");
    const error = interaction.options.getString("error") || "";
    const prompt = error
      ? `以下のコードで次のエラーが発生しています。原因を特定し修正してください:\nエラー: ${error}\nコード:\n\`\`\`\n${code}\n\`\`\``
      : `以下のコードのバグを特定し、修正案を提示してください:\n\`\`\`\n${code}\n\`\`\``;
    return runAI(interaction, prompt, provider);
  }

  if (sub === "compare") {
    const a = interaction.options.getString("option_a");
    const b = interaction.options.getString("option_b");
    const context = interaction.options.getString("context") || "";
    const prompt = context
      ? `「${context}」という文脈で、「${a}」と「${b}」を比較分析してください。メリット・デメリット、使用場面、推奨を含めてください。`
      : `「${a}」と「${b}」を比較分析してください。メリット・デメリット、使用場面、推奨を含めてください。`;
    return runAI(interaction, prompt, provider);
  }

  if (sub === "regex") {
    const request = interaction.options.getString("request");
    const lang = interaction.options.getString("language") || "";
    const prompt = lang
      ? `${lang}で使用できる正規表現を生成してください: ${request}\n正規表現パターン、説明、使用例を提示してください。`
      : `以下の要件を満たす正規表現を生成してください: ${request}\n正規表現パターン、説明、使用例を提示してください。`;
    return runAI(interaction, prompt, provider);
  }

  if (sub === "sql") {
    const request = interaction.options.getString("request");
    const schema = interaction.options.getString("schema") || "";
    const prompt = schema
      ? `以下のスキーマに基づいてSQLクエリを生成してください:\nスキーマ: ${schema}\nリクエスト: ${request}\nクエリの説明も含めてください。`
      : `以下のリクエストに基づいてSQLクエリを生成してください: ${request}\nクエリの説明も含めてください。`;
    return runAI(interaction, prompt, provider);
  }

  if (sub === "json") {
    const data = interaction.options.getString("data");
    const action = interaction.options.getString("action") || "analyze";
    const actionMap = {
      format: "以下のJSONを整形して（Pretty Print）出力してください:",
      analyze: "以下のJSONを解析し、構造と内容を日本語で説明してください:",
      schema: "以下のJSONデータからJSONスキーマを生成してください:",
      typescript: "以下のJSONデータからTypeScriptの型定義を生成してください:",
    };
    return runAI(interaction, `${actionMap[action]}\n${data}`, provider);
  }

  if (sub === "security") {
    const code = interaction.options.getString("code");
    const context = interaction.options.getString("context") || "";
    const prompt = context
      ? `以下のコード（${context}）のセキュリティチェックを行ってください。脆弱性、リスク、修正案を提示してください:\n\`\`\`\n${code}\n\`\`\``
      : `以下のコードのセキュリティチェックを行ってください。脆弱性、リスク、修正案を提示してください:\n\`\`\`\n${code}\n\`\`\``;
    return runAI(interaction, prompt, provider);
  }

  if (sub === "optimize") {
    const code = interaction.options.getString("code");
    const target = interaction.options.getString("target") || "実行速度とメモリ使用量";
    return runAI(
      interaction,
      `以下のコードを「${target}」を目標に最適化してください。最適化後のコードと改善点の説明を提示してください:\n\`\`\`\n${code}\n\`\`\``,
      provider
    );
  }
}
