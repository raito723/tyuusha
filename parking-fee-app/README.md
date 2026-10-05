# React + Vite

## Google Maps Platform の設定

このアプリはGoogle Maps JavaScript APIで地図を表示し、Places API (New)で地点・周辺駐車場を検索し、Routes APIで駐車場までの運転ルートをアプリ内に表示します。

1. Google Cloudでプロジェクトの課金を有効にします。
2. **Maps JavaScript API**、**Places API (New)**、**Routes API**を有効にします。
3. APIキーを2つ作成し、Google Cloudの「APIとサービス」からキーを制限します。
   - 地図表示用キー: WebサイトのHTTPリファラー（開発時の`http://localhost:5173/*`と公開サイトのドメイン）に制限し、API制限をMaps JavaScript APIにします。
   - サーバー用キー: API制限をPlaces APIとRoutes APIにします。キーを`VITE_`で始めず、ブラウザーへ公開しないでください。本番環境では可能ならサーバーの送信元IPにも制限します。
4. プロジェクト直下に`.env.local`を作り、次の値を設定します。キーの実値はGitへコミットしないでください。`.gitignore`の`*.local`が`.env.local`を除外します。

```env
VITE_GOOGLE_MAPS_API_KEY=地図表示用キー
GOOGLE_MAPS_SERVER_API_KEY=Places・Routes用サーバーキー
GEMINI_API_KEY=Google AI Studioで取得したGemini APIキー
```

5. 開発サーバーを再起動します。Google Cloudの予算アラートとAPIごとの利用上限も設定してください。予算アラートは通知であり、自動で課金を停止する設定ではありません。

### 使用SKUと無料枠

2026年10月確認時点のグローバル料金表（米ドル）です。無料枠はSKUごとに月単位で適用されます。

| SKU | 用途 | 月間無料枠 | 無料枠超過後の最初の料金帯 |
| --- | --- | ---: | ---: |
| Dynamic Maps | 地図ロード | 10,000 | $7 / 1,000 loads |
| Places API Nearby Search Pro | 5km範囲の駐車場検索 | 5,000 | $32 / 1,000 requests |
| Places API Text Search Pro | 入力した地名・住所の検索 | 5,000 | $32 / 1,000 requests |
| Routes: Compute Routes Essentials | 通常の運転経路とポリライン | 10,000 | $5 / 1,000 requests |

周辺検索は1リクエスト最大20件の制限に対応するため、5km範囲を東西2つの検索円で覆います。アプリ上で周辺検索を1回行うとNearby Searchの課金イベントを最大2件使い、重複除外後は最大40件です（密集地ではGoogle側の各検索上限により少なくなる場合があります）。検索結果の駐車料金、営業時間、満空状況はGoogle Placesから取得しておらず、未提供として表示します。通常の運転経路だけを要求し、交通情報を使うPro機能や通行料金計算などのEnterprise機能は要求しません。

公式料金表: [Google Maps Platform pricing](https://developers.google.com/maps/billing-and-pricing/pricing)。実際の価格・利用条件はGoogle Cloudの請求画面で確認してください。

## 料金表写真のOCR

料金表写真の読み取りにはGemini APIを使用します。`GEMINI_API_KEY`はサーバー専用の環境変数として設定してください。`VITE_`を付けず、ブラウザーへ公開しないでください。必要に応じて`GEMINI_MODEL`でモデル名を指定できます（既定値は`gemini-3.8-flash`）。

```sh
npm run dev
```

このコマンドでViteとAPIサーバーが起動します。画像はPNG・JPEG・WebP、10MB以下、1枚まで受け付けます。APIサーバーが画像をGemini APIへ送り、料金項目をJSON形式で受け取ります。認識できない項目は空欄で確認画面に表示されます。APIはIPごとに15分あたり20回までです。Gemini APIの利用にはGoogle側の料金・利用条件が適用されます。

読み取り結果では、画像と編集欄を同時に表示します。昼夜別・終日料金、繰り返し適用される最大料金、昼夜別または終日共通の最大料金、曜日別の料金を編集できます。最大料金欄が空欄の場合は上限なしとして計算します。曜日別料金は、駐車日時をブラウザーのローカル曜日で判定して適用します。読み取れない項目は空欄のままでも計算できます。料金ルールはブラウザーのローカルストレージへ保存されます。AIの認識結果は料金表と照らして確認してください。画像は処理のためGemini APIへ送信されます。アプリのサーバーでは画像をディスクに保存せず、ブラウザーのプレビューURLも画面を離れる時に破棄します。

This template provides a minimal setup to get React working in Vite with HMR and some Oxlint rules.

Currently, two official plugins are available:

- [@vitejs/plugin-react](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react) uses [Oxc](https://oxc.rs)
- [@vitejs/plugin-react-swc](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react-swc) uses [SWC](https://swc.rs/)

## React Compiler

The React Compiler is not enabled on this template because of its impact on dev & build performances. To add it, see [this documentation](https://react.dev/learn/react-compiler/installation).

## Expanding the Oxlint configuration

If you are developing a production application, we recommend using TypeScript with type-aware lint rules enabled. Check out the [TS template](https://github.com/vitejs/vite/tree/main/packages/create-vite/template-react-ts) for information on how to integrate TypeScript and Oxlint's TypeScript related rules in your project.
