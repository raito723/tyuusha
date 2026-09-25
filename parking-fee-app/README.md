# React + Vite

## Google Maps の設定

駐車場マップは Google Maps JavaScript API を使います。Google Cloud で Maps JavaScript API を有効にした API キーを用意し、プロジェクトのルートに `.env.local` を作成して次の値を設定してください。

```env
VITE_GOOGLE_MAPS_API_KEY=取得したAPIキー
```

`.env.example` を設定例として使えます。API キーには利用するサイトの HTTP リファラー制限を設定してください。設定後、開発サーバーを再起動します。

キーが未設定の場合も駐車場一覧や絞り込みは使えますが、地図は表示されません。

This template provides a minimal setup to get React working in Vite with HMR and some Oxlint rules.

Currently, two official plugins are available:

- [@vitejs/plugin-react](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react) uses [Oxc](https://oxc.rs)
- [@vitejs/plugin-react-swc](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react-swc) uses [SWC](https://swc.rs/)

## React Compiler

The React Compiler is not enabled on this template because of its impact on dev & build performances. To add it, see [this documentation](https://react.dev/learn/react-compiler/installation).

## Expanding the Oxlint configuration

If you are developing a production application, we recommend using TypeScript with type-aware lint rules enabled. Check out the [TS template](https://github.com/vitejs/vite/tree/main/packages/create-vite/template-react-ts) for information on how to integrate TypeScript and Oxlint's TypeScript related rules in your project.
