# React + Vite

## Google Maps の設定

駐車場マップは Google Maps JavaScript API を使います。Google Cloud で Maps JavaScript API を有効にした API キーを用意し、プロジェクトのルートに `.env.local` を作成して次の値を設定してください。

```env
VITE_GOOGLE_MAPS_API_KEY=取得したAPIキー
```

`.env.example` を設定例として使えます。API キーには利用するサイトの HTTP リファラー制限を設定してください。設定後、開発サーバーを再起動します。

キーが未設定の場合も駐車場一覧や絞り込みは使えますが、地図は表示されません。

## 料金表写真のOCR

料金表写真のOCRには、無料のTesseract.jsと同梱の日本語学習データを使用します。Google Cloud VisionやOpenAIのAPIキーは不要です。写真・OCR文字列を外部OCR/AIサービスへ送信しません。

```sh
npm run dev
```

このコマンドでViteとAPIサーバーが起動します。画像はPNG・JPEG・WebP、10MB以下、1枚まで受け付けます。サーバーは画像をメモリ上で処理し、Tesseract.jsで日本語OCRを実行します。抽出文字列から料金項目をローカルルールで整理します。画像とOCR文字列は保存せず、外部サービスにも送信しません。APIはIPごとに15分あたり20回までです。初回解析時は日本語OCR workerの起動に少し時間がかかります。

カメラで撮影または写真を選ぶとOCRを自動開始します。結果を確認・修正し、入庫予定時刻と退場予定時刻を指定して「内容を確認して料金を計算・保存」を押すと計算結果を表示します。読み取れない値は空欄で強調され、必須項目を埋めるまで計算できません。確認後の料金ルールはこのブラウザーのローカルストレージへ保存され、料金計算フォームにも反映されます。ローカルOCRは写真の状態や文字の大きさにより読み取りを誤ることがあるため、料金表と照らして確認してください。写真ファイルは保存せず、ブラウザーのプレビューURLも画面を離れる時に破棄します。

This template provides a minimal setup to get React working in Vite with HMR and some Oxlint rules.

Currently, two official plugins are available:

- [@vitejs/plugin-react](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react) uses [Oxc](https://oxc.rs)
- [@vitejs/plugin-react-swc](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react-swc) uses [SWC](https://swc.rs/)

## React Compiler

The React Compiler is not enabled on this template because of its impact on dev & build performances. To add it, see [this documentation](https://react.dev/learn/react-compiler/installation).

## Expanding the Oxlint configuration

If you are developing a production application, we recommend using TypeScript with type-aware lint rules enabled. Check out the [TS template](https://github.com/vitejs/vite/tree/main/packages/create-vite/template-react-ts) for information on how to integrate TypeScript and Oxlint's TypeScript related rules in your project.
