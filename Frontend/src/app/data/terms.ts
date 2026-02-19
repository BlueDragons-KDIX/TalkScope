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
    id: "11",
    word: "SQL",
    kana: "エスキューエル",
    shortDesc: "データベースを操作するための言語。",
    longDesc: "リレーショナルデータベース（RDB）に対して、データの取得や更新、削除などの操作を指示するための標準的な言語。",
    category: "Backend",
    level: 1,
    relatedTerms: ["RDB", "MySQL", "PostgreSQL", "NoSQL"],
    externalUrl: "https://ja.wikipedia.org/wiki/SQL"
  },
  {
    id: "12",
    word: "Next.js",
    kana: "ネクストジェーエス",
    shortDesc: "ReactベースのWebアプリ開発用フレームワーク。",
    longDesc: "Reactを拡張し、サーバーサイドレンダリング(SSR)や静的サイト生成(SSG)などを簡単に実現できるようにしたフレームワーク。Vercel社によって開発されています。",
    category: "Frontend",
    level: 2,
    relatedTerms: ["React", "SSR", "Vercel"],
    externalUrl: "https://nextjs.org/"
  },
  {
    id: "13",
    word: "Serverless",
    kana: "サーバーレス",
    shortDesc: "サーバー管理を意識せずにアプリを実行する仕組み。",
    longDesc: "開発者がサーバーの構築や管理を行うことなく、プログラム（関数）を実行できるクラウドコンピューティングのモデル。AWS Lambdaなどが有名です。",
    category: "Infra",
    level: 2,
    relatedTerms: ["AWS Lambda", "FaaS", "クラウド"],
    externalUrl: "https://aws.amazon.com/jp/serverless/"
  },
  {
    id: "14",
    word: "UX",
    kana: "ユーエックス",
    shortDesc: "ユーザーがサービスを通じて得る体験全体のこと。",
    longDesc: "User Experienceの略。製品やサービスを利用する過程でユーザーが感じる「使いやすさ」「心地よさ」「感動」などの体験の質のことを指します。",
    category: "General",
    level: 1,
    relatedTerms: ["UI", "アクセシビリティ", "デザイン思考"],
    externalUrl: "https://ja.wikipedia.org/wiki/ユーザーエクスペリエンス"
  }
];
