# React + Vite

## Mapbox の設定

駐車場マップは Mapbox GL JS を使います。Mapbox アカウントで公開用アクセストークンを作成し、プロジェクトのルートに `.env.local` を作成して次の値を設定してください。

```env
VITE_MAPBOX_ACCESS_TOKEN=取得した公開用アクセストークン
```

アクセストークンには利用するサイトの URL 制限を設定してください。設定後、開発サーバーを再起動します。

トークンが未設定または無効の場合も駐車場一覧や絞り込みは使えますが、地図は表示されません。

「この周辺の駐車場を検索」は Mapbox Search Box API の駐車場カテゴリを使い、現在地（位置情報が使えない場合は東京駅周辺）から5km以内を検索します。APIから取得できる駐車場名・位置と、サンプルデータの料金情報は混ぜずに表示します。料金・空き状況は別のデータ提供元がないため、検索結果では未提供として扱います。

This template provides a minimal setup to get React working in Vite with HMR and some Oxlint rules.

Currently, two official plugins are available:

- [@vitejs/plugin-react](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react) uses [Oxc](https://oxc.rs)
- [@vitejs/plugin-react-swc](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react-swc) uses [SWC](https://swc.rs/)

## React Compiler

The React Compiler is not enabled on this template because of its impact on dev & build performances. To add it, see [this documentation](https://react.dev/learn/react-compiler/installation).

## Expanding the Oxlint configuration

If you are developing a production application, we recommend using TypeScript with type-aware lint rules enabled. Check out the [TS template](https://github.com/vitejs/vite/tree/main/packages/create-vite/template-react-ts) for information on how to integrate TypeScript and Oxlint's TypeScript related rules in your project.
