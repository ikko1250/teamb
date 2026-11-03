import demoJson from './data/demo.json';
import type { AiRequest, Column, Demo, Doc, Item, Person, PersonId } from './types';

export const demo = demoJson as unknown as Demo;

export const FULL_COUNT = 3;
export const VISIBLE_COUNT = 8;

export type RequestStatus =
  | 'idle'
  | 'asking'
  | 'answered'
  | 'provisional'
  | 'confirmed'
  | 'corrected'
  | 'waitingApproval'
  | 'approved'
  | 'declined'
  | 'waitingAnswer'
  | 'answeredByOwner';

/** 回答者の判断を待っている状態 */
export const PENDING_STATUSES: RequestStatus[] = ['provisional', 'waitingApproval', 'waitingAnswer'];

export type RequestState = {
  status: RequestStatus;
  ownerReply?: string;
  createdDocId?: string;
};

/**
 * result: 依頼への最初の回答。依頼の状態に合わせて表示が変わる。
 * followup: 回答者が判断したあとの知らせ。
 */
export type Message =
  | { id: number; persona: PersonId; role: 'user'; text: string }
  | { id: number; persona: PersonId; role: 'ai'; type: 'text'; text: string }
  | { id: number; persona: PersonId; role: 'ai'; type: 'result' | 'followup'; requestId: string };

export type Panel = null | { kind: 'dashboard' } | { kind: 'doc'; docId: string };

export type ItemState = Item & { done: boolean; snoozed: boolean };

export type State = {
  persona: PersonId;
  messages: Message[];
  nextMessageId: number;
  requests: Record<string, RequestState>;
  docs: Doc[];
  items: ItemState[];
  panel: Panel;
};

export type Action =
  | { type: 'setPersona'; persona: PersonId }
  | { type: 'ask'; requestId: string }
  | { type: 'resolve'; requestId: string }
  | { type: 'confirm'; requestId: string }
  | { type: 'correct'; requestId: string; reply: string }
  | { type: 'approve'; requestId: string }
  | { type: 'decline'; requestId: string }
  | { type: 'reply'; requestId: string; reply: string }
  | { type: 'widen'; docId: string }
  | { type: 'showDashboard' }
  | { type: 'openDoc'; docId: string }
  | { type: 'closePanel' }
  | { type: 'complete'; id: string }
  | { type: 'snooze'; id: string };

export function getPerson(id: PersonId): Person {
  return demo.persons.find((person) => person.id === id)!;
}

export function getRequest(id: string): AiRequest {
  return demo.requests.find((request) => request.id === id)!;
}

export function canRead(doc: Doc, persona: PersonId) {
  return doc.readers === 'all' || doc.readers.includes(persona);
}

export function readersLabel(doc: Doc) {
  if (doc.readers === 'all') return '全員';
  const names = doc.readers.map((id) => `${getPerson(id).shortName}さん`);
  return names.length === 1 ? `${names[0]}のみ` : names.join('、');
}

export function selectPending(state: State, persona: PersonId) {
  return demo.requests.filter(
    (request) => request.to === persona && PENDING_STATUSES.includes(state.requests[request.id].status),
  );
}

export function selectColumn(items: ItemState[], column: Column) {
  const open = items.filter((item) => item.column === column && !item.done);
  const ranked = open.filter((item) => !item.excluded && !item.snoozed);
  const snoozed = open.filter((item) => !item.excluded && item.snoozed);
  return {
    full: ranked.slice(0, FULL_COUNT),
    mini: ranked.slice(FULL_COUNT, VISIBLE_COUNT),
    visible: ranked.slice(0, VISIBLE_COUNT),
    overflow: [...ranked.slice(VISIBLE_COUNT), ...snoozed],
    excluded: open.filter((item) => item.excluded),
  };
}

function today() {
  const now = new Date();
  const pad = (value: number) => String(value).padStart(2, '0');
  return `${now.getFullYear()}/${pad(now.getMonth() + 1)}/${pad(now.getDate())}`;
}

export function createInitialState(): State {
  return {
    persona: 'takahashi',
    messages: [],
    nextMessageId: 1,
    requests: Object.fromEntries(demo.requests.map((request) => [request.id, { status: 'idle' }])),
    docs: demo.docs,
    items: demo.items.map((item) => ({ ...item, done: false, snoozed: false })),
    panel: null,
  };
}

type NewMessage =
  | { persona: PersonId; role: 'user'; text: string }
  | { persona: PersonId; role: 'ai'; type: 'text'; text: string }
  | { persona: PersonId; role: 'ai'; type: 'result' | 'followup'; requestId: string };

function addMessages(state: State, messages: NewMessage[]): State {
  const added = messages.map((message, index) => ({ ...message, id: state.nextMessageId + index }) as Message);
  return {
    ...state,
    messages: [...state.messages, ...added],
    nextMessageId: state.nextMessageId + added.length,
  };
}

function setRequest(state: State, requestId: string, changes: Partial<RequestState>): State {
  return {
    ...state,
    requests: { ...state.requests, [requestId]: { ...state.requests[requestId], ...changes } },
  };
}

/** 回答者の判断を、質問者のAIとの対話に知らせる。 */
function notifyAsker(state: State, requestId: string): State {
  return addMessages(state, [
    { persona: getRequest(requestId).from, role: 'ai', type: 'followup', requestId },
  ]);
}

const RESOLVED_STATUS: Record<AiRequest['kind'], RequestStatus> = {
  answered: 'answered',
  provisional: 'provisional',
  needsApproval: 'waitingApproval',
  noSource: 'waitingAnswer',
};

export function reducer(state: State, action: Action): State {
  switch (action.type) {
    case 'setPersona':
      return { ...state, persona: action.persona, panel: null };

    case 'ask': {
      const request = getRequest(action.requestId);
      if (state.requests[request.id].status !== 'idle') return state;
      const asked = setRequest(state, request.id, { status: 'asking' });
      return addMessages(asked, [
        { persona: request.from, role: 'user', text: request.prompt },
        { persona: request.from, role: 'ai', type: 'result', requestId: request.id },
      ]);
    }

    case 'resolve': {
      const request = getRequest(action.requestId);
      if (state.requests[request.id].status !== 'asking') return state;
      return setRequest(state, request.id, { status: RESOLVED_STATUS[request.kind] });
    }

    case 'confirm': {
      const request = getRequest(action.requestId);
      if (state.requests[request.id].status !== 'provisional') return state;
      const docs = state.docs.map((doc) =>
        doc.id === request.docId ? { ...doc, updatedAt: today(), stale: false } : doc,
      );
      return notifyAsker(setRequest({ ...state, docs }, request.id, { status: 'confirmed' }), request.id);
    }

    case 'correct': {
      const request = getRequest(action.requestId);
      if (state.requests[request.id].status !== 'provisional') return state;
      // 回答者の訂正をドキュメントにも反映し、以後の回答を直す。
      const docs = state.docs.map((doc) => {
        if (doc.id !== request.docId || doc.highlight === undefined || !request.correctedLine) return doc;
        const lines = doc.lines.map((line, index) => (index === doc.highlight ? request.correctedLine! : line));
        return { ...doc, lines, updatedAt: today(), stale: false };
      });
      return notifyAsker(
        setRequest({ ...state, docs }, request.id, { status: 'corrected', ownerReply: action.reply }),
        request.id,
      );
    }

    case 'approve':
    case 'decline': {
      if (state.requests[action.requestId].status !== 'waitingApproval') return state;
      const status = action.type === 'approve' ? 'approved' : 'declined';
      return notifyAsker(setRequest(state, action.requestId, { status }), action.requestId);
    }

    case 'reply': {
      const request = getRequest(action.requestId);
      if (state.requests[request.id].status !== 'waitingAnswer') return state;
      // 回答をドキュメントにする。公開範囲は、最初は質問者と回答者だけにする。
      const doc: Doc = {
        id: `doc-from-${request.id}`,
        title: request.newDocTitle ?? request.question,
        owner: getPerson(request.to).name,
        readers: [request.from, request.to],
        updatedAt: today(),
        stale: false,
        lines: [`質問：${request.question}`, `回答：${action.reply}`],
        highlight: 1,
      };
      const next = setRequest({ ...state, docs: [...state.docs, doc] }, request.id, {
        status: 'answeredByOwner',
        ownerReply: action.reply,
        createdDocId: doc.id,
      });
      return notifyAsker(next, request.id);
    }

    case 'widen':
      return {
        ...state,
        docs: state.docs.map((doc) => (doc.id === action.docId ? { ...doc, readers: 'all' } : doc)),
      };

    case 'showDashboard': {
      const shown = (['action', 'task'] as const).reduce(
        (sum, column) => sum + selectColumn(state.items, column).visible.length,
        0,
      );
      const next = addMessages(state, [
        { persona: state.persona, role: 'user', text: '今日やることを見せて' },
        {
          persona: state.persona,
          role: 'ai',
          type: 'text',
          text: `今日やることを右に表示しました。${state.items.length}件の連絡とタスクから、${shown}件に絞っています。`,
        },
      ]);
      return { ...next, panel: { kind: 'dashboard' } };
    }

    case 'openDoc':
      return { ...state, panel: { kind: 'doc', docId: action.docId } };

    case 'closePanel':
      return { ...state, panel: null };

    case 'complete':
    case 'snooze':
      return {
        ...state,
        items: state.items.map((item) =>
          item.id === action.id ? { ...item, [action.type === 'complete' ? 'done' : 'snoozed']: true } : item,
        ),
      };
  }
}
