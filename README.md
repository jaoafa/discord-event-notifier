# discord-event-notifier

Discord のスケジュールイベントが作成されたとき、および開始されたときに、指定したチャンネルへ通知する Bot です。イベントの開始時には、そのイベントに「興味あり」を付けたユーザーへメンションします。

## 設定

`data/config.json` を作成し、Bot のトークンを指定します。ファイルの場所は、そのファイルが存在する場合に限り、環境変数 `CONFIG_PATH` で変更できます。

```json
{
  "discord": {
    "token": "Discord Bot のトークン"
  }
}
```

Bot には `Guilds` と `GuildScheduledEvents` のインテントが必要です。

### 環境変数

| 変数 | 説明 | 既定値 |
| --- | --- | --- |
| `CONFIG_PATH` | 設定ファイルのパス | `data/config.json` |
| `BASE_SERVER_DIR` | サーバごとの登録情報 (`<サーバ ID>.json`) を保存するディレクトリ | `data/servers/` |

Docker イメージでは、それぞれ `/data/config.json` と `/data/servers/` が設定されています。

## 使い方

Bot をサーバに招待すると、スラッシュコマンド `/discord-event-notifier` が登録されます。どちらのサブコマンドも「サーバの管理」権限が必要です。

- `register [channel]`: サーバを通知対象に登録します。`channel` にはテキストチャンネルを指定でき、省略するとコマンドを実行したチャンネルが通知先になります。未登録のサーバにのみ表示されます。
- `unregister`: 通知対象から外します。登録済みのサーバにのみ表示されます。

## 実行方法

Node.js と pnpm が必要です。

```bash
pnpm install
pnpm start   # 起動
pnpm dev     # ファイル変更を監視して再起動
pnpm lint    # prettier / eslint / tsc
pnpm fix     # prettier / eslint の自動修正
```

Docker Compose では、`./data` を `/data` にマウントして起動します。

```bash
docker compose up -d --build
```
