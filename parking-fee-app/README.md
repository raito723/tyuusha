# React + Vite

## Mapbox の設定

駐車場マップは Mapbox GL JS を使います。Mapbox アカウントで公開用アクセストークンを作成し、プロジェクトのルートに `.env.local` を作成して次の値を設定してください。

```env
VITE_MAPBOX_ACCESS_TOKEN=取得した公開用アクセストークン
GEMINI_API_KEY=Google AI Studioで取得したGemini APIキー
```

アクセストークンには利用するサイトの URL 制限を設定してください。設定後、開発サーバーを再起動します。

トークンが未設定または無効の場合も駐車場一覧や絞り込みは使えますが、地図は表示されません。

「この周辺の駐車場を検索」は Mapbox Search Box API の駐車場カテゴリを使い、現在地から5km以内の最大100件を検索します。APIから取得できる駐車場名・位置と、サンプルデータの料金情報は混ぜずに表示します。料金・空き状況は別のデータ提供元がないため、検索結果では未提供として扱います。

<!--
Google Maps移行コードは一時停止中です。再開時はGitコミット840c4efの変更から、地図関連ファイルを個別に復元してください。
必要SKU: Dynamic Maps、Places API Nearby Search Pro、Places API Text Search Pro、Routes: Compute Routes Essentials。
Google用コードは server/googleMaps.js と src/lib/googleMapsLoader.js に残しています。
-->

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
