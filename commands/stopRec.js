import { SlashCommandBuilder } from "discord.js";

// スラッシュコマンドの定義
export const data = new SlashCommandBuilder()
  .setName("募集停止") // コマンド名
  .setDescription("自分の募集を強制的に終了します") // コマンド説明
  .addStringOption(
    (option) =>
      option
        .setName("メッセージid") // 募集メッセージID
        .setDescription("募集メッセージのID") // オプション説明
        .setRequired(true) // 必須
  );

// コマンド実行時の処理
export async function execute(interaction) {
  const messageId = interaction.options.getString("メッセージid"); // メッセージID取得
  const boshu = interaction.client.activeBoshu.get(messageId); // 募集情報取得

  // 募集が存在しない場合
  if (!boshu) {
    return await interaction.reply({
      content: "指定された募集は存在しないか、すでに終了しています。",
      ephemeral: true, // 自分だけに表示
    });
  }

  // 主催者以外は停止不可
  if (boshu.authorId !== interaction.user.id) {
    return await interaction.reply({
      content: "この募集の主催者ではないため、停止できません。",
      ephemeral: true, // 自分だけに表示
    });
  }

  boshu.collector.stop(); // コレクター停止（募集終了）
  boshu.message.edit({
    content: "❌ 募集は主催者により中止されました。", // メッセージ更新
    embeds: [],
    components: [],
  });

  interaction.client.activeBoshu.delete(messageId); // 募集情報削除
  await interaction.reply({
    content: `募集 ${messageId} を停止しました。`, // 停止通知
    ephemeral: true, // 自分だけに表示
  });
}
