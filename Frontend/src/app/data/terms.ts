export interface Term {
  id: string;
  word: string;
  kana: string;
  shortDesc: string;
  longDesc: string;
  category: "Frontend" | "Backend" | "Infra" | "AI/Data" | "General";
  level: number; // 1: Beginner, 2: Intermediate, 3: Advanced
  relatedTerms: string[];
  externalUrl?: string;
}

export const IT_TERMS: Term[] = [
  {
    id: "1",
    word: "React",
    kana: "リアクト",
    shortDesc: "UIを構築するためのJavaScriptライブラリ。",
    longDesc: "Meta（旧Facebook）によって開発された、コンポーネントベースでUIを効率的に構築するためのライブラリ。宣言的なView設計と仮想DOMによる高速なレンダリングが特徴です。",
    category: "Frontend",
    level: 1,
    relatedTerms: ["Next.js", "JavaScript", "JSX", "仮想DOM"],
    externalUrl: "https://ja.react.dev/"
  },
  {
    id: "2",
    word: "Docker",
    kana: "ドッカー",
    shortDesc: "コンテナ仮想化技術を用いてアプリを実行するプラットフォーム。",
    longDesc: "アプリケーションとその依存関係を「コンテナ」としてパッケージ化し、どの環境でも同じように動作させるための技術。軽量で起動が速いのが特徴で���。",
    category: "Infra",
    level: 2,
    relatedTerms: ["Kubernetes", "コンテナ", "仮想化"],
    externalUrl: "https://www.docker.com/"
  },
  {
    id: "3",
    word: "API",
    kana: "エーピーアイ",
    shortDesc: "ソフトやプログラムの間をつなぐインターフェース。",
    longDesc: "Application Programming Interfaceの略。異なるソフトウェアコンポーネント間で情報をやり取りするための規約や窓口のこと。Web APIなどが一般的です。",
    category: "General",
    level: 1,
    relatedTerms: ["REST", "JSON", "HTTP"],
    externalUrl: "https://developer.mozilla.org/ja/docs/Learn/JavaScript/Client-side_web_APIs/Introduction"
  },
  {
    id: "4",
    word: "Kubernetes",
    kana: "クバネティス",
    shortDesc: "コンテナの運用を自動化するプラットフォーム（K8s）。",
    longDesc: "多数のコンテナを効率的に管理・運用するためのオーケストレーションツール。自動スケーリングや自己修復機能などを提供します。",
    category: "Infra",
    level: 3,
    relatedTerms: ["Docker", "マイクロサービス", "オーケストレーション"],
    externalUrl: "https://kubernetes.io/ja/"
  },
  {
    id: "5",
    word: "LLM",
    kana: "エルエルエム",
    shortDesc: "大規模言語モデル。膨大なテキストで学習したAI。",
    longDesc: "Large Language Modelの略。ChatGPTなどに使われる、膨大な量のテキストデータを学習し、人間のような自然な文章を生成できるAIモデルのこと。",
    category: "AI/Data",
    level: 2,
    relatedTerms: ["AI", "機械学習", "Transformer", "GPT"],
    externalUrl: "https://ja.wikipedia.org/wiki/大規模言語モデル"
  },
  {
    id: "6",
    word: "TypeScript",
    kana: "タイプスクリプト",
    shortDesc: "型定義ができるJavaScriptの拡張版言語。",
    longDesc: "JavaScriptに静的型付けを追加した言語。開発時のミスを減らし、大規模開発をより安全かつ効率的に行えるように設計されています。",
    category: "Frontend",
    level: 1,
    relatedTerms: ["JavaScript", "型定義", "コンパイル"],
    externalUrl: "https://www.typescriptlang.org/"
  },
  {
    id: "7",
    word: "NoSQL",
    kana: "ノーエスキューエル",
    shortDesc: "リレーショナル型以外のデータベースの総称。",
    longDesc: "Not only SQLの略。MongoDBやRedisのように、表形式（RDB）ではない柔軟なデータ構造を持つデータベースの総称。大量データや高速な読み書きに適しています。",
    category: "Backend",
    level: 2,
    relatedTerms: ["MongoDB", "Redis", "RDB", "データベース"],
    externalUrl: "https://ja.wikipedia.org/wiki/NoSQL"
  },
  {
    id: "8",
    word: "CI/CD",
    kana: "シーアイシーディー",
    shortDesc: "アプリのビルド、テスト、配布を自動化する手法。",
    longDesc: "Continuous Integration（継続的インテグレーション）とContinuous Delivery（継続的デリバリー）の略。開発からリリースまでのサイクルを高速化・自動化する仕組み。",
    category: "General",
    level: 2,
    relatedTerms: ["GitHub Actions", "自動化", "パイプライン"],
    externalUrl: "https://www.redhat.com/ja/topics/devops/what-is-ci-cd"
  },
  {
    id: "9",
    word: "AWS",
    kana: "エーダブリューエス",
    shortDesc: "Amazonが提供するクラウドコンピューティングサービス。",
    longDesc: "Amazon Web Servicesの略。サーバー、ストレージ、データベースなどのITインフラを、インターネット経由で従量課金制で利用できる世界最大のクラウドサービス。",
    category: "Infra",
    level: 1,
    relatedTerms: ["クラウド", "EC2", "S3", "Azure", "GCP"],
    externalUrl: "https://aws.amazon.com/jp/"
  },
  {
    id: "10",
    word: "GitHub",
    kana: "ギットハブ",
    shortDesc: "コード管理・共有のためのプラットフォーム。",
    longDesc: "Gitという仕組みを使って、プログラムのソースコードを保存したり、チームで共同開発したりするための世界最大のWebサービス。",
    category: "General",
    level: 1,
    relatedTerms: ["Git", "プルリクエスト", "CI/CD"],
    externalUrl: "https://github.com/"
  },
  {
    id: "15",
    word: "Vue",
    kana: "ビュー",
    shortDesc: "シンプルで扱いやすいJavaScriptフロントエンドフレームワーク。",
    longDesc: "Evan Youが開発したプログレッシブなJavaScriptフレームワーク。コンポーネント指向で学習コストが低く、ReactやAngularと並んで広く使われています。",
    category: "Frontend",
    level: 1,
    relatedTerms: ["React", "Angular", "Nuxt.js"],
    externalUrl: "https://ja.vuejs.org/"
  },
  {
    id: "16",
    word: "GraphQL",
    kana: "グラフキューエル",
    shortDesc: "クライアントが必要なデータだけ取得できるAPIクエリ言語。",
    longDesc: "Facebookが開発したAPIのクエリ言語。RESTと違い、クライアントが必要なフィールドだけを指定して取得できるため、過剰取得や不足取得の問題を解消できます。",
    category: "Backend",
    level: 2,
    relatedTerms: ["REST", "API", "Apollo"],
    externalUrl: "https://graphql.org/"
  },
  {
    id: "17",
    word: "REST",
    kana: "レスト",
    shortDesc: "HTTPを使ったWebサービス設計のアーキテクチャスタイル。",
    longDesc: "REpresentational State Transferの略。HTTPメソッド（GET/POST/PUT/DELETE）を使いリソース指向でAPIを設計するスタイル。現在最も広く普及しているWebAPI設計思想です。",
    category: "Backend",
    level: 1,
    relatedTerms: ["API", "GraphQL", "HTTP", "JSON"],
    externalUrl: "https://ja.wikipedia.org/wiki/REST"
  },
  {
    id: "18",
    word: "Node.js",
    kana: "ノードジェーエス",
    shortDesc: "JavaScriptをサーバーサイドで動かす実行環境。",
    longDesc: "GoogleのV8エンジンを搭載し、JavaScriptをブラウザの外（サーバーサイド）で実行できる環境。非同期I/Oにより高いスループットを実現します。",
    category: "Backend",
    level: 1,
    relatedTerms: ["JavaScript", "npm", "Express"],
    externalUrl: "https://nodejs.org/ja"
  },
  {
    id: "19",
    word: "Python",
    kana: "パイソン",
    shortDesc: "シンプルな文法が特徴の汎用プログラミング言語。",
    longDesc: "読みやすいシンプルな文法と豊富なライブラリが特徴。AI・機械学習・データ分析だけでなく、WebバックエンドやCI/CDの自動化スクリプト作成にも広く使われます。",
    category: "Backend",
    level: 1,
    relatedTerms: ["FastAPI", "PyTorch", "scikit-learn"],
    externalUrl: "https://www.python.org/"
  },
  {
    id: "20",
    word: "FastAPI",
    kana: "ファストエーピーアイ",
    shortDesc: "Python製の高速・型安全なWebフレームワーク。",
    longDesc: "PythonでRESTful APIを構築するためのフレームワーク。型ヒントをベースに自動ドキュメント生成（Swagger UI）も提供し、高いパフォーマンスと開発効率を両立します。",
    category: "Backend",
    level: 2,
    relatedTerms: ["Python", "REST", "API"],
    externalUrl: "https://fastapi.tiangolo.com/ja/"
  },
  {
    id: "21",
    word: "Zustand",
    kana: "ズスタント",
    shortDesc: "Reactのシンプルで軽量なグローバル状態管理ライブラリ。",
    longDesc: "Reduxの複雑さを解消するために作られた、最小限のAPIでグローバル状態を管理するReactライブラリ。ボイラープレートが少なく、小中規模プロジェクトで人気があります。",
    category: "Frontend",
    level: 2,
    relatedTerms: ["React", "Redux", "ContextAPI"],
    externalUrl: "https://zustand-demo.pmnd.rs/"
  },
  {
    id: "22",
    word: "React Query",
    kana: "リアクトクエリ",
    shortDesc: "Reactの非同期データ取得・キャッシュ管理ライブラリ。",
    longDesc: "サーバーから取得するデータのフェッチ・キャッシュ・同期・更新をシンプルに管理するReactライブラリ（現在はTanStack Queryと呼ばれます）。",
    category: "Frontend",
    level: 2,
    relatedTerms: ["React", "SWR", "API"],
    externalUrl: "https://tanstack.com/query/latest"
  },
  {
    id: "23",
    word: "SWR",
    kana: "エスダブリューアール",
    shortDesc: "キャッシュファーストのReact向けデータフェッチフック。",
    longDesc: "Vercelが開発した、stale-while-revalidate戦略でデータを取得するReactフック。古いデータをまず返しつつバックグラウンドで最新化するため、UXが向上します。",
    category: "Frontend",
    level: 2,
    relatedTerms: ["React", "React Query", "API"],
    externalUrl: "https://swr.vercel.app/ja"
  },
  {
    id: "24",
    word: "MongoDB",
    kana: "モンゴディービー",
    shortDesc: "JSONライクなドキュメント形式のNoSQLデータベース。",
    longDesc: "ドキュメント指向のNoSQLデータベース。スキーマレスで柔軟なデータ構造を持ち、スケールアウトが容易なため、スタートアップや大量データを扱うサービスで多く使われます。",
    category: "Backend",
    level: 2,
    relatedTerms: ["NoSQL", "Redis", "データベース"],
    externalUrl: "https://www.mongodb.com/ja-jp"
  },
  {
    id: "25",
    word: "Redis",
    kana: "レディス",
    shortDesc: "高速なインメモリキーバリューストア型データベース。",
    longDesc: "データをメモリ上に保持することで超高速な読み書きを実現するNoSQLデータベース。キャッシュ・セッション管理・リアルタイム分析などに広く活用されています。",
    category: "Backend",
    level: 2,
    relatedTerms: ["NoSQL", "MongoDB", "キャッシュ"],
    externalUrl: "https://redis.io/"
  },
  {
    id: "26",
    word: "GitHub Actions",
    kana: "ギットハブアクションズ",
    shortDesc: "GitHubに組み込まれたCI/CD自動化ワークフローサービス。",
    longDesc: "GitHubリポジトリへのプッシュやPRをトリガーに、テスト・ビルド・デプロイなどを自動実行できるCI/CDサービス。YAMLファイルでワークフローを定義します。",
    category: "General",
    level: 2,
    relatedTerms: ["GitHub", "CI/CD", "自動化"],
    externalUrl: "https://github.com/features/actions"
  },
  {
    id: "27",
    word: "Jest",
    kana: "ジェスト",
    shortDesc: "JavaScriptの定番ユニットテストフレームワーク。",
    longDesc: "Meta製のJavaScript/TypeScriptユニットテストフレームワーク。ゼロ設定で使え、スナップショットテストやモック機能が充実しています。",
    category: "General",
    level: 2,
    relatedTerms: ["Vitest", "テスト", "CI/CD"],
    externalUrl: "https://jestjs.io/ja/"
  },
  {
    id: "28",
    word: "Vitest",
    kana: "ビテスト",
    shortDesc: "Viteネイティブの高速ユニットテストフレームワーク。",
    longDesc: "ViteのエコシステムをそのままテストにもたらすJest互換のテストランナー。HMRを活かした高速なウォッチモードと、TypeScript/ESMのネイティブサポートが特徴です。",
    category: "General",
    level: 2,
    relatedTerms: ["Jest", "Vite", "テスト"],
    externalUrl: "https://vitest.dev/"
  },
  {
    id: "29",
    word: "Playwright",
    kana: "プレイライト",
    shortDesc: "ブラウザを自動操作するE2Eテストフレームワーク。",
    longDesc: "Microsoftが開発したE2Eテスト自動化ツール。ChromeやFirefox、SafariなどのブラウザをコードでコントロールしてUIテストを行えます。",
    category: "General",
    level: 2,
    relatedTerms: ["Cypress", "E2Eテスト", "自動化"],
    externalUrl: "https://playwright.dev/"
  },
  {
    id: "30",
    word: "Cypress",
    kana: "サイプレス",
    shortDesc: "ブラウザで動くモダンなE2Eテストツール。",
    longDesc: "リアルブラウザ上でUIを自動操作してテストするE2Eテストフレームワーク。リアルタイムプレビュー機能や直感的なデバッグ体験が特徴です。",
    category: "General",
    level: 2,
    relatedTerms: ["Playwright", "E2Eテスト", "自動化"],
    externalUrl: "https://www.cypress.io/"
  },
  {
    id: "31",
    word: "JWT",
    kana: "ジェイダブリューティー",
    shortDesc: "JSON形式で情報を安全に伝達するトークン規格。",
    longDesc: "JSON Web Tokenの略。ヘッダー・ペイロード・署名の3パートで構成され、ログイン状態の保持などに使われるステートレスな認証トークン形式です。",
    category: "Backend",
    level: 2,
    relatedTerms: ["OAuth", "認証", "セキュリティ"],
    externalUrl: "https://jwt.io/"
  },
  {
    id: "32",
    word: "OAuth",
    kana: "オーオース",
    shortDesc: "外部サービスへの安全な権限委譲のための標準規格。",
    longDesc: "OAuth 2.0はGoogleやGitHubのアカウントを使って別サービスにログインできる「ソーシャルログイン」などで使われる認可フレームワークです。",
    category: "Backend",
    level: 2,
    relatedTerms: ["JWT", "認証", "セキュリティ"],
    externalUrl: "https://oauth.net/2/"
  },
  {
    id: "33",
    word: "OpenAI",
    kana: "オープンエーアイ",
    shortDesc: "GPTやDALL-Eを開発するAI研究機関・企業。",
    longDesc: "ChatGPTやGPT-4などの大規模言語モデル（LLM）を開発している企業。公開APIを通じて自然言語処理・画像生成などをアプリケーションへ組み込み可能です。",
    category: "AI/Data",
    level: 1,
    relatedTerms: ["LLM", "GPT", "ChatGPT", "API"],
    externalUrl: "https://openai.com/"
  },
  {
    id: "34",
    word: "RAG",
    kana: "ラグ",
    shortDesc: "外部ドキュメントを参照してAIが回答を生成する手法。",
    longDesc: "Retrieval-Augmented Generationの略。LLMの回答生成時に、外部ドキュメントを検索して関連情報を補強することで、より正確で最新な回答を実現する技術です。",
    category: "AI/Data",
    level: 3,
    relatedTerms: ["LLM", "OpenAI", "ベクトルDB"],
    externalUrl: "https://ja.wikipedia.org/wiki/検索拡張生成"
  },
  {
    id: "35",
    word: "PyTorch",
    kana: "パイトーチ",
    shortDesc: "Python向けの機械学習・ディープラーニングフレームワーク。",
    longDesc: "Metaが開発したオープンソースの機械学習ライブラリ。動的計算グラフにより直感的にモデルを構築でき、研究・本番どちらでも広く使用されています。",
    category: "AI/Data",
    level: 3,
    relatedTerms: ["Python", "TensorFlow", "機械学習"],
    externalUrl: "https://pytorch.org/"
  },
  {
    id: "36",
    word: "Lambda",
    kana: "ラムダ",
    shortDesc: "AWSのサーバーレス関数実行サービス（FaaS）。",
    longDesc: "AWS Lambdaはサーバーを用意せずにコードを実行できるサービス。イベント駆動で自動スケールし、実行時間分だけ課金されるためコスト効率が高いです。",
    category: "Infra",
    level: 2,
    relatedTerms: ["AWS", "Serverless", "API Gateway"],
    externalUrl: "https://aws.amazon.com/jp/lambda/"
  },
  {
    id: "37",
    word: "EC2",
    kana: "イーシーツー",
    shortDesc: "AWSが提供する仮想サーバー（仮想マシン）サービス。",
    longDesc: "Amazon Elastic Compute Cloudの略。クラウド上に仮想のサーバーを立ち上げて、Webアプリやバッチ処理を実行するAWSの中核サービスです。",
    category: "Infra",
    level: 2,
    relatedTerms: ["AWS", "S3", "RDS", "クラウド"],
    externalUrl: "https://aws.amazon.com/jp/ec2/"
  },
  {
    id: "38",
    word: "S3",
    kana: "エスリー",
    shortDesc: "AWSの高耐久オブジェクトストレージサービス。",
    longDesc: "Amazon Simple Storage Serviceの略。画像・動画・ログファイルなどあらゆるオブジェクトを安価に保存できるクラウドストレージ。静的ウェブサイトのホスティングにも使われます。",
    category: "Infra",
    level: 1,
    relatedTerms: ["AWS", "EC2", "CloudFront"],
    externalUrl: "https://aws.amazon.com/jp/s3/"
  }
];

