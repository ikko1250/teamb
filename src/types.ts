export type PersonId = 'takahashi' | 'nakamura';

export type Person = {
  id: PersonId;
  name: string;
  shortName: string;
  department: string;
};

export type Doc = {
  id: string;
  title: string;
  owner: string;
  /** 閲覧できる人。権限はAIではなく、ここで機械的に判定する。 */
  readers: 'all' | PersonId[];
  updatedAt: string;
  /** 長く更新されていないドキュメント */
  stale: boolean;
  lines: string[];
  /** 回答の根拠になる行 */
  highlight?: number;
};

/**
 * answered: 質問者も読めるドキュメントから自動で回答する
 * provisional: ドキュメントが古いので、推定で回答して本人に確認する
 * needsApproval: 回答者しか読めないドキュメントなので、本人に開示の可否を聞く
 * noSource: 根拠がないので、本人に質問する
 */
export type RequestKind = 'answered' | 'provisional' | 'needsApproval' | 'noSource';

export type AiRequest = {
  id: string;
  from: PersonId;
  to: PersonId;
  kind: RequestKind;
  docId?: string;
  /** 依頼文（質問者がAIに頼む文） */
  prompt: string;
  /** 回答者に見せる質問 */
  question: string;
  answer?: string;
  staleNote?: string;
  /** 回答者の入力欄に最初から入れておく文 */
  suggestedReply?: string;
  correctedAnswer?: string;
  correctedLine?: string;
  newDocTitle?: string;
};

/** AIが代わりに回答した過去の記録（デモ用の初期データ） */
export type HistoryEntry = {
  id: string;
  persona: PersonId;
  from: string;
  question: string;
  docTitle: string;
  when: string;
};

export type Column = 'action' | 'task';
export type Source = 'chat' | 'mail' | 'doc' | 'ticket';

/** スキル「今日やること」に表示する項目 */
export type Item = {
  id: string;
  column: Column;
  source: Source;
  /** AIが書き換えたタイトル */
  title: string;
  /** 元の件名 */
  originalTitle: string;
  sender?: string;
  due?: string;
  /** AIの理由1行 */
  reason: string;
  excluded: boolean;
};

export type Demo = {
  persons: Person[];
  docs: Doc[];
  requests: AiRequest[];
  history: HistoryEntry[];
  items: Item[];
};
