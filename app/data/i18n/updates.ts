// 更新日志的日文 / 英文覆盖层（中文原文在 app/data/updates.ts），按条目 id 覆盖。
// 只写 title / description / items；版本号、日期、类型不翻。没写到的条目回落中文。
import type { UpdateLog } from "~/data/updates";
import type { TranslatedLocale } from "~/lib/i18n";
import type { DeepPartial } from "~/lib/localized-content";

type UpdateText = Pick<DeepPartial<UpdateLog>, "title" | "description" | "items">;

export const UPDATE_TEXT: Record<TranslatedLocale, Record<string, UpdateText>> = {
  ja: {
    "57": {
      "title": "🔵 ページ間の円形トランジションとジャンプ高速化",
      "description": "異なるページ間の移動は画面中央から円形に広がるトランジションになり、サイト内のジャンプが大幅に速くなりました。各サブページの左上に「ホームへ戻る」の出口があります",
      "items": [
        "異なるページ間の移動は画面中央から円形に広がります。同じモジュール内の移動や戻る操作はそのまま切り替え",
        "サイト内リンクはビューポートに入った時点でプリフェッチ。トップページのアイドル時には各モジュールをプリフェッチします。省データモードと 2G 回線では行いません",
        "音楽、CV、小麦島、ギャラリー、アニメのページはサーバーデータが不要になり、クリック後に余分なリクエストを待つ必要がなくなりました",
        "通常のジャンプで全サイトのデータを再取得しなくなり、毎回約 330ms の往復を節約",
        "静的リソースを 1 年間の永続キャッシュに変更。プリフェッチ済みのスタイルはクリック時にオリジンから再取得しません",
        "遅いジャンプの進捗バーがトランジション画面に写り込む問題と、トランジションが途中で切れる問題を修正",
        "アニメページのオーディオポップアップとローディングマスクを削除。サイト内から入ると音声付きで即座に再生（ブラウザにブロックされた場合はミュートに戻り、音声オンのボタンを表示）。ギャラリーと小麦島は入場アニメーションを削除",
        "子ページの左上に統一の「ホームへ戻る」入口を追加。もともと出口のなかった音楽、ギャラリー、小麦島ページにも追加"
      ]
    },
    "56": {
      "title": "🧪 音楽ページを米色の科学図版に",
      "description": "音楽ページを標本図版風に刷新：系統樹はスタイル・歌手・歌を科・属・種に分け、地層柱は年ごとに積み上げ。トップページも一緒に高速化",
      "items": [
        "Plate I 系統樹：科はスタイル、属は歌手、種は曲。外円に言語と出典を表示。ホバーでハイライト、クリックで標本カードを開く",
        "Plate II 地層柱：各年の歌手がその層の標準化石。層をクリックすると化石カードを表示",
        "ファーストビューは系統樹のみ。デスクトップでは一画面に全体が収まり、成長アニメーションは入場時に一度だけ再生",
        "図版はサーバーが SVG を直接出力。古い星空、パーティクル、GSAP アニメーションのページは削除",
        "トップページ：開いた時点ではデータベースを参照せず、メッセージラジオが近くまでスクロールしてから留言を読み込み",
        "トップページ：ヒーローの一文字ずつのアニメーションと写真ネットワークの常時アニメーションループを削除。音楽エリアはサーバーで直接出力し、背景テクスチャは遅延読み込みしない"
      ]
    },
    "55": {
      "title": "🛠️ トップページのターミナルを「ビルドログ」に",
      "description": "トップページにあった偽の AI ワークベンチを、このサイトの実際のビルドログに置き換えました：実際の会話、コミット、変更内容を表示",
      "items": [
        "各タスクのユーザーメッセージは当時 Claude Code と交わした会話の原文、AI の返信は実際の返信の抜粋",
        "コミット一覧、コミットヒートマップ、時間帯別の分布、Token 台帳は git と会話記録から生成",
        "右パネルはタスクごとにコードの diff、リポジトリ内の実際のドキュメント、計画ビュー、ページのスクリーンショットを表示。タグは閉じられ、ファイルカードをクリックすると再度開く",
        "ウィンドウのすりガラス効果を廃止し、必要なときだけ更新。ウィンドウ全体を高頻度で再描画しないように変更",
        "補給 Token、Echo Token、WeChat コピーなどの旧機能を削除"
      ]
    },
    "54": {
      "title": "⚡ フレームワーク更新とアセットの軽量化",
      "description": "Remix v2 から React Router v7 へ移行し、フォントと画像をオンデマンドで読み込むように。トップページのサイズが大幅に減少",
      "items": [
        "フレームワークを Remix v2 から React Router v7 に移行",
        "フォントは文字の出現頻度とサイト内の実際の使用文字で再サブセット化。トップページのフォントは 11.6MB から約 0.4MB に",
        "画像パイプラインで複数の幅の webp を生成。トップページ、ギャラリー、ゲーム、音楽、小麦島、CV ページは srcset を使い、画面サイズに応じて読み込み",
        "public 内で未使用のゲーム大画像を削除"
      ]
    },
    "53": {
      "title": "🌐 サイト全体が中国語・日本語・英語に対応",
      "description": "サイトが中国語・日本語・英語に対応。ブラウザの言語に合わせて対応するバージョンへ自動的に移動",
      "items": [
        "/ja と /en のバージョンを追加。ヘッダーで言語を切り替えられ、選択は記憶されます",
        "ログイン、エラーページ、メッセージボード、Nemesis のチャット画面と各ページの内容を翻訳。CV、ゲーム、更新履歴など長文コンテンツにも日英版あり",
        "言語プレフィックスのないアドレスにアクセスすると、ブラウザの言語に応じて自動で移動：中国語はそのまま、日本語は /ja、その他の言語は /en",
        "翻訳済みページは hreflang を出力し、検索エンジンが各言語版を識別しやすく",
        "ラジオの冒頭の一言も言語に合わせて切り替わり、アニメカードの説明文も追加で翻訳"
      ]
    },
    "52": {
      "title": "📜 トップページに更新履歴カードを追加",
      "description": "トップページに更新履歴カードを新設し、直近の更新が一目で分かるように",
      "items": [
        "Cursor の更新履歴のスタイルを参考に、直近のバージョンとタイトルをトップページに一覧表示",
        "項目をクリックすると、更新履歴ページの該当バージョンに直接移動"
      ]
    },
    "51": {
      "title": "🧠 Nemesis 第2次チューニング",
      "description": "モデルを直接接続に変更し、分類器の判断をより確実に。挑発や危機の場面での返信もより人間らしく",
      "items": [
        "各社のモデル API に直接接続。Grok は一時停止し、複雑な質問は DeepSeek へ。DeepSeek が失敗した場合は Gemini に切り替え",
        "分類器は自己申告の信頼度を出さなくなり、判断が難しいときは代替の対応方針を提示。誤ブロックと見逃しを減らす",
        "ヘイト・差別、性的コンテンツ、虚偽情報、ギャンブルの4つのリスクカテゴリを追加。生成を求められた場合のみブロックし、議論や相談には通常どおり回答",
        "挑発には例文をなぞらず、皮肉で切り返す手法に変更",
        "危機の返信は3段階：吐き出したいときは寄り添って聞き、繰り返し話題にするときは直接確認し、具体的な計画があるときは 120 と 12356 の心理援助ホットラインを案内",
        "友人のプライバシーと居場所に関する回答の境界を追加。返信にバックエンドの用語が出ないように",
        "DeepSeek は思考モードをオフにして空の返信を回避。ステッカータグの書き間違いも認識可能に",
        "チャットページのプライバシー説明を実際の保存範囲に合わせて書き直し。チャットページのサーバーサイドレンダリングで起きていた 500 エラーを修正"
      ]
    },
    "50": {
      "title": "📻 トップページの掲示板をラジオに",
      "description": "各メッセージは一つのラジオ局。目盛りを回すか自動で巡回して聴き、局と局の間はノイズ",
      "items": [
        "各メッセージは作成時に FM 周波数が割り当てられ、目盛りを回すか巡回すると別のメッセージに合わせられる",
        "チャンネルを切り替えるとピアノの音とサーッというノイズ。ピアノのサンプルはビューポートに入ったときに読み込み",
        "メッセージの上限は 140 文字に変更。同時に再生されるのは最大 9 件",
        "ラジオがビューポートの外にあるときはアニメーションと音を停止。視覚効果を減らす設定が有効な場合はアニメーションを再生しない",
        "メッセージの時刻は北京時間で統一表示"
      ]
    },
    "49": {
      "title": "🎬 トップページの動画をカスタムプレイヤーに変更",
      "description": "Ghost of Yōteiの動画をブラウザ標準のコントロールからカスタムプレイヤーに変更。映像は全体に広がり黒帯なし、マウスを離すと映像だけが残ります",
      "items": [
        "マウスが映像内で動いたときだけ中央の大きなアイコンと下部バーを表示。3秒静止するかフレーム外に出ると全てフェードアウト。一時停止中も同様",
        "下部バーは再生／一時停止、時間、白いシークバー（ドラッグ可）、ミュート、全画面、設定メニュー（再生速度、リンクをコピー）",
        "動画の位置までスクロールするとミュートで自動再生してループ、ビューポート外にスクロールすると自動で一時停止。手動で一時停止した場合は自動再開しない。視覚効果を減らす設定が有効な場合は自動再生しない",
        "ソースに含まれる上下の映画用黒帯をトリミング。インライン再生時は映像が全体に広がり、全画面時は元の全体画面に戻る",
        "カバーを動画内の青い花畑の一コマに変更。背景の油絵をカバーに使わないように",
        "動画エリア背後の油絵背景とドラッグ可能なウィンドウを削除。動画はページの背景色の上に直接配置。これにより発生していた横スクロールバーも修正",
        "キーボード対応：スペース／K で再生・一時停止、M でミュート、F で全画面、← → で 5 秒戻る・進む"
      ]
    },
    "48": {
      "title": "🌒 Nemesisチャット画面のリニューアル",
      "description": "チャットページを「影の対談」デザインに変更。墨色の円と土器色の影によるロゴ、三段階の思考トレース、停止・スキップ・再試行に対応",
      "items": [
        "返信は左側のロゴ＋明朝体本文の読みやすいレイアウトに。ユーザーのメッセージは右側の紙片風に。モデル名は等幅の小さな文字で返信末尾に表示",
        "思考過程を「理解 → 経路選択 → 生成」の三段トレースに変更し、所要時間を表示。メインモデルが失敗してバックアップに切り替わった場合、ステップと文言が赭色になる",
        "送信ボタンは状態に応じて切り替え：生成中は停止可能（質問は入力欄に戻る）、一文字ずつ表示中は全文を即時表示、上流エラー時はワンクリックで再試行",
        "サイドバーのセッションを「今日／それ以前」でグループ化し、時刻と件数を表示。削除は行内での二段階確認に変更",
        "フィードバックを分類カプセル＋補足説明に変更。送信後は「送信済み」とマーク。コピー成功時にチェックマークを表示",
        "プライバシーの説明を入力欄下の注記行に移動。初回訪問時の案内バーは詳細を展開可能に",
        "空の状態に推奨質問を4つ追加。音楽カード、ステッカー、動画添付のスタイルを統一",
        "スマホではサイドバーをドロワーに変更し、背景クリックで閉じる。全アニメーションは transform / opacity のみを変化させ、視覚効果を減らす設定を尊重"
      ]
    },
    "47": {
      "title": "🧭 Nemesis安全機能のダウングレード改修",
      "description": "分類器は「どう答えるか」のみを決定し、冷たく拒否しない。ハードレッドラインに該当する場合のみ定型文を返す",
      "items": [
        "Guardとルーティングを一回の Gemini 呼び出しに統合し、回答方針とモデルルーティングを出力",
        "分類器の障害は通常回答に、低信頼度による遮断は慎重な回答にダウングレード",
        "相談系には有用な情報と支援のサインを提供。危機系では思いやりを優先し 120 / 110 を案内",
        "出力側に原文漏洩チェックを新設。ペルソナ資料やシステムプロンプトをまるごと転載した場合は、そのメッセージ全体を置換",
        "メインモデルと分類器を gemini-3.5-flash-lite にアップグレードし、117 件のオフライン評価セットを追加"
      ]
    },
    "46": {
      "title": "🔒 レート制限・ログインリンク・Nemesisフローの強化",
      "description": "レート制限に障害が発生した場合は通過させない。Nemesisのリクエストはページ離脱時に中断可能に。履歴の返信はサーバー側で署名",
      "items": [
        "レート制限サービスに障害が発生した場合、Nemesisは黙って通すのではなく 503 を返す",
        "Magic Link 送信前にクォータをアトミックに減算し並行競合を解消。メールサービスの生のエラーは表示しないように",
        "Nemesis のストリーミング応答にハートビートと全体の時間制限を追加。チャットページを離れるとリクエストを中断し、上流モデルの呼び出しもキャンセル",
        "履歴の返信はサーバー側で署名され、署名が有効なメッセージのみを信頼。偽造されたコンテキストを遮断",
        "全サイト共通の 404 フォールバックルートを追加。root データにエラーがあってもページの枠組みは正常にエラーページを描画"
      ]
    },
    "45": {
      "title": "🗂️ 更新履歴を年別インデックスに変更",
      "description": "更新履歴ページを年ごとにグループ化。一バージョン一行で、クリックすると詳細を表示",
      "items": [
        "各バージョンは一行：日付、バージョン番号、タイトル、種類。クリックで説明と変更項目を展開",
        "種類でのフィルタリングを追加。リンクから特定のバージョンに直接アクセス可能",
        "フェードイン、光の斑点、カプセルタグなど不要な装飾を削除"
      ]
    },
    "44": {
      "title": "🎮 ゲームアーカイブとレジュメページのリニューアル",
      "description": "ゲームページは「プレイヤーアーカイブ」の編集スタイルに、レジュメページはサイドバー付きのプロフィールレイアウトに変更",
      "items": [
        "ゲームページ：オフホワイトの紙色とセリフ体のレイアウト。ページ上部の統計に切り替え可能な「今期のカバー」を追加。任意のゲームをクリックするとカバーを差し替え",
        "ゲームページ：PlayStation トロフィーケース、プラットフォーム分布、満点の殿堂、そしてフィルター／並べ替え／検索に対応した全コレクション",
        "レジュメページ：濃色のサイドバーに基本情報、スキル、個人の探求を配置。メインカラムは時系列で経歴を表示",
        "レジュメページ：背景はゆっくり漂うカラーブロックに細かいノイズを重ねる。絵文字アイコンと架空のスキル百分率を削除"
      ]
    },
    "43": {
      "title": "🎶 夺心之声 YRC 単語ごとの流光表示と楽曲追加",
      "description": "ホームの音楽プレイヤーを網易雲 YRC の単語単位流光歌詞に全面対応。ミリ秒単位の単語アライメントと楽曲追加に対応",
      "items": [
        "歌詞データモデル（LyricLine / LyricWord）を再構築。文字単位・単語単位のタイムラインと、中国語・英語の独立した二言語字幕に対応",
        "ホームの「夺心之声」プレイヤーに 60FPS の単語単位流光グラデーション着色（Karaoke Wipe）と滑らかなセンタリングスクロールを導入",
        "歌詞の任意の一行または単語をクリックすると、ミリ秒単位で該当位置にシーク（Click-to-Seek）",
        "Nine Point Eight、まっしろな雪、コネクト、Moments など計6曲の名曲を、マイクロ秒単位の YRC 文字単位データに全量変換して収録",
        "『エタニクル』『Daisy Crown』『远航星的告别』『アルカテイル』の高品質な4曲を追加し、プレイリストは10曲に拡大"
      ]
    },
    "42": {
      "title": "🖼️ ホームの映像ネットワークを再構築",
      "description": "ホームの写真エリアを曲線ネットワーク構成に変更。詩句を曲線に沿って配置し、映像素材も更新",
      "items": [
        "demo の Careers Network のビジュアル構造を再利用し、個人サイトのホーム用映像ネットワークコンポーネントに改造",
        "写真エリアの元の詩句を複数の短い文に分割し、SVG textPath で曲線パスに沿って表示",
        "コンポーネントの背景をサイトのメイン背景色に統一。九宮格の画像レイアウトとモバイルの位置ルールを補完",
        "ホームの一部映像を OSS の新リソース n10、n11、n12、n13 に差し替え",
        "public/demo とビルド成果物をメインプロジェクトの TypeScript チェックから除外し、サンプルコードがベースラインを汚さないように"
      ]
    },
    "41": {
      "title": "🛡️ Nemesis安全分類器を完全AI化",
      "description": "ローカルのキーワードルールと SAFE_BOUNDARY を削除。安全層は適合性の判断のみを行う",
      "items": [
        "安全分類器にローカルのキーワード／正規表現ルールを一切注入しなくなり、空入力と長さ制限のみを保持",
        "SAFE_BOUNDARY と safe_boundary 返信モードを廃止。通過後は一律に意図分類とメインモデルへ",
        "分類器は PASS / CLARIFY / REFUSE のみを出力。サイト内容やペルソナに関する議論はデフォルトで通過"
      ]
    },
    "40": {
      "title": "🧭 Nemesis デュアル Gemini 分類器",
      "description": "全メッセージで安全分類と意図分類を必ず実行し、その後メインモデルで返信を生成",
      "items": [
        "安全分類器：有効な全メッセージで gemini-3.1-flash-lite による JSON 分類を実行。強いルールはフォールバックのみ",
        "意図分類器：Gemini のクエリルーティングを復活。queryType / quote のヒントを出力",
        "メイン生成を Gateway ネイティブの generateContent に戻し、NEMESIS_GEMINI_THINKING_LEVEL=high を確実に有効化",
        "分類器は引き続き compat エンドポイント（minimal 思考）を使用。メイン返信と分類器は課金・監視を分けて計測"
      ]
    },
    "39": {
      "title": "🌐 Nemesis AI Gateway 統合",
      "description": "外部モデル呼び出しを全て Cloudflare AI Gateway 経由に統一し、Guard とルーティングのフローを簡素化",
      "items": [
        "Gemini、Grok、DeepSeek のリクエストを Gateway に統一。監視、クォータ、ベンダーキー管理を一元化",
        "Guard のグレーゾーン分類を Gemini の構造化 JSON に変更。Workers AI の小型分類モデルを削除",
        "Qwen 意図ルーターと Workers AI の roast フォールバックを廃止。罵倒モードはルールによる発動のみとし、Grok が失敗した場合は DeepSeek にフォールバック",
        "語録候補はルールによるタグマッチングに統一。ルーターが出力する quote ヒントには依存しない"
      ]
    },
    "38": {
      "title": "🎵 Nemesis チャットでの楽曲推薦",
      "description": "チャットの吹き出しで Apple Music の試聴を推薦する際、まず理由を説明してからプレイヤーを表示",
      "items": [
        "モデルが曲を推薦する際、本文でまず一文で「なぜこの曲を流すのか」を説明してから [media:id] タグを出力",
        "「サイトを見てみた」など訪問の文脈を検出した場合、曲目ライブラリの中でも落ち着いた控えめな曲を優先",
        "楽曲ライブラリのタグを system prompt の付録と揃え、テンポが速すぎたりスタイルが唐突な試聴を減らす"
      ]
    },
    "37": {
      "title": "🔀 Nemesis モデルルーティングの修正",
      "description": "意図ルーターが通常の挨拶を特殊な返信モードと誤判定する頻度を減らす",
      "items": [
        "特殊な返信モードは、メッセージ自体が事前設定のキーワードに一致した場合のみ有効。文脈だけで誤判定しない",
        "友人の訪問、短い挨拶などのフォローアップメッセージは、デフォルトで gemini_lite による通常会話を継続",
        "特殊モードは Grok を優先し、利用できない場合はサーバー側で DeepSeek にフォールバック。ルーターが予備の小型モデルを直接選ばないように"
      ]
    },
    "36": {
      "title": "🧠 Nemesis メモリとリソースルーティングの最適化",
      "description": "Nemesis の隠しメモリを拡充し、ページキャッシュの受け渡しと Worker による静的リソースの直接配信を改善",
      "items": [
        "Memory Canon にホストの生活文脈の記憶を追加し、Nemesis が会話の背景をより正確に理解できるように",
        "コンテンツページ loader の Cache-Control を route headers 経由で正しく転送し、キャッシュ動作を改善",
        "Worker で R2 フォントとステッカーの直接配信を統一処理。Worker ルートを優先し、静的リソースにフォールバック"
      ]
    },
    "35": {
      "title": "🔐 Magic Link ログインの修正",
      "description": "重複したレート制限と早すぎるクォータ消費による、本番環境での Magic Link 送信失敗を修正",
      "items": [
        "レート制限は先に確認し、後からクォータを消費する方式に変更。Resend での送信が成功した後にのみ IP／メール／クールダウンのカウントを記録し、失敗したリクエストでクォータを誤消費しないように",
        "api.auth ルーター層の重複した IP レート制限を削除。sendMagicLink に統一し、Better Auth 標準のエラー形式を返す",
        "クールダウン中は残り秒数と残り回数を含むメッセージを表示。ログインパネルのカウントダウンが正しく表示されるように",
        "IP の 1 時間あたりの上限を 5 回から 10 回に変更。Better Auth プラグイン内蔵のレート制限は 1 分あたり 10 回に緩和"
      ]
    },
    "34": {
      "title": "🎵 Nemesis Apple Music 試聴",
      "description": "適切な文脈で Nemesis が Apple Music の 30 秒公式試聴を送れるように。チャットの吹き出し内に曲カードと Listen on Apple Music バッジを表示",
      "items": [
        "key_eternicus の曲目ホワイトリスト（trackId 1844276892）を追加。モデルが出力する [media:id] をサーバー側で解析し、previewUrl とカバー情報を取得",
        "attachments が audio タイプに対応。同じ返信に1枚のステッカーと1曲の試聴を同時に含められる",
        "チャットページに ChatAudioPlayer を追加：カバー、再生／一時停止、30 秒のプログレスバー。その横に英語の Apple Music 公式バッジ、完全版への外部リンク",
        "normal モードの system prompt に音楽関連の付録を注入。iTunes lookup のメタデータを更新する music:sync スクリプトを追加",
        "recentMessages のプレースホルダー、コピー、localStorage の検証が音楽添付に対応するように補完"
      ]
    },
    "33": {
      "title": "😺 Nemesis チャットのステッカー",
      "description": "Nemesis が会話の文脈に応じて、事前定義のステッカーを返信に添付。ステッカー素材は R2 公開バケットでホストし、チャットページで直接描画",
      "items": [
        "Nemesis 向けステッカー 33 枚の意味カタログを追加。モデルは適切な場面で [sticker:id] を出力し、サーバー側のホワイトリスト解析後に公開 URL へ変換",
        "/api/nemesis が attachments を返すように拡張。チャットページでテキストとステッカーの吹き出しを表示し、タイプライター表示の完了後に画像を表示",
        "Worker に公開ルート /stickers/* を追加。R2 の gregorwang バケットから WebP/GIF を直接配信し、immutable の長期キャッシュを設定",
        "normal モードの system prompt にステッカー説明を追加。safe_boundary と Guard による短絡返信では画像を送らない",
        "recentMessages のプレースホルダー、コピー、フィードバック監査、localStorage セッションで attachments を扱えるように対応",
        "stickers:prepare / stickers:upload スクリプトを追加し、R2 ステッカー素材の今後の保守を容易に（素材本体はリポジトリに含めない）"
      ]
    },
    "32": {
      "title": "🎛️ サイト全体のモーション、フォント、フッター表示を統一",
      "description": "直近のサイト全体のビジュアル関連コミットを整理し、ボタン、カード、音楽ページ、フォントシステム、更新履歴ページ、フッターの操作感を一つにまとめた",
      "items": [
        "直近のスタイル統一コミットをもとに、メインボタン、トップへ戻るボタン、ナビゲーションの hover、ゲストブックの入口、一部カードの統一的なモーションを追加",
        "GSAP と Framer Motion の使用範囲を整理。music ページの主要なモーションは維持しつつ、スクロール監視、hover トリガー、アニメーションの再構築による負荷を軽減",
        "フォントシステムの監査を実施し、実行時のフォント変数、display 見出し、本文、説明文、引用、ラベル文字を統一されたセマンティッククラスに組み込み",
        "更新履歴ページの構造を再設計。サイト共通のナビゲーションとフッターを削除し、トップへ戻るボタンとホバーで展開するバージョン目次を追加",
        "ゲーム、更新履歴、CV、ギャラリー、利用規約、Xiao などのページに戻る導線、フォント階層、ページ内の説明文の統一ルールを適用",
        "トップページのフッターに幕状の Footer Reveal エフェクトを追加。元のフッター配色を保ったまま、コンテンツ層のスクロールで下部の Canvas フッターを表示",
        "サイトの現在のアーキテクチャに合わなくなった、ログインページとサイバーターミナルの管理者/権限判定に関する説明文を削除"
      ]
    },
    "31": {
      "title": "🧩 Nemesis 監査パイプラインとサイト説明の更新",
      "description": "直近のコミットを整理。Nemesis のマルチモデルルーティング、フィードバック監査、ゲストブック管理、トップページ QA の文言を更新",
      "items": [
        "Nemesis にクエリルーティングとマルチモデル呼び出しを追加。タスクに応じてモデル提供元を選択し、利用できない場合は利用可能な経路にフォールバック",
        "生成境界とモデル呼び出しの監査フィールドを追加。ルーティング、モデル、分類、安全境界に関する情報を記録し、回答の異常調査に活用",
        "Nemesis のフィードバック監査フローを追加。フロントエンドのフィードバック、API エントリ、バックエンドのイベント記録を一つの流れにし、フィルタリングと回答品質の継続的な調整を支援",
        "返信の再生成時に安全経路がずれる問題を修正。regenerate が正しい安全判定と文脈を引き継ぐように",
        "ゲストブックの管理画面を整理。審査状態、管理操作、トップページでの表示導線を改善し、日常の運用をわかりやすく",
        "トップページの QA 文言を更新。サイトの位置づけ、長期的な保守方針、更新頻度、問題の報告先を説明"
      ]
    },
    "30": {
      "title": "🔐 モバイル OAuth コールバック元の修正",
      "description": "モバイルと iPad のソーシャルログインで、入口ドメインの不一致により redirect_uri と state の検証が失敗する問題を修正",
      "items": [
        "Better Auth クライアントは、現在の window.location.origin ではなく、サイトの正規 APP_URL を baseURL として優先的に使用し、モバイルで異なる認可入口が生成されないように",
        "本番環境ではサーバー側 OAuth の baseURL を BETTER_AUTH_URL / APP_URL に固定し、リクエストの origin で Google と Microsoft のコールバック URL が決まらないように",
        "現在のリクエストの origin を trustedOrigins に引き続き保持し、Cloudflare、workers.dev、Punycode、非正規の入口でもコールバック検証が通るように",
        "マスクされた AuthDebug ログを追加。認可の開始とコールバック時の origin、host、referer、redirect_uri、state cookie の状態を記録し、デスクトップとモバイルの経路を比較可能に",
        "code、state、token、secret などの機密値は引き続き非表示。OAuth の入口と cookie の問題調査に必要な安全なフィールドのみ出力"
      ]
    },
    "29": {
      "title": "🧠 Nemesis の文脈判定とチャットのプライバシー表示",
      "description": "Nemesis Guard の文脈判定を改善し、チャットページの待機状態とローカルのプライバシー説明を追加",
      "items": [
        "Workers AI の前段分類器が直近の会話ウィンドウを参照するように変更。同じ話題の代名詞による追及やユーザーの訂正を、話題外と誤判定しないように",
        "ハードルールの遮断順序は変更せず、上書き可能な話題外/不明の分類にのみ文脈判定を適用。Nemesis のメイン応答ロジックには影響なし",
        "チャットページの待機状態を、権限確認、回数確認、範囲判定、応答待ちに分割し、長いリクエスト中の処理をわかりやすく",
        "右上に「プライバシー説明」の入口を追加。チャット履歴はサイトのデータベースに保存されず、サイト管理者のバックエンドからも閲覧されないことを説明",
        "チャットページを初めて開いたときに軽量なプライバシーカードを表示。同意後は localStorage で状態を保存し、入力や送信には影響しない"
      ]
    },
    "28": {
      "title": "🧭 Nemesis の遮断表示とチャット画面の整理",
      "description": "Nemesis の遮断応答をフロントエンドでのローカルな段階表示に変更し、チャット入力とセッションサイドバーの操作を修正",
      "items": [
        "バックエンドの Nemesis Guard は遮断時に blocked 状態のみを返し、分類ごとに異なる拒否文言は返さず、Gemini の呼び出しも行わない",
        "フロントエンドは localStorage でローカルの blocked 回数を記録し、1 回目、2 回目、3 回目以降で固定の段階的な案内を表示",
        "チャット入力欄のキーボード操作を修正。Enter のみで送信、Shift + Enter で改行し、通常のキー入力による誤送信を防止",
        "/chat を安定した左右レイアウトに再構成。ローカルのセッションサイドバーを復元し、ローカル会話の新規作成、切り替え、削除に対応",
        "メッセージ領域、上部ステータスバー、入力欄のスタイルを調整し、Nemesis チャット画面を日常的に使える作業画面に近づけた"
      ]
    },
    "27": {
      "title": "🛡️ Nemesis デモの前段安全分類器",
      "description": "Nemesis に Workers AI の前段 Guard を追加。Gemini の呼び出し前に、リスクの高い要求、話題外の要求、プロンプト抽出の要求を遮断",
      "items": [
        "Nemesis Guard のサーバー側フローを追加：ログイン、レート制限、長さ制限、ハードルールによる遮断の後、Workers AI で分類してから Gemini へ",
        "Cloudflare Workers AI の小型分類器を接続。安全ラベルのみを出力し、ユーザーの質問には答えず、内部の reason もフロントエンドに公開しない",
        "プロンプト/メモリの抽出、政治的話題、アイデンティティの上書き、違法行為の指南、プライバシー侵害、成人向けコンテンツなどに対する固定の拒否文言を追加",
        "明らかな話題外や高リスクの入力に対し、モジュール最上位の正規表現によるハード遮断を追加。Workers AI と Gemini の呼び出し枠を優先的に節約",
        "Wrangler の AI binding と Cloudflare Env の型を補完。既存のレート制限、ログイン、データベース構造は変更なし"
      ]
    },
    "26": {
      "title": "🤖 Nemesis デモを実際の Gemini に接続",
      "description": "Nemesis の個人向け AI チャットデモのサーバー側呼び出しフローを完成させ、古い硬直コードの模擬会話実装を削除",
      "items": [
        "/api/nemesis の Remix action を追加。Gemini へのすべての呼び出しはサーバー側で行い、フロントエンドは message と直近の会話のみを送信",
        "サーバーで保護された System Prompt と Memory Canon を接続し、API キー、非公開のプロンプト、メモリ文書がブラウザに露出しないように",
        "ログインによるアクセス制御、基本的な入力長制限、プロンプト抽出の遮断、Gemini の 429（クォータ超過）に対するわかりやすい案内を追加",
        "既存の Durable Object レート制限の基盤を再利用し、Nemesis に 1 分あたりと 1 日あたりの回数制限の設定を追加",
        "Gemini API キーを Cloudflare secret / ローカルの .env で管理するように変更し、wrangler と環境変数の設定説明を補完",
        "/chat を実際の AI 対話ページとして書き直し。プリセットの質問、ウェルカムの模擬メッセージ、ローカルの会話ストレージ、ASCII のランダム応答を削除",
        "使われなくなった旧 /api/chat、chatUtils、ChatStorage、ChatAnimations、Conversation 型などの硬直コードを削除"
      ]
    },
    "25": {
      "title": "🔐 Google と Microsoft のログイン設定を強化",
      "description": "Better Auth のソーシャルログイン設定を再構成し、複数ドメインのコールバック、Cloudflare D1 の検証、Wrangler のシークレット同期に対応",
      "items": [
        "Microsoft のサードパーティログインを追加。Google ログインと並べて表示し、Magic Link ログインのフローは維持",
        "Better Auth のサーバー設定を再構築。リクエスト元に応じて localhost と Punycode の正式ドメインに対応し、trustedOrigins を補完",
        "Microsoft OAuth の redirectURI を明示的に設定。Microsoft 側の管理画面で workers.dev のコールバックが必要な制限に対応",
        "Better Auth の安定したキー、デバッグログ、API エラーの捕捉を追加し、OAuth の token exchange とコールバックの問題を特定しやすく",
        "Wrangler でローカルとリモートの Cloudflare D1 の auth テーブル構造を検証し、Google、Microsoft、Better Auth のシークレットを同期",
        "トップページの映像表示エリアを、縦書きの詩句と紙のコラージュ風に再設計。自動スライドショーと GSAP の切り替えアニメーションを追加"
      ]
    },
    "24": {
      "title": "🧹 エラー境界と Cloudflare 規約の整理",
      "description": "エラー境界の仕組みを統合し、過去の重複実装を整理。Remix + Cloudflare Workers の実行規約を最適化",
      "items": [
        "エラー処理をピクセルドラゴン、泳ぐ魚、黒猫の 3 種類の境界に統一。ページごとの重複したエラー UI とテスト用プレビューのルートを削除",
        "古いゲストブックの実装と未使用のテンプレートツールを削除し、現在の動的な貝殻ゲストブックの体験を保持",
        "キャッシュヘッダー、メディアトークン、ゲームプラットフォームの loader の共通ロジックを抽出し、ルート内のサーバー側コードの重複を削減",
        "メディアトークンの署名を Web Crypto に移行し、Node crypto、Buffer、fs/path など Workers と相性の悪い依存を削除",
        "更新履歴のソートで元の配列が変更される問題を修正。トップページとアーカイブページの日付フォーマットのロジックを統一",
        "ローカルと本番の判定を最適化：localhost は非 secure の cookie を維持し、本番の HTTPS では自動的に secure cookie を使用"
      ]
    },
    "23": {
      "title": "🤖 チャットページの全面リファクタリング - モダンな AI 対話体験",
      "description": "チャットページを全面的に再構築。ストリーミングのタイプライター表示、会話管理、Markdown レンダリングなどの中核機能を実装し、Claude/ChatGPT 風のレイアウトを採用",
      "items": [
        "AI の返信をストリーミングのタイプライター表示に対応。一文字ずつ表示され、より自然に",
        "会話履歴の管理を追加。複数セッションの切り替え、新規作成、削除に対応（localStorage に保存）",
        "Markdown レンダリングとコードのシンタックスハイライトを統合（react-markdown + react-syntax-highlighter）",
        "メッセージの編集と AI 返信の再生成に対応",
        "Claude/ChatGPT に似た、折りたたみ可能な左サイドバーのレイアウトを採用",
        "UI を全面的に最適化：グラデーション背景、モダンなメッセージの吹き出し、滑らかなアニメーション",
        "GSAP で操作時のアニメーションを強化：ウェルカムエリア、メッセージの表示、サイドバーのスライド",
        "A/B テストボタンを削除し、操作オプションを簡素化"
      ]
    },
    "22": {
      "title": "🎨 アート風エラーページと更新履歴の ribbon デザイン",
      "description": "エラー境界の仕組みとトップページの更新履歴表示を再構築し、視覚的な体験と操作の滑らかさを向上",
      "items": [
        "3 層のエラー境界を作成：グローバルな 404（ピクセルドラゴン）、ルートレベル（泳ぐ魚）、コンポーネントレベル（黒猫）",
        "トップページの更新履歴を 1 行の ribbon デザインに再構成し、非対称なレイアウトを回避",
        "更新履歴カードを、コンパクトな横長レイアウトに最適化。モバイルでは横スクロールに対応",
        "エラーページのプレビュー用テストルート /test/error-preview を追加し、開発時のデバッグを容易に",
        "魚の Canvas アニメーションを円運動から水平方向の往復運動に変更",
        "エラーページの動物の配色を調整：ドラゴン（金茶）、魚（青）、猫（純黒）"
      ]
    },
    "21": {
      "title": "♻️ 更新履歴のデータ構造を再構築",
      "description": "更新履歴のデータソースを統一し、トップページには最新 4 件を自動表示。保守の手順を簡素化",
      "items": [
        "統一データソースのファイル app/data/updates.ts を作成し、すべてのバージョン履歴を一元管理",
        "/updates ページは統一データソースから読み込むように変更し、ハードコードされたデータを削除",
        "トップページの更新履歴コンポーネントが最新 4 件を自動取得するように再構築し、手動での保守が不要に",
        "トップページに 5 件の更新履歴が表示される問題を修正し、常に 4 件を表示",
        "CLAUDE.md に更新履歴の管理ガイドを追加し、今後の開発フローを規定"
      ]
    },
    "20": {
      "title": "🌀 更新履歴の体験とページ切り替えの再構築",
      "description": "トップページの更新履歴の概要と、完全な更新アーカイブの読みやすい構造を再構築。純白の放射状拡大による制御されたページ切り替えエフェクトを追加",
      "items": [
        "トップページの更新履歴コンポーネントを再設計：最新 4 件を保持し、余計な説明、枠、横スクロールを削除して、モジュールがホームの背景に自然に溶け込むように",
        "更新履歴カードの hover を最適化：浮き上がり効果を取り消し、より控えめな素材感と縁の光の変化に",
        "/updates ページの読みやすさを改善：バージョン目次、クイックジャンプ、現在の段落のハイライト、より明確なバージョン情報の階層を追加",
        "バージョン目次のジャンプを修正：目次項目をブロック全体クリック可能に変更し、scrollIntoView で対応するバージョンへ正確にスクロール",
        "制御されたページ切り替えを追加：「完全な更新履歴を見る」をクリックすると、まずページ先頭へ瞬間移動し、純白の円形 clip-path の拡大を再生。マスクが画面を覆ってからナビゲーション",
        "白い画面の停止時間を短縮：実際のアニメーションの進行度に基づいてフェードアウトのタイミングを計算し、マスクの後に更新ページが自然に現れるように"
      ]
    },
    "19": {
      "title": "🔐 ログイン体験と入場アニメーションの再構築",
      "description": "ログインフローをサイト内のアート風ダイアログに昇格。管理者権限の判定を統一し、ピクセルの人物の入場アニメーションと Google One Tap のクイックログインを追加",
      "items": [
        "ログイン入口を再構築：Header、ゲストブック、モバイルメニューはすべてサイト内のログインダイアログを開き、/auth は直接アクセス時のフォールバックページとして残す",
        "ログインの見た目を刷新：紙の質感のカード、墨色のウォッシュ、テラコッタ色のグロー、長めのイージングを採用し、個人のアートサイトの雰囲気に合わせた",
        "ログイン後の戻り先を統一：Google ログインと Magic Link の両方で安全な returnTo に対応し、ログイン成功後は元の位置に戻って入場アニメーションを再生",
        "管理者ロジックを再設計：管理者専用のログインページを廃止し、ログイン後にサーバーが ADMIN_EMAILS に基づいて管理者権限を自動判定",
        "Google One Tap を接続：未ログインかつ現在のオリジンが一致する場合のみクイックログインを表示し、Magic Link と管理者の入口に影響しないように",
        "ログイン成功時のアニメーションを追加：中央にピクセルの人物が現れ、スキャンライン、ピクセルパーティクル、状態表示を伴って、右上のアイデンティティ領域へ飛んでいく"
      ]
    },
    "18": {
      "title": "🪶 トップページの物語性とインタラクションの書き直し",
      "description": "トップページの Hero の物語レイヤーを書き直し、GSAP による多言語切り替えを導入。音楽の表示エリアとゲストブックの体験をまとめた",
      "items": [
        "GSAP によるトップページの Hero を新規追加：中国語、日本語、English の 3 つの読みレイヤーに対応し、文字のずれを使った入場・退場アニメーションを採用",
        "トップページの案内文を書き直し：通常の開発告知から、個人のアートサイトにふさわしい、開かれた途中の物語へ",
        "Hero のレイアウトを安定化：テキストステージの高さを固定し、言語切り替え時に下のコンテンツが動かないように",
        "トップページの音楽表示エリアの高さを調整：全画面の強制レイアウトを取り除き、音楽コンポーネントを内容に応じて自然に表示",
        "動的な貝殻ゲストブックを接続し、クライアント側の 3D コンポーネントに ClientOnly ラッパーを追加して SSR の描画異常を回避"
      ]
    },
    "16": {
      "title": "🎨 動的 Canvas フッターとインタラクティブなテキスト分解",
      "description": "文字が粒子に分解される動きを備えた、新しい動的 Canvas フッターシステムを導入",
      "items": [
        "動的 Canvas フッターコンポーネントを新規追加：Canvas ベースのリアルタイム文字描画とパーティクルアニメーションを実装",
        "インタラクティブなテキスト分解効果：文字を粒子に分解して再構成でき、没入感のある表現を提供",
        "動画表示レイアウトを最適化：動画コンポーネントの組版とレスポンシブ対応を調整",
        "Vite 開発環境での D1 データベースバインディングの問題を修正し、ローカル開発の体験を改善",
        "ホームページの音楽データをコードリポジトリに内蔵し、外部依存を削減"
      ]
    },
    "15": {
      "title": "🎮 エンタメ体験とターミナルビジュアルの大幅刷新",
      "description": "サイバーターミナルのビジュアルを全面刷新し、新しいトークン対話ミニゲームを追加",
      "items": [
        "Cyber-Terminal インターフェースを再構築：高品質な「クリーム色のすりガラス」デザインを導入し、没入感を大幅に向上",
        "Composer System Warning Banner（作曲家システム警告バナー）を新規追加し、テクノロジー感のある対話の雰囲気を強化",
        "「ウーロンウーロン Token ゲーム」を追加：従来の WeChat QR コードポップアップを削除し、ターミナルコマンドやイースターエッグからトークンを操作できるように",
        "トークン受け取り用 API と D1 データベースのマイグレーションを提供し、トークンデータの永続化を実現",
        "Vite 環境での Cloudflare D1 データベースバインディングを修正・最適化し、cloudflare-env ツールを導入して環境変数をより安全に読み込むように"
      ]
    },
    "14": {
      "title": "⚡ パフォーマンス調整と Cloudflare デプロイ構成の強化",
      "description": "Cloudflare Workers でのコードバンドルサイズと実行環境の互換性を全面的に最適化し、歌詞データを内蔵",
      "items": [
        "音楽プレイヤーの歌詞を内蔵：ホームページの定番曲（Goodbye、Moments など）の LRC 歌詞データを整理して直接内蔵し、外部 API への依存を解消",
        "エッジ実行環境の互換性を修正：共有バンドルパスから Node.js ネイティブの crypto モジュールを削除し、Cloudflare Workers などの Edge 環境でエラーなく動作するように",
        "バンドルサイズを大幅に最適化：Cloudflare P1 バンドル整理機構を適用し、Rollup Visualizer プラグインを削除して最終ビルドファイルを絞り込み、Worker サイズ監査ドキュメントを作成",
        "基盤構成を強化：Cloudflare Build の CSS リソースコンパイルを改善し、.gitignore を最適化、標準の .env.example 開発設定を提供"
      ]
    },
    "13": {
      "title": "♻️ コードリファクタリング",
      "description": "画像読み込みロジックをリファクタリングし、Remix のベストプラクティスに従う",
      "items": [
        "画像読み込みロジックをリファクタリング：Hook 方式から Loader 関数による直接取得へ変更",
        "useImageToken と useVideo のコードを統合し、冗長な部分を削除",
        "Remix 推奨規約に従い、コード構造を最適化",
        "Photo ページの DOM 重複レンダリングによる画像読み込み失敗の問題を修正"
      ]
    },
    "12": {
      "title": "🔧 技術調査",
      "description": "Photo ページのカクつき問題を調査し、最適化案を評価",
      "items": [
        "Photo ページのカクつき問題を調査",
        "画像圧縮案を評価",
        "パフォーマンス最適化計画を策定"
      ]
    },
    "11": {
      "title": "⚡ パフォーマンス向上",
      "description": "Game ページのパフォーマンスを最適化し、Remix 推奨のアーキテクチャパターンを採用",
      "items": [
        "Game ページのパフォーマンスを最適化",
        "Remix 推奨の Outlet パターンを採用",
        "重複したデータリクエストを避け、読み込み速度を向上"
      ]
    },
    "10": {
      "title": "🎨 ビジュアル最適化",
      "description": "思源フォント（Source Han Sans）を導入し、中国語の表示を改善",
      "items": [
        "思源フォントを導入し、中国語の表示を改善",
        "複雑な UI コンポーネントを削除し、ファーストビューの読み込みを最適化",
        "フォント効果を簡素化し、パフォーマンスを向上"
      ]
    },
    "9": {
      "title": "🐛 不具合修正",
      "description": "Term ページの一部のダークモード切り替えボタンが反応しない問題を修正",
      "items": [
        "Term ページのダークモード切り替えボタンが反応しない問題を修正",
        "テーマ切り替えロジックを改善"
      ]
    },
    "8": {
      "title": "⚡ インタラクション最適化",
      "description": "ゲストブックの読み込み戦略を改善し、ファーストビューのパフォーマンスを向上",
      "items": [
        "ゲストブックの読み込み戦略を改善：ファーストビューでの一括読み込みから、展開時のオンデマンド読み込みへ変更",
        "ファーストビューのパフォーマンスをさらに向上",
        "ユーザーインタラクション体験を最適化"
      ]
    },
    "7": {
      "title": "🎨 デザインシステムの再構築",
      "description": "新しいブランドカラー体系を確立し、ビジュアルの一貫性を向上",
      "items": [
        "新しいブランドカラー体系を確立",
        "字間、行間、グリッドシステムを最適化",
        "Game ページと CV ページを改修し、ビジュアルの一貫性を向上",
        "デザイン言語とコンポーネント規約を統一"
      ]
    },
    "6": {
      "title": "🔍 パフォーマンスの深い最適化",
      "description": "Claude Code で全体のパフォーマンスを審査し、コード構造を簡素化",
      "items": [
        "Claude Code による全体のパフォーマンス審査を実施",
        "画像読み込みロジックを簡素化し、一部のリソースを CDN へ移行",
        "不要な Token 暗号化を削除し、コードの複雑さを低減",
        "全体的なパフォーマンスを最適化"
      ]
    },
    "5": {
      "title": "⚡ アーキテクチャ最適化",
      "description": "Supabase への依存を完全に削除し、ローカルデータベース方式に移行",
      "items": [
        "Supabase への依存を完全に削除し、データベース接続の遅延問題を解消",
        "Better Auth + ローカル SQLite に移行",
        "ファーストビューの読み込み速度が大幅に向上",
        "サイト更新履歴（チェンジログ）コンポーネントを新規追加"
      ]
    },
    "4": {
      "title": "🎵 新機能リリース",
      "description": "音楽プレイヤーページを公開し、複数のログイン方式を統合",
      "items": [
        "音楽プレイヤーページ（musicindex.tsx）を公開",
        "網易雲音楽風の歌詞スクロール表示を実装",
        "Google サードパーティログインを追加",
        "Resend API を統合し、Magic Link メールログインを実現",
        "Better Auth のログイン体験を最適化"
      ]
    },
    "3": {
      "title": "🔒 セキュリティ強化",
      "description": "Redis キャッシュシステムを統合し、ゲストブックにアクセスレート制限を追加",
      "items": [
        "Redis キャッシュシステムを統合",
        "ゲストブックにアクセスレート制限機構を追加",
        "システムのセキュリティと安定性を向上"
      ]
    },
    "2": {
      "title": "🔒 セキュリティ強化",
      "description": "Magic Link ログインにレート制限を追加し、悪用を防止",
      "items": [
        "Magic Link ログインのレート制限機構を実装",
        "セキュリティポリシー設定を最適化"
      ]
    },
    "1": {
      "title": "🎨 ビジュアルとパフォーマンスの大幅アップグレード",
      "description": "Gallery ページを再設計し、画像読み込みのパフォーマンスを大幅に改善してユーザー体験を向上",
      "items": [
        "Gallery ページを再設計：優れた写真サイトのベストプラクティスを参考に、従来の Photo ページを置き換え",
        "原画 36 枚（180MB）を WebP 形式に圧縮変換（14MB）し、読み込み速度を大幅に向上",
        "ホームページのアニメーションコンポーネント donghua.tsx を新規追加し、視覚体験を強化"
      ]
    }
  },
  en: {
    "57": {
      "title": "🔵 Circular page transitions and faster navigation",
      "description": "Moving between different pages now opens a circular transition from the center of the screen, site navigation is much faster, and every subpage has a back-to-home button in the top left.",
      "items": [
        "Moving between different pages opens a circle from the center of the screen; navigating within the same module or going back still switches directly",
        "Site links are prefetched once they enter the viewport, and the homepage prefetches each module while idle; prefetching is off in data-saver mode and on 2G networks",
        "The Music, CV, Xiaomai Island, Gallery and Anime pages no longer need server data, so opening them no longer waits on an extra request",
        "Regular navigation no longer refetches site-wide data, saving a round trip of about 330ms each time",
        "Static assets now use a one-year permanent cache, and prefetched styles are not fetched from the origin again on click",
        "Fixed the slow-navigation progress bar being captured in the transition, and the transition being cut off early",
        "Removed the audio popup and loading mask on the Anime page; entering from the site now plays with sound right away (if the browser blocks it, it falls back to muted and shows a sound-on button). Gallery and Xiaomai Island no longer have entry animations",
        "Added a unified \"Back to home\" button in the top left of subpages, including the Music, Gallery and Xiaomai Island pages that previously had no way out"
      ]
    },
    "56": {
      "title": "🧪 Music page becomes a beige scientific plate",
      "description": "The Music page is redrawn as a specimen plate: the family tree groups styles, singers and songs into families, genera and species, and the stratigraphic column stacks each year. The homepage gets faster too.",
      "items": [
        "Plate I family tree: families are styles, genera are singers, species are songs; language and source are marked on the outer ring. Hover to highlight, click to open a specimen card",
        "Plate II stratigraphic column: each year's singers are that layer's index fossils; click a layer to see its fossil card",
        "The first screen shows only the family tree; on desktop the whole tree fits on one screen, and the growth animation plays once on entry",
        "The plate is output as SVG directly from the server; the old starfield, particle and GSAP animation pages are removed",
        "Homepage: no database query on open; the message radio loads messages once it scrolls nearby",
        "Homepage: removed the hero's letter-by-letter animation and the photo network's constant animation loop; the music section is rendered on the server, and the background texture is no longer lazy-loaded"
      ]
    },
    "55": {
      "title": "🛠️ Homepage terminal replaced with a build log",
      "description": "The homepage's fake AI workbench is replaced with this site's real build log: actual conversations, commits and changes.",
      "items": [
        "The user messages in each task are the original words from the conversation with Claude Code at the time; AI replies are excerpts of what it actually said",
        "The commit list, commit heatmap, hourly distribution and Token ledger are generated from git and session records",
        "The right panel shows code diffs, real repo docs, planning views or page screenshots for each task; tabs can be closed, and clicking a file card reopens it",
        "The window no longer uses frosted glass and only updates when needed, instead of re-rendering the whole window at high frequency",
        "Removed older features including supply Tokens, Echo Token and WeChat copy"
      ]
    },
    "54": {
      "title": "⚡ Framework upgrade and asset slimming",
      "description": "Upgraded from Remix v2 to React Router v7; fonts and images now load on demand, and the homepage is much smaller.",
      "items": [
        "Framework upgraded from Remix v2 to React Router v7",
        "Fonts are re-subset by character frequency and the characters actually used on the site; homepage font size drops from 11.6MB to about 0.4MB",
        "The image pipeline generates webp at several widths; the homepage, Gallery, Game, Music, Xiaomai Island and CV pages use srcset to load by screen size",
        "Removed unused large game images from public"
      ]
    },
    "53": {
      "title": "🌐 Chinese, Japanese and English across the whole site",
      "description": "The whole site now supports Chinese, Japanese and English, and automatically opens the version that matches your browser language.",
      "items": [
        "New /ja and /en versions; the header lets you switch languages, and your choice is remembered",
        "Login, error pages, the message board, the Nemesis chat UI and all page content are translated; CV, Game and changelog, among other long-form content, also have Japanese and English versions",
        "Visiting an address without a language prefix redirects by browser language: Chinese stays on the original page, Japanese goes to /ja, and other languages go to /en",
        "Translated pages output hreflang so search engines can recognize each language version",
        "The radio's opening line switches with the language, and the anime card description is translated too"
      ]
    },
    "52": {
      "title": "📜 Changelog card added to the homepage",
      "description": "A new changelog card on the homepage makes the latest updates visible at a glance.",
      "items": [
        "Modeled on Cursor's changelog style, the homepage lists recent versions and their titles",
        "Clicking an entry jumps straight to the matching version on the changelog page"
      ]
    },
    "51": {
      "title": "🧠 Nemesis second tuning round",
      "description": "Models now connect directly, the classifier makes more reliable calls, and replies to provocation and crisis situations sound more human.",
      "items": [
        "Connects directly to each provider's model API. Grok is paused, complex questions now go to DeepSeek, and DeepSeek falls back to Gemini if it fails",
        "The classifier no longer self-reports confidence; when it is unsure it offers an alternative strategy, reducing both false blocks and missed blocks",
        "Four new risk categories: hate and discrimination, sexual content, misinformation and gambling. They are blocked only when generation is requested; discussion and help-seeking are still answered",
        "Provocations are now answered with a sharp, teasing counter instead of copying the example lines",
        "Crisis replies have three tiers: stay and listen when someone is venting, ask directly when they keep bringing it up, and give the 120 and 12356 mental health hotlines when there is a concrete plan",
        "Added answer boundaries for friends' privacy and whereabouts; replies no longer expose backend terms",
        "DeepSeek runs with thinking mode off to avoid empty replies; sticker tags with typos are also recognized",
        "The chat page privacy note is rewritten to match what is actually retained, and a 500 error during server rendering of the chat page is fixed"
      ]
    },
    "50": {
      "title": "📻 Homepage message board becomes a radio",
      "description": "Each message is a radio station: drag the dial or let it auto-scan to tune in, with static between stations.",
      "items": [
        "Each message is assigned an FM frequency when it is created; drag the dial or scan to tune to different messages",
        "Tuning comes with piano notes and a hiss; piano samples load once they enter the viewport",
        "Message limit is now 140 characters, with at most 9 playing at once",
        "The radio pauses its animation and sound when it is out of view; with reduced motion on, no animation plays",
        "Message times are shown in Beijing time"
      ]
    },
    "49": {
      "title": "🎬 Custom player for the homepage video",
      "description": "The Ghost of Yōtei video now uses a clean custom player instead of native browser controls: the frame fills the area with no black bars, and only the picture remains when the mouse leaves.",
      "items": [
        "Center icon and control bar appear only while the mouse moves over the video; they fade out after 3 seconds of stillness or when the pointer leaves, including while paused",
        "Control bar: play/pause, time, white seek bar (draggable), mute, fullscreen, and a settings menu (playback speed, copy link)",
        "Scrolling to the video auto-plays it muted on loop; scrolling out of view pauses it. A manual pause is not auto-resumed; autoplay is off when reduced motion is enabled",
        "Cropped the letterbox bars from the source; inline playback fills the frame, and fullscreen shows the full picture",
        "Cover is now a frame of the blue flower field from the video, not the background oil painting",
        "Removed the oil-painting background and draggable window behind the video; the video sits directly on the page background, which also fixes the horizontal scrollbar it caused",
        "Keyboard support: Space / K to play/pause, M to mute, F for fullscreen, ← → to seek 5 seconds"
      ]
    },
    "48": {
      "title": "🌒 Nemesis chat interface redesign",
      "description": "The chat page now uses a 'shadow dialogue' design: an ink-circle logo with a clay-toned shadow, a three-stage thinking trace, and stop, skip and retry controls.",
      "items": [
        "Replies use a reading layout with the logo on the left and serif body text; user messages are slip-style notes on the right. The model name is signed in small monospace text at the end of each reply",
        "Thinking is now a three-step trace (Understand → Route → Generate) with elapsed time. When the primary model fails and a fallback takes over, the step and label turn ochre",
        "The send button changes with state: stop during generation (the question returns to the input), show the full text while typing, and retry upstream errors in one click",
        "Sidebar sessions are grouped into Today / Earlier, with time and message count. Delete now asks for inline confirmation",
        "Feedback uses category pills plus an optional note, and is marked as submitted after sending. Copy success shows a checkmark",
        "Privacy note moved to a line below the input; the first-visit notice can be expanded for details",
        "Empty state adds four suggested questions; music cards, stickers and video attachments share a new style",
        "On mobile the sidebar is a drawer that closes on backdrop tap. All animations only change transform / opacity and respect the reduced-motion setting"
      ]
    },
    "47": {
      "title": "🧭 Nemesis safety fallback rework",
      "description": "The classifier only decides how to answer, not cold refusals; only hard red lines get a fixed reply.",
      "items": [
        "Guard and routing merged into one Gemini call that outputs the answer strategy and model route",
        "Classifier failures fall back to a normal answer; low-confidence blocks fall back to a careful answer",
        "Help-seeking messages get useful information and support signals; crisis messages lead with care and provide 120 / 110",
        "Added an output-side source leak check: if a reply copies persona material or the system prompt wholesale, the whole message is replaced",
        "Main model and classifier upgraded to gemini-3.5-flash-lite, with a new offline eval of 117 cases"
      ]
    },
    "46": {
      "title": "🔒 Rate limiting, magic links and Nemesis flow hardening",
      "description": "Rate limiter failures no longer let requests through; Nemesis requests can be aborted when the page is left; history replies are signed server-side.",
      "items": [
        "When the rate-limit service fails, Nemesis returns 503 instead of silently allowing the request",
        "Magic Link quota is atomically decremented before sending, removing the concurrency race; raw mail service errors are no longer exposed",
        "Nemesis streaming gets heartbeats and an overall time limit; leaving the chat page aborts the request and cancels the upstream model call",
        "History replies are signed by the server; only correctly signed messages are trusted, blocking forged context",
        "Added a site-wide 404 fallback route; if root data errors, the page shell still renders the error page"
      ]
    },
    "45": {
      "title": "🗂️ Changelog switched to a yearly index",
      "description": "The changelog page groups entries by year, one line per release, with details on click.",
      "items": [
        "Each release is one line: date, version, title and type. Click to expand the description and change items",
        "Added filtering by type and direct links to a specific release",
        "Removed the fade-in, light spots, capsule tags and other extra decoration"
      ]
    },
    "44": {
      "title": "🎮 Game archive and resume page redesign",
      "description": "The game page becomes an editorial 'Player Archive' layout, and the resume page a sidebar profile layout.",
      "items": [
        "Game page: off-white paper tone with serif typography; the header stats gain a switchable 'Cover of the Season', and clicking any game replaces it",
        "Game page: PlayStation trophy cabinet, platform distribution, a perfect-score hall of fame, and the full collection with filter / sort / search",
        "Resume page: a dark sidebar with basic info, skills and personal explorations; the main column shows the career as a timeline",
        "Resume page: slowly drifting color blocks with fine noise in the background; removed emoji icons and invented skill percentages"
      ]
    },
    "43": {
      "title": "🎶 夺心之声 YRC word-by-word highlighting and new tracks",
      "description": "The homepage music player now supports NetEase YRC word-by-word highlighted lyrics, with millisecond-level word alignment and more tracks.",
      "items": [
        "Rebuilt the lyrics data model (LyricLine / LyricWord) with character- and word-level timelines and independent bilingual Chinese/English subtitles",
        "The homepage '夺心之声' player now has 60 FPS word-by-word gradient fill (Karaoke Wipe) and smooth centered scrolling",
        "Click any lyric line or word to seek to that position at millisecond precision (Click-to-Seek)",
        "Fully converted and added YRC per-character data at microsecond precision for six classics, including Nine Point Eight, まっしろな雪, コネクト and Moments",
        "Added four high-quality tracks (エタニクル, Daisy Crown, 远航星的告别, アルカテイル); the playlist now has 10 songs"
      ]
    },
    "42": {
      "title": "🖼️ Homepage image network rebuilt",
      "description": "The homepage photo section is now a curved network layout, with the poem set along the curves and the image assets updated.",
      "items": [
        "Reused the Careers Network visual structure from the demo and adapted it into the site's homepage image-network component",
        "Split the poem in the photo section into several short lines, shown along curved paths with SVG textPath",
        "Unified the component background with the site's main background color; added the nine-grid image layout and mobile position rules",
        "Replaced some homepage images with new OSS assets n10, n11, n12 and n13",
        "Excluded public/demo and build output from the main project's TypeScript check so sample code does not pollute the baseline"
      ]
    },
    "41": {
      "title": "🛡️ Nemesis safety classifier is now fully AI-based",
      "description": "Removed local keyword rules and SAFE_BOUNDARY; the safety layer only decides whether content is allowed.",
      "items": [
        "The safety classifier no longer gets any local keyword or regex rules; only empty-input and length checks remain",
        "SAFE_BOUNDARY and the safe_boundary reply mode are removed; everything that passes goes to intent classification and the main model",
        "The classifier outputs only PASS / CLARIFY / REFUSE; discussion of site content and personas is allowed by default"
      ]
    },
    "40": {
      "title": "🧭 Nemesis dual Gemini classifiers",
      "description": "Every message always goes through safety classification and intent classification, then the main model generates the reply.",
      "items": [
        "Safety classifier: every valid message is classified as JSON by gemini-3.1-flash-lite; strong rules are only a fallback",
        "Intent classifier: Gemini query routing restored, outputting queryType / quote hints",
        "Main generation switched back to the Gateway's native generateContent, so NEMESIS_GEMINI_THINKING_LEVEL=high takes effect",
        "Classifiers still use the compat endpoint (minimal thinking); main-reply and classifier billing are tracked separately"
      ]
    },
    "39": {
      "title": "🌐 Nemesis unified AI Gateway",
      "description": "All outbound model calls now go through the Cloudflare AI Gateway, with a simpler Guard and routing flow.",
      "items": [
        "Gemini, Grok and DeepSeek requests all go through the Gateway for centralized monitoring, quotas and vendor key management",
        "Guard gray-zone classification switched to Gemini structured JSON; the Workers AI small classification model is removed",
        "Removed the Qwen intent router and the Workers AI roast fallback; roast mode triggers by rules only, and DeepSeek takes over if Grok fails",
        "Quote candidates use rule-based tag matching only and no longer depend on the quote hints from the router"
      ]
    },
    "38": {
      "title": "🎵 Nemesis song recommendations in chat",
      "description": "When a chat bubble recommends an Apple Music preview, it now explains why first, then shows the player.",
      "items": [
        "When recommending a song, the model must first state in one sentence why it is playing the track, then output the [media:id] tag",
        "When visit context such as 'come look at the site' is detected, calmer, more restrained tracks in the library are preferred",
        "Library tags aligned with the system prompt appendix, reducing previews that are too fast or stylistically jarring"
      ]
    },
    "37": {
      "title": "🔀 Nemesis model routing fix",
      "description": "Reduces cases where the intent router mistakes ordinary small talk for a special reply mode.",
      "items": [
        "Special reply modes only activate when the message itself matches preset keywords, not from conversation context alone",
        "Follow-up messages such as friend visits or short greetings continue through gemini_lite normal chat by default",
        "Special modes prefer Grok; if unavailable, the server falls back to DeepSeek, instead of the router directly picking a backup small model"
      ]
    },
    "36": {
      "title": "🧠 Nemesis memory and resource routing improvements",
      "description": "Expanded Nemesis's hidden memory, improved page cache forwarding, and direct Worker serving of static assets.",
      "items": [
        "Memory Canon gained memories of the host's life context, helping Nemesis understand conversation background more accurately",
        "Content page loader Cache-Control is now forwarded correctly through route headers, improving caching",
        "The Worker now handles R2 fonts and stickers directly, prioritizing Worker routes before falling back to static assets"
      ]
    },
    "35": {
      "title": "🔐 Magic Link login fix",
      "description": "Fixed Magic Link send failures in production caused by duplicate rate limiting and early quota deduction.",
      "items": [
        "Rate limiting now checks first and deducts afterward; IP, email and cooldown counters are written only after Resend sends successfully, so failed requests don't waste quota",
        "Removed the duplicate IP rate-limit check in the api.auth route layer; sendMagicLink now returns the standard Better Auth error format",
        "During cooldown, the message shows remaining seconds and attempts left, so the login panel countdown displays correctly",
        "Per-IP hourly limit raised from 5 to 10; the Better Auth plugin's built-in rate limit relaxed to 10 per minute"
      ]
    },
    "34": {
      "title": "🎵 Nemesis Apple Music previews",
      "description": "In suitable contexts Nemesis can share Apple Music's 30-second official previews, with a song card and a Listen on Apple Music badge in the chat bubble.",
      "items": [
        "Added a key_eternicus track allowlist (trackId 1844276892); the server resolves [media:id] output from the model into previewUrl and cover metadata",
        "attachments now support the audio type; one reply can include one sticker plus one preview",
        "Added ChatAudioPlayer to the chat page: cover, play/pause and a 30-second progress bar, next to the official Apple Music badge linking to the full version",
        "normal mode system prompt gets a music appendix; new music:sync script refreshes iTunes lookup metadata",
        "recentMessages placeholders, copy, and localStorage validation now support music attachments"
      ]
    },
    "33": {
      "title": "😺 Nemesis chat stickers",
      "description": "Nemesis can attach preset stickers to replies based on conversation context. Sticker assets are hosted on a public R2 bucket and rendered directly in the chat page.",
      "items": [
        "Added a semantic catalog of 33 Nemesis stickers. The model outputs [sticker:id] when appropriate; the server resolves it through an allowlist before mapping it to the public URL.",
        "/api/nemesis now returns attachments. The chat page shows text plus sticker bubbles, displaying images after the typewriter effect finishes.",
        "Added the public Worker route /stickers/*, serving WebP/GIF directly from the gregorwang R2 bucket with long-lived immutable caching.",
        "The normal mode system prompt includes a sticker-meaning appendix. No images are sent for safe_boundary replies or Guard short-circuit replies.",
        "Added attachment support for recentMessages placeholders, copy, feedback auditing and localStorage sessions.",
        "Added stickers:prepare / stickers:upload scripts to simplify future maintenance of R2 sticker assets (the asset files themselves are not in the repo)."
      ]
    },
    "32": {
      "title": "🎛️ Unified site motion, fonts and footer reveal",
      "description": "Consolidated recent site-wide visual commits. Buttons, cards, the music page, the font system, the changelog page and the footer now share one interaction style.",
      "items": [
        "Based on recent style-unification commits, added consistent motion for primary buttons, back-to-home buttons, nav hover, the guestbook entry and some cards.",
        "Narrowed GSAP and Framer Motion usage. Key music page animations are kept, while pressure from scroll listeners, hover triggers and animation rebuilds is reduced.",
        "Completed a font system audit. Runtime font variables, display headings, body text, captions, quotes and labels now use unified semantic classes.",
        "Rebuilt the changelog page structure. Removed the global site nav and footer, and added a back-to-home button and a hover-expanding version directory.",
        "Added consistent back links, font hierarchy and in-page copy rules for the games, changelog, CV, gallery, terms and Xiao pages.",
        "Added a curtain-style Footer Reveal to the homepage footer. The content layer scrolls to reveal the bottom Canvas footer while keeping the original footer colors.",
        "Removed admin/permission wording from the login page and cyber terminal that no longer fits the site's architecture."
      ]
    },
    "31": {
      "title": "🧩 Nemesis audit pipeline and site copy update",
      "description": "Summarized recent commits covering Nemesis multi-model routing, feedback auditing, guestbook moderation and homepage QA copy.",
      "items": [
        "Added query routing and multi-model dispatch to Nemesis. Tasks are routed across model providers, with fallback to an available path when a model is unavailable.",
        "Added audit fields for generation boundaries and model calls, recording routing, model, classification and safety-boundary information for debugging odd replies.",
        "Added a Nemesis feedback audit flow. Frontend feedback, the API entry and backend event logging now form a loop for ongoing tuning of filtering and reply quality.",
        "Fixed a bug where the safety path could drift on regenerate. Regenerate now keeps the correct safety decision and context chain.",
        "Reorganized the guestbook admin UI. Improved review status, admin actions and homepage display entry points for easier daily maintenance.",
        "Updated the homepage QA copy to explain the site's positioning, long-term maintenance approach, update cadence and how to send feedback."
      ]
    },
    "30": {
      "title": "🔐 Fixed mobile OAuth callback origin",
      "description": "Fixed cases where redirect_uri and state validation failed in mobile and iPad social login because of inconsistent entry domains.",
      "items": [
        "The Better Auth client now uses the canonical APP_URL as baseURL instead of the current window.location.origin, so mobile no longer generates a different authorization entry.",
        "In production, the server-side OAuth baseURL is pinned to BETTER_AUTH_URL / APP_URL. The request origin no longer determines the Google and Microsoft callback URLs.",
        "The current request origin is still added to trustedOrigins, keeping callback validation working for Cloudflare, workers.dev, Punycode and non-canonical entry points.",
        "Added redacted AuthDebug logs recording origin, host, referer, redirect_uri and state cookie status at auth start and callback, for comparing desktop and mobile flows.",
        "Sensitive values such as code, state, token and secret remain hidden. Only the safe fields needed to debug OAuth origin and cookie issues are output."
      ]
    },
    "29": {
      "title": "🧠 Nemesis context-aware guard and chat privacy notice",
      "description": "Improved context judgment in the Nemesis Guard, and added waiting states and a local privacy notice to the chat page.",
      "items": [
        "The Workers AI pre-classifier now considers the recent conversation window, so pronoun follow-ups and user corrections on the same topic are no longer misjudged as off-topic.",
        "Hard-rule blocking order is unchanged. Context judgment only applies to overridable off-topic/unknown categories, leaving Nemesis's main reply logic untouched.",
        "Split the chat page waiting state into permission check, quota lookup, scope check and awaiting response, making long request steps clearer.",
        "Added a 'Privacy notice' entry in the top-right corner, explaining that chat logs are not written to the site database and are not visible to the site owner's backend.",
        "A lightweight privacy card appears on first visit to the chat page. After confirmation, the state is remembered in localStorage without affecting typing or sending."
      ]
    },
    "28": {
      "title": "🧭 Nemesis block notices and chat UI cleanup",
      "description": "Changed Nemesis block responses to tiered local hints on the frontend, and fixed the chat input and session sidebar behavior.",
      "items": [
        "When the backend Nemesis Guard blocks a message, it only returns a blocked status. It no longer sends category-specific refusal text and no longer calls Gemini.",
        "The frontend records the local blocked count in localStorage and shows fixed escalating hints for the 1st, 2nd, and 3rd-and-later blocks.",
        "Fixed chat input keyboard handling: only Enter sends, Shift + Enter inserts a newline, preventing accidental sends from ordinary key presses.",
        "Rebuilt /chat as a stable left-right layout and restored the local session sidebar, supporting creating, switching and deleting local conversations.",
        "Tightened the message area, top status bar and input styles to make the Nemesis chat feel more like an everyday workspace."
      ]
    },
    "27": {
      "title": "🛡️ Nemesis demo pre-Gemini safety classifier",
      "description": "Added a Workers AI pre-guard for Nemesis that blocks high-risk, off-topic and prompt-extraction requests before calling Gemini.",
      "items": [
        "Added the server-side Nemesis Guard flow: login, rate limiting, length limits and hard-rule blocking, with Workers AI classification before anything reaches Gemini.",
        "Connected a Cloudflare Workers AI small-model classifier. It only outputs safety labels, does not answer the user, and does not expose the internal reason to the frontend.",
        "Added fixed refusal replies for prompt/memory extraction, political topics, identity override, illegal-activity guidance, privacy abuse and adult content.",
        "Added top-level regex hard blocks for obvious off-topic and high-risk input, to save Workers AI and Gemini quota.",
        "Completed the Wrangler AI binding and Cloudflare Env types. Existing rate limiting, login and database structure are unchanged."
      ]
    },
    "26": {
      "title": "🤖 Nemesis demo connected to real Gemini",
      "description": "Completed the server-side call flow for the Nemesis personal AI chat demo and removed the old hard-coded fake conversation implementation.",
      "items": [
        "Added the /api/nemesis Remix action. All Gemini calls happen on the server; the frontend only sends the message and recent conversation.",
        "Connected the server-protected System Prompt and Memory Canon, so API keys, hidden prompts and memory documents are not exposed to the browser.",
        "Added login-based access control, basic input length limits, prompt extraction blocking, and a friendly message for Gemini 429 quota exhaustion.",
        "Reused the existing Durable Object rate-limit infrastructure to add per-minute and per-day limits for Nemesis.",
        "Moved the Gemini API key to Cloudflare secrets / local .env, and added wrangler and environment variable setup notes.",
        "Rewrote /chat as a real AI conversation page. Removed preset questions, fake welcome messages, local conversation storage and ASCII random replies.",
        "Removed no-longer-used hard-coded chat code: old /api/chat, chatUtils, ChatStorage, ChatAnimations and Conversation types."
      ]
    },
    "25": {
      "title": "🔐 Hardened Google and Microsoft login config",
      "description": "Restructured the Better Auth social login config to support multiple callback domains, Cloudflare D1 verification and Wrangler secret sync.",
      "items": [
        "Added a Microsoft third-party login option alongside Google. The Magic Link login flow is kept.",
        "Rebuilt the Better Auth server config to support localhost and the Punycode production domain based on request origin, with trustedOrigins filled in.",
        "Explicitly configured the Microsoft OAuth redirectURI to work around Microsoft console restrictions on workers.dev callbacks.",
        "Added stable Better Auth keys, debug logs and API error capture to help diagnose OAuth token exchange and callback issues.",
        "Verified local and remote Cloudflare D1 auth table structure with Wrangler, and synced the Google, Microsoft and Better Auth secrets.",
        "Redesigned the homepage imagery section as vertical poetry lines with a paper-collage style, adding auto-rotation and GSAP transition animations."
      ]
    },
    "24": {
      "title": "🧹 Error boundary and Cloudflare conventions cleanup",
      "description": "Consolidated the error boundary system, removed historical duplicate implementations, and tightened the Remix + Cloudflare Workers runtime conventions.",
      "items": [
        "Unified error handling into three boundaries: pixel dragon, swimming fish and black cat. Removed per-page duplicate error UI and the test preview route.",
        "Removed the old guestbook implementation and unused template tooling, keeping the current dynamic shell guestbook.",
        "Extracted shared logic for cache headers, media tokens and the game platform loader, reducing duplicated server code in routes.",
        "Moved media token signing to Web Crypto, removing Workers-incompatible dependencies such as Node crypto, Buffer and fs/path.",
        "Fixed changelog sorting mutating the source array, and unified date formatting between the homepage and archive page.",
        "Refined local vs. production detection: localhost keeps non-secure cookies, while production HTTPS automatically uses secure cookies."
      ]
    },
    "23": {
      "title": "🤖 Full chat page rewrite: modern AI conversation experience",
      "description": "Rebuilt the chat page with streaming typewriter output, conversation management and Markdown rendering, using a Claude/ChatGPT-style layout.",
      "items": [
        "AI replies now stream with a typewriter effect, displaying character by character for a more natural feel.",
        "Added conversation history management: switch, create and delete multiple sessions (persisted in localStorage).",
        "Integrated Markdown rendering and code syntax highlighting (react-markdown + react-syntax-highlighter).",
        "Added message editing and regeneration of AI replies.",
        "Adopted a collapsible left sidebar layout, similar to Claude/ChatGPT.",
        "Overall UI refresh: gradient background, modern message bubbles and smooth animations.",
        "Enhanced interactions with GSAP: welcome area, message entry and sidebar slide.",
        "Removed the A/B test button and simplified action options."
      ]
    },
    "22": {
      "title": "🎨 Artistic error pages and changelog ribbon design",
      "description": "Rebuilt the error boundary system and the homepage changelog display to improve visual experience and interaction smoothness.",
      "items": [
        "Created a three-layer error boundary system: global 404 (pixel dragon), route level (swimming fish) and component level (black cat).",
        "Reworked the homepage changelog into a single-line ribbon to avoid an asymmetric layout.",
        "Compacted the changelog card into a horizontal layout, with horizontal scrolling on mobile.",
        "Added the error page preview test route /test/error-preview for development debugging.",
        "Changed the fish Canvas animation from circular motion to horizontal back-and-forth swimming.",
        "Adjusted animal colors on error pages: dragon (golden brown), fish (blue), cat (pure black)."
      ]
    },
    "21": {
      "title": "♻️ Changelog data architecture refactor",
      "description": "Unified the changelog data source and made the homepage automatically show the latest 4 entries, simplifying maintenance.",
      "items": [
        "Created the unified data source file app/data/updates.ts to manage all version history in one place.",
        "The /updates page now reads from the unified data source, with hard-coded data removed.",
        "The homepage changelog component now automatically picks the latest 4 entries, with no manual upkeep.",
        "Fixed the homepage showing 5 changelog entries; it now always shows 4.",
        "Added a changelog management guide to CLAUDE.md to standardize the future development workflow."
      ]
    },
    "20": {
      "title": "🌀 Changelog experience and page transition refactor",
      "description": "Restructured the homepage changelog summary and the reading layout of the full archive, and added a controlled page transition with a pure white radial expansion.",
      "items": [
        "Redesigned the homepage changelog: keeps the latest four entries, removes extra text, borders and horizontal scrolling so the module blends into the homepage background.",
        "Adjusted changelog card hover: removed the lift effect in favor of a more restrained material and edge-light change.",
        "Improved the /updates reading experience: added a version directory, quick jumps, current-section highlighting and a clearer version info hierarchy.",
        "Fixed version directory jumps: entries are now fully clickable, and scrollIntoView scrolls precisely to the target version.",
        "Added a controlled page transition: clicking to view the full changelog first jumps to the top of the page, then plays a pure white circular clip-path expansion, and navigates once the mask covers the screen.",
        "Reduced the white-screen pause: fade-out timing is calculated from real animation progress so the updates page appears naturally after the mask."
      ]
    },
    "19": {
      "title": "🔐 Login experience and entry animation rework",
      "description": "Upgraded the login flow to an in-site artistic dialog, unified admin permission detection, and added a pixel-figure entry animation and a Google One Tap quick-login entry.",
      "items": [
        "Reworked login entry points: the Header, guestbook and mobile menu all open the in-site login dialog. /auth remains as a fallback page for direct access.",
        "Upgraded the login visuals with a paper-textured card, ink-wash layers, terracotta glow and long easing, matching the personal art site's mood.",
        "Unified post-login return: Google login and Magic Link both support a safe returnTo, and the entry animation plays back at the original position after login.",
        "Reworked admin logic: no separate admin login page. After login, the server automatically detects admin permissions based on ADMIN_EMAILS.",
        "Connected Google One Tap: it is only attempted for signed-out users on a matching origin, so Magic Link and the admin entry are unaffected.",
        "Added a login success animation: a pixel figure appears at the center with scanlines, pixel particles and a status message, then flies to the identity area in the top right."
      ]
    },
    "18": {
      "title": "🪶 Homepage narrative and interaction rewrite",
      "description": "Rewrote the homepage Hero narrative layer, introduced GSAP-driven multilingual switching, and consolidated the music showcase and guestbook experience.",
      "items": [
        "Added a GSAP-driven homepage Hero with three reading layers (Chinese, Japanese and English), using character-offset entry and exit animations.",
        "Rewrote the homepage intro copy: from a standard development announcement to an open-ended narrative better suited to a personal art site.",
        "Improved Hero layout stability: the text stage has a fixed height so language switching doesn't shift the content below.",
        "Reduced the homepage music showcase height: removed the forced full-screen layout so the music component displays naturally with its content.",
        "Connected the dynamic shell guestbook, and wrapped the client-side 3D component in ClientOnly to avoid SSR rendering issues."
      ]
    },
    "16": {
      "title": "🎨 Dynamic Canvas footer and interactive text breakdown",
      "description": "Adds a new dynamic Canvas footer system with a particle-based text breakdown animation",
      "items": [
        "Added a dynamic Canvas footer component: real-time Canvas text rendering and a particle animation system",
        "Interactive text breakdown: text can split into particles and reassemble, for an immersive visual effect",
        "Optimized the video showcase layout: adjusted video component spacing and responsive design",
        "Fixed the D1 database binding issue in the Vite dev environment to improve local development",
        "Bundled homepage music data into the code repository to reduce external dependencies"
      ]
    },
    "15": {
      "title": "🎮 Major upgrade to entertainment features and terminal visuals",
      "description": "Overhauls the cyber terminal visuals and adds a new Token mini-game",
      "items": [
        "Rebuilt the Cyber-Terminal interface with a high-quality 'cream frosted glass' design for a stronger immersive feel",
        "Added a Composer System Warning Banner to enhance the tech-style interaction atmosphere",
        "Added the 'Wulong Wulong Token Game': removed the traditional WeChat QR code popup; Token interaction now happens via terminal commands or easter eggs",
        "Added a Token claim API and D1 database migration to persist Token data",
        "Fixed and improved the Cloudflare D1 database binding in the Vite environment, and added the cloudflare-env utility for safer environment variable access"
      ]
    },
    "14": {
      "title": "⚡ Performance tuning and Cloudflare deployment hardening",
      "description": "Optimizes code bundle size and runtime compatibility for Cloudflare Workers, and bundles lyrics data",
      "items": [
        "Bundled music player lyrics: organized and embedded LRC lyric data for several classic homepage songs (such as Goodbye and Moments), removing the external API dependency",
        "Fixed edge runtime compatibility: removed the Node.js native crypto module from the shared bundle path so it runs without errors on Edge environments such as Cloudflare Workers",
        "Deep bundle size optimization: applied Cloudflare P1 bundle cleanup, removed the Rollup Visualizer plugin, trimmed the final build output, and wrote a Worker size audit document",
        "Hardened the base configuration: improved CSS resource compilation for Cloudflare Build, optimized .gitignore, and provided a standard .env.example development config"
      ]
    },
    "13": {
      "title": "♻️ Code refactoring",
      "description": "Refactored image loading logic to follow Remix best practices",
      "items": [
        "Refactored image loading logic: switched from a Hook-based approach to fetching directly in the Loader function",
        "Consolidated useImageToken and useVideo code and removed redundancy",
        "Followed Remix recommended conventions and optimized code structure",
        "Fixed image loading failures caused by duplicate DOM rendering on the Photo page"
      ]
    },
    "12": {
      "title": "🔧 Technical research",
      "description": "Investigated jank on the Photo page and evaluated optimization options",
      "items": [
        "Investigated jank on the Photo page",
        "Evaluated image compression options",
        "Drafted a performance optimization plan"
      ]
    },
    "11": {
      "title": "⚡ Performance improvements",
      "description": "Optimized Game page performance and adopted Remix's recommended architecture pattern",
      "items": [
        "Optimized Game page performance",
        "Adopted Remix's recommended Outlet pattern",
        "Avoided duplicate data requests to improve loading speed"
      ]
    },
    "10": {
      "title": "🎨 Visual optimization",
      "description": "Introduced the Source Han Sans font to improve Chinese text rendering",
      "items": [
        "Introduced the Source Han Sans font to improve Chinese text rendering",
        "Removed complex UI components to optimize first-screen loading",
        "Simplified font effects to improve performance"
      ]
    },
    "9": {
      "title": "🐛 Bug fixes",
      "description": "Fixed an issue where some dark mode toggle buttons on the Term page did not respond",
      "items": [
        "Fixed the unresponsive dark mode toggle button on the Term page",
        "Improved theme switching logic"
      ]
    },
    "8": {
      "title": "⚡ Interaction optimization",
      "description": "Improved the guestbook loading strategy to boost first-screen performance",
      "items": [
        "Improved the guestbook loading strategy: changed from loading everything on first screen to loading on demand when expanded",
        "Further improved first-screen performance",
        "Optimized user interaction experience"
      ]
    },
    "7": {
      "title": "🎨 Design system overhaul",
      "description": "Established a new brand color system and improved visual consistency",
      "items": [
        "Established a new brand color system",
        "Optimized letter spacing, line spacing, and the grid system",
        "Reworked the Game and CV pages to improve visual consistency",
        "Unified design language and component standards"
      ]
    },
    "6": {
      "title": "🔍 Deep performance optimization",
      "description": "Ran a full performance review with Claude Code and simplified the code structure",
      "items": [
        "Ran a full performance review with Claude Code",
        "Simplified image loading logic and moved some resources to the CDN",
        "Removed unnecessary Token encryption to reduce code complexity",
        "Optimized overall performance"
      ]
    },
    "5": {
      "title": "⚡ Architecture optimization",
      "description": "Completely removed the Supabase dependency and migrated to a local database setup",
      "items": [
        "Completely removed the Supabase dependency, resolving database connection latency issues",
        "Migrated to Better Auth + local SQLite",
        "Significantly improved first-screen load speed",
        "Added a site changelog component"
      ]
    },
    "4": {
      "title": "🎵 New features launched",
      "description": "Launched the music player page and integrated multiple login methods",
      "items": [
        "Launched the music player page (musicindex.tsx)",
        "Implemented scrolling lyrics display in the style of NetEase Cloud Music",
        "Added Google third-party login",
        "Integrated the Resend API for Magic Link email login",
        "Optimized the Better Auth login experience"
      ]
    },
    "3": {
      "title": "🔒 Security enhancements",
      "description": "Integrated a Redis cache system and added access rate limiting to the guestbook",
      "items": [
        "Integrated a Redis cache system",
        "Added an access rate limiting mechanism to the guestbook",
        "Improved system security and stability"
      ]
    },
    "2": {
      "title": "🔒 Security enhancements",
      "description": "Added rate limiting to Magic Link login to prevent abuse",
      "items": [
        "Implemented a rate limiting mechanism for Magic Link login",
        "Optimized security policy configuration"
      ]
    },
    "1": {
      "title": "🎨 Major visual and performance upgrade",
      "description": "Redesigned the Gallery page and significantly improved image loading performance for a better user experience",
      "items": [
        "Redesigned the Gallery page based on best practices from leading photography sites, replacing the original Photo page",
        "Compressed and converted 36 original images (180MB) to WebP format (14MB), greatly speeding up loading",
        "Added the donghua.tsx homepage animation component to enhance the visual experience"
      ]
    }
  },
};
