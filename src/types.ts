export type PersonId = 'takahashi' | 'nakamura';

export type Person = {
  id: PersonId;
  name: string;
  shortName: string;
  department: string;
};

export type Doc = {
  id: string;
  /** memo: 本人の手元のメモ。共有を前提に書いていないもの */
  kind?: 'memo';
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
 * answered: 質問者が読めるドキュメントから、質問者のAIが答える
 * provisional: 質問者が読めるドキュメントが古いので、質問者のAIが推定で答え、担当者に確認する
 * drafted: 回答者だけが読めるドキュメントやメモにあるので、回答者のAIが回答案を用意して回答者に聞く
 * noSource: どこにも根拠がないので、回答者に聞く
 *
 * 質問者の画面では、drafted と noSource を区別しない（どちらも「確認します」）。
 */
export type RequestKind = 'answered' | 'provisional' | 'drafted' | 'noSource';

export type AiRequest = {
  id: string;
  from: PersonId;
  to: PersonId;
  kind: RequestKind;
  /** 根拠。answered と provisional は質問者が読めるもの、drafted は回答者だけが読めるもの */
  docId?: string;
  /** 依頼文（質問者がAIに頼む文） */
  prompt: string;
  /** 回答者に送る質問。送った文は質問者の画面にもそのまま見せる */
  question: string;
  /** answered と provisional は質問者のAIの回答、drafted は回答者のAIが用意した回答案 */
  answer?: string;
  staleNote?: string;
  /** 返事の目安 */
  replyBy?: string;
  /** デモ用の例文。回答者が入力欄に入れられる */
  exampleReply?: string;
  correctedAnswer?: string;
  correctedLine?: string;
  /** 回答者の回答から作るドキュメントの題名 */
  newDocTitle?: string;
};

/** 回答者のドキュメントで解決した過去の質問（デモ用の初期データ） */
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
