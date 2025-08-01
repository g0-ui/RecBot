import "dotenv/config"; // .envファイルから環境変数を読み込む
import { Client, Collection, GatewayIntentBits } from "discord.js"; // Discord.jsの主要クラスをインポート
import { readdirSync } from "fs"; // ファイルシステム操作用
import path from "path"; // パス操作用
import { fileURLToPath } from "url"; // ファイルURLをパスに変換

const __dirname = path.dirname(fileURLToPath(import.meta.url)); // 現在のディレクトリ名を取得

const client = new Client({
  intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildVoiceStates], // ギルドとボイス状態のIntentを指定
});

client.commands = new Collection(); // コマンドを格納するコレクション
client.activeBoshu = new Map(); // 募集中の一覧（メモリ管理用）

// commandsフォルダ内の.jsファイルを取得してコマンドとして登録
const commandFiles = readdirSync(path.join(__dirname, "commands")).filter(
  (file) => file.endsWith(".js")
);
for (const file of commandFiles) {
  const command = await import(`./commands/${file}`); // コマンドファイルを動的インポート
  client.commands.set(command.data.name, command); // コマンド名でコレクションに追加
}

// Botが起動したときの処理
client.once("ready", () => {
  console.log(`✅ Logged in as ${client.user.tag}`); // ログイン完了メッセージ
});

// コマンドが実行されたときの処理
client.on("interactionCreate", async (interaction) => {
  if (!interaction.isChatInputCommand()) return; // チャットコマンド以外は無視

  const command = client.commands.get(interaction.commandName); // コマンド取得
  if (!command) return; // コマンドが存在しない場合は無視

  try {
    await command.execute(interaction); // コマンドを実行
  } catch (err) {
    console.error(err); // エラーをコンソールに表示
    await interaction.reply({
      content: "エラーが発生しました。",
      ephemeral: true, // ユーザーにのみ表示
    });
  }
});

client.login(process.env.DISCORD_TOKEN);
