import type { FrameworkInfo, CoachingTip, QuestionItem } from "./types";

// ─── Helper ─────────────────────────────────────────────────────
// Shorthand: S = standalone (初回出題可), F = followup only (深掘り専用)
const S = (text: string): QuestionItem => ({ text, standalone: true });
const F = (text: string): QuestionItem => ({ text, standalone: false });

// ─── Questions ──────────────────────────────────────────────────
// S = 単独で成立する質問（初回出題OK）
// F = 前の回答を前提にした質問（深掘り専用 — AIの参考資料としても使用）

export const QUESTIONS: Record<string, QuestionItem[]> = {
  "ガクチカ": [
    S("学生時代頑張ったことは？"),
    F("なぜそれに取り組もうと思ったのか？きっかけ・動機は？"),
    F("チームの中でのあなたの役割は？"),
    F("取り組みの中にはどのような課題があったか？"),
    F("なぜそれが課題であると考えたのか？"),
    F("課題が発生していた原因は？"),
    F("原因に対してどのように行動し、どのような結果が出たか？"),
    F("何がモチベーションで続けられたのか？"),
    F("その取り組みを通して学んだこと、成長したことは？"),
    F("取り組みの中で最も困難だったことは？それをどう乗り越えた？"),
    F("その取り組みでの失敗や後悔していることは？"),
    F("今ならそれをどう解決する？"),
    S("年代やバックグラウンドが違う人と働いた経験があるか？"),
    S("チームで何かを成し遂げた経験は？"),
  ],
  "自己PR": [
    S("自己紹介をしてください。"),
    S("自己PRをしてください。"),
    S("あなたの強みは？"),
    F("その強みを発揮したエピソードは？"),
    F("その強みをどう弊社に活かす？"),
    S("あなたの弱みは？"),
    F("その弱みが露呈したエピソードは？"),
    F("その弱みはどう克服しようと意識しているか？"),
    S("周りからはどんな人と言われることが多いか？"),
    S("他人と意見が食い違った時、どう対処するか？"),
    S("人とコミュニケーションを取るときに気を付けていることは？"),
    S("どんな時にストレスを感じるか？ストレスの対処法は？"),
    S("優秀だと思う人はどのような人か？"),
    S("どのような人が苦手か？そういった人にはどう対処するか？"),
    S("挫折経験を教えてください。それをどう乗り越えたか？"),
    S("どのような時にやりがいを感じるか？"),
    S("将来やりたいこと（なりたい姿）を教えてください。"),
    S("あなたの中で大切にしていること・言葉はあるか？"),
  ],
  "学業・研究": [
    S("学業で力を入れたことを教えてください。"),
    S("ゼミ・研究の取り組み内容を説明してください。"),
    F("なぜそのテーマに取り組もうと思ったのか？"),
    F("その取り組みの成果はどのような面で社会の役に立つか？"),
    S("ゼミ・研究の中で最も困難だったことは？"),
    F("ゼミ・研究でどんなことを培った？それをどう弊社に活かす？"),
    S("なぜその大学・学部を選んだのか？"),
    S("なぜそのゼミ・研究室を選んだのか？"),
    S("なぜ院や博士に行かずに就職なのか？"),
  ],
  "志望動機": [
    S("就活の軸は？"),
    S("その業界を志望しているのはなぜか？"),
    S("その業界に興味を持ったきっかけは？"),
    F("他業界ではダメな理由は？"),
    S("弊社を志望しているのはなぜか？"),
    S("弊社に興味を持ったきっかけは？"),
    F("他社ではダメな理由は？"),
    S("弊社でどのような活躍ができるか？"),
    S("弊社でのキャリアプランは？（3年、5年、10年後）"),
    S("入社後にやりたい仕事は？"),
    F("希望の勤務地・職種が叶わなくても大丈夫か？"),
    S("他社の選考状況は？"),
    S("弊社の志望度は？"),
    S("あなたにとって「働く」とは何か？"),
    S("弊社にとってあなたを雇うメリットは何か？"),
    S("弊社のサービス・製品についてどう思うか？"),
  ],
  "その他": [
    S("最近気になるニュース・社会問題は？"),
    S("何か質問はありますか？（逆質問）"),
    S("最後に何か伝えたいことはありますか？"),
  ],
  "1分チャレンジ": [
    // お題はAPI経由で毎回生成（/api/challenge）
    // 空配列 = standaloneなし → startPracticeでAPI分岐
  ],
};

// ─── Frameworks ─────────────────────────────────────────────────

export const FRAMEWORKS: Record<string, FrameworkInfo> = {
  PREP: {
    name: "PREP法",
    short: "PREP",
    structure: ["結論", "理由", "具体例", "まとめ"],
    color: "#3b82f6",
    description: "結論から始め、理由と具体例で裏付ける王道の構造",
  },
  STAR: {
    name: "STAR法",
    short: "STAR",
    structure: ["状況", "課題", "行動", "結果"],
    color: "#f59e0b",
    description: "経験を物語として伝える。困難・課題系の質問に最適",
  },
  WSNW: {
    name: "What–So What–Now What",
    short: "WSNW",
    structure: ["What（事実）", "So What（意味）", "Now What（行動）"],
    color: "#8b5cf6",
    description: "Matt Abrahamが「万能ナイフ」と呼ぶフレームワーク。事実→意味→次のアクション",
  },
  PSB: {
    name: "Problem–Solution–Benefit",
    short: "PSB",
    structure: ["問題提起", "解決策", "効果"],
    color: "#ec4899",
    description: "課題解決力をアピール。志望動機や提案型の回答に効果的",
  },
  PPF: {
    name: "Past–Present–Future",
    short: "PPF",
    structure: ["過去", "現在", "未来"],
    color: "#14b8a6",
    description: "時系列で成長ストーリーを描く。キャリアビジョン系に最適",
  },
};

export const CATEGORY_FRAMEWORKS: Record<string, string[]> = {
  "ガクチカ": ["STAR", "PSB"],
  "自己PR": ["PREP", "WSNW"],
  "学業・研究": ["WSNW", "STAR"],
  "志望動機": ["PSB", "PREP"],
  "その他": ["WSNW", "PREP"],
  "1分チャレンジ": ["WSNW", "PREP"],
};

export const QUESTION_FRAMEWORK_OVERRIDES: Record<string, string[]> = {
  "その取り組みを通して学んだこと、成長したことは？": ["WSNW", "PREP"],
  "今ならそれをどう解決する？": ["PSB", "WSNW"],
  "チームで何かを成し遂げた経験は？": ["STAR", "WSNW"],
  "自己紹介をしてください。": ["PPF", "PREP"],
  "挫折経験を教えてください。それをどう乗り越えたか？": ["STAR", "PSB"],
  "将来やりたいこと（なりたい姿）を教えてください。": ["PPF", "WSNW"],
  "他人と意見が食い違った時、どう対処するか？": ["STAR", "PREP"],
  "その取り組みの成果はどのような面で社会の役に立つか？": ["PSB", "WSNW"],
  "なぜ院や博士に行かずに就職なのか？": ["PREP", "WSNW"],
  "弊社でのキャリアプランは？（3年、5年、10年後）": ["PPF", "WSNW"],
  "あなたにとって「働く」とは何か？": ["WSNW", "PREP"],
  "弊社にとってあなたを雇うメリットは何か？": ["PREP", "PSB"],
  "就活の軸は？": ["PREP", "WSNW"],
};

// ─── Coaching Tips ──────────────────────────────────────────────

export const COACHING_TIPS: CoachingTip[] = [
  { category: "不安管理", tip: "緊張は自然な反応。深呼吸を3回して「これはチャンスだ」と言い換えてみましょう。", icon: "🧘" },
  { category: "不安管理", tip: "完璧を目指さない。「正解」はありません。あなたの考えを伝えることが大切です。", icon: "💭" },
  { category: "不安管理", tip: "話す前に手を握って開く。体の緊張を意識的にほぐすと、声も自然になります。", icon: "✊" },
  { category: "聴き手視点", tip: "「自分が何を言いたいか」ではなく「相手が何を知りたいか」から考えましょう。", icon: "👂" },
  { category: "聴き手視点", tip: "面接官の立場に立つ：この人と一緒に働きたいと思える回答を目指しましょう。", icon: "🤝" },
  { category: "聴き手視点", tip: "相手の時間は有限。最も大事なことを最初の15秒で伝えましょう。", icon: "⏱️" },
  { category: "構造化", tip: "構造は話の地図。迷子にならないための道具です。フレームワークを意識してみましょう。", icon: "🗺️" },
  { category: "構造化", tip: "箇条書きではなくストーリーで。始まり・中間・終わりのある流れを意識しましょう。", icon: "📖" },
  { category: "構造化", tip: "「3つあります」と最初に宣言すると、聴き手も自分も迷いません。", icon: "3️⃣" },
  { category: "集中", tip: "1つの質問に1つの核心メッセージ。あれもこれも詰め込みすぎないように。", icon: "🎯" },
  { category: "集中", tip: "具体的なエピソード1つが、抽象的な説明10個より伝わります。", icon: "💎" },
  { category: "練習", tip: "1%の改善を積み重ねる。前回より1つだけ良くすることに集中しましょう。", icon: "📈" },
  { category: "練習", tip: "声に出して練習するだけで、本番の自信が大きく変わります。", icon: "🎙️" },
];

// ─── Segment Colors ─────────────────────────────────────────────
// FIX: "理由" and "未来" previously shared emerald → "未来" now uses lime

export const SEG_COLORS: Record<string, { bg: string; border: string; text: string; dot: string }> = {
  // PREP
  結論:   { bg: "bg-blue-500/20",    border: "border-blue-500",    text: "text-blue-300",    dot: "bg-blue-500" },
  理由:   { bg: "bg-emerald-500/20", border: "border-emerald-500", text: "text-emerald-300", dot: "bg-emerald-500" },
  具体例: { bg: "bg-amber-500/20",   border: "border-amber-500",   text: "text-amber-300",   dot: "bg-amber-500" },
  まとめ: { bg: "bg-purple-500/20",  border: "border-purple-500",  text: "text-purple-300",  dot: "bg-purple-500" },
  // STAR
  状況: { bg: "bg-cyan-500/20",   border: "border-cyan-500",   text: "text-cyan-300",   dot: "bg-cyan-500" },
  課題: { bg: "bg-rose-500/20",   border: "border-rose-500",   text: "text-rose-300",   dot: "bg-rose-500" },
  行動: { bg: "bg-orange-500/20", border: "border-orange-500", text: "text-orange-300", dot: "bg-orange-500" },
  結果: { bg: "bg-lime-500/20",   border: "border-lime-500",   text: "text-lime-300",   dot: "bg-lime-500" },
  // WSNW
  "What（事実）":   { bg: "bg-violet-500/20",  border: "border-violet-500",  text: "text-violet-300",  dot: "bg-violet-500" },
  "So What（意味）": { bg: "bg-fuchsia-500/20", border: "border-fuchsia-500", text: "text-fuchsia-300", dot: "bg-fuchsia-500" },
  "Now What（行動）": { bg: "bg-pink-500/20",   border: "border-pink-500",   text: "text-pink-300",   dot: "bg-pink-500" },
  // PSB
  問題提起: { bg: "bg-red-500/20",  border: "border-red-500",  text: "text-red-300",  dot: "bg-red-500" },
  解決策:   { bg: "bg-sky-500/20",  border: "border-sky-500",  text: "text-sky-300",  dot: "bg-sky-500" },
  効果:     { bg: "bg-teal-500/20", border: "border-teal-500", text: "text-teal-300", dot: "bg-teal-500" },
  // PPF
  過去: { bg: "bg-stone-500/20",  border: "border-stone-500",  text: "text-stone-300",  dot: "bg-stone-500" },
  現在: { bg: "bg-indigo-500/20", border: "border-indigo-500", text: "text-indigo-300", dot: "bg-indigo-500" },
  未来: { bg: "bg-lime-400/20",   border: "border-lime-400",   text: "text-lime-300",   dot: "bg-lime-400" },
  // Fallback
  その他: { bg: "bg-gray-500/20", border: "border-gray-500", text: "text-gray-300", dot: "bg-gray-500" },
};

// ─── Derived Constants ──────────────────────────────────────────

export const TOTAL_QUESTIONS = Object.values(QUESTIONS).reduce((a, qs) => a + qs.length, 0);
export const TOTAL_STANDALONE = Object.values(QUESTIONS).reduce((a, qs) => a + qs.filter(q => q.standalone).length, 0);
export const DAILY_GOAL_DEFAULT = 50;
export const HISTORY_MAX = 2000;
export const HISTORY_PER_PAGE = 10;
export const MAX_CHAIN_DEPTH = 5;
export const CHALLENGE_CATEGORY = "1分チャレンジ";
export const DAY_LABELS = ["月", "火", "水", "木", "金", "土", "日"];
