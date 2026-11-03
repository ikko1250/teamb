import { useEffect, useRef } from 'react';
import { DocView } from '../components/DocView';
import { SourceChip, type SourceStatus } from '../components/SourceChip';
import { paths } from '../route';
import {
  demo,
  getPerson,
  getRequest,
  SOLVED_BY_DOC,
  selectPending,
  type Action,
  type Message,
  type RequestStatus,
  type State,
} from '../state';
import type { AiRequest, PersonId } from '../types';
import { Dashboard } from './Dashboard';

type Props = { state: State; act: (action: Action) => void };

export function ChatPage({ state, act }: Props) {
  const messages = state.messages.filter((message) => message.persona === state.persona);
  const logRef = useRef<HTMLDivElement>(null);
  const statuses = Object.values(state.requests)
    .map((request) => request.status)
    .join();

  useEffect(() => {
    const log = logRef.current;
    if (log) log.scrollTop = log.scrollHeight;
  }, [messages.length, statuses, state.persona]);

  return (
    <div className={state.panel ? 'workspace workspace--panel' : 'workspace'}>
      <section className="chat" aria-label="AIとの対話">
        <div className="chat__log" role="log" aria-live="polite" ref={logRef}>
          <div className="chat__inner">
            <Greeting state={state} />
            {messages.map((message) => (
              <MessageView key={message.id} message={message} state={state} act={act} />
            ))}
          </div>
        </div>
        <Composer state={state} act={act} />
      </section>
      {state.panel && <SidePanel state={state} act={act} />}
    </div>
  );
}

function Greeting({ state }: { state: State }) {
  const person = getPerson(state.persona);

  if (state.persona === 'takahashi') {
    return (
      <div className="bubble">
        <p>おはようございます、{person.shortName}さん。</p>
        <p>
          社内の人への確認は、まず、あなたが読めるドキュメントから私が答えます。ドキュメントで答えられないときだけ、相手に確認します。
        </p>
      </div>
    );
  }

  const solvedToday =
    demo.history.filter((entry) => entry.persona === state.persona && entry.when.startsWith('今日')).length +
    demo.requests.filter(
      (request) => request.to === state.persona && SOLVED_BY_DOC.includes(state.requests[request.id].status),
    ).length;
  const pending = selectPending(state, state.persona);
  const drafted = pending.filter((request) => request.kind === 'drafted').length;

  return (
    <div className="bubble">
      <p>おはようございます、{person.shortName}さん。</p>
      <p className="summary">
        今日、あなたのドキュメントで<strong>{solvedToday}件</strong>の質問が解決しました。
        {pending.length > 0 ? (
          <>
            あなたへの確認が<strong>{pending.length}件</strong>あります。
            {drafted > 0 && <>うち{drafted}件は、あなたのドキュメントやメモから回答案を用意しました。</>}
          </>
        ) : (
          'あなたへの確認はありません。'
        )}
      </p>
      <a className="button button--primary" href={paths.record}>
        確認の記録を開く
      </a>
    </div>
  );
}

function Composer({ state, act }: Props) {
  const available = demo.requests.filter(
    (request) => request.from === state.persona && state.requests[request.id].status === 'idle',
  );
  const canShowDashboard = state.persona === 'takahashi';

  return (
    <div className="composer">
      {(available.length > 0 || canShowDashboard) && (
        <div className="composer__suggestions">
          <p className="composer__label">入力例</p>
          <div className="composer__chips">
            {available.map((request) => (
              <button
                key={request.id}
                type="button"
                className="button button--ghost"
                onClick={() => act({ type: 'ask', requestId: request.id })}
              >
                {request.prompt}
              </button>
            ))}
            {canShowDashboard && (
              <button type="button" className="button button--ghost" onClick={() => act({ type: 'showDashboard' })}>
                今日やることを見せて
              </button>
            )}
          </div>
        </div>
      )}
      <label className="composer__input">
        <span className="visually-hidden">AIへの依頼</span>
        <input type="text" disabled placeholder="このデモでは、上の入力例から選んでください" />
      </label>
    </div>
  );
}

function MessageView({ message, state, act }: { message: Message } & Props) {
  if (message.role === 'user') return <p className="bubble bubble--user">{message.text}</p>;
  if (message.type === 'text') return <p className="bubble">{message.text}</p>;

  const request = getRequest(message.requestId);
  const status = state.requests[request.id].status;
  return message.type === 'result' ? (
    <ResultView request={request} status={status} state={state} act={act} />
  ) : (
    <FollowupView request={request} state={state} act={act} />
  );
}

type RequestViewProps = { request: AiRequest; state: State; act: (action: Action) => void };

function useDoc(state: State, docId: string | undefined) {
  return state.docs.find((doc) => doc.id === docId);
}

const nameOf = (id: PersonId) => `${getPerson(id).shortName}さん`;

function DemoHint({ to }: { to: PersonId }) {
  return (
    <p className="demo-hint">
      デモ：ヘッダーで「{getPerson(to).name}」に切り替えると、{nameOf(to)}の画面で確認できます。
    </p>
  );
}

function StatusPill({ label, tone }: { label: string; tone?: 'warn' | 'done' }) {
  return <span className={tone ? `pill pill--${tone}` : 'pill'}>{label}</span>;
}

function ReplyBy({ request }: { request: AiRequest }) {
  return <>急ぎではないため、{nameOf(request.to)}の手が空いたときに聞きます（返事の目安：{request.replyBy}）。</>;
}

function ResultView({ request, status, state, act }: RequestViewProps & { status: RequestStatus }) {
  const doc = useDoc(state, request.docId);
  const to = nameOf(request.to);
  const openDoc = (docId: string) => act({ type: 'openDoc', docId });

  if (status === 'asking') {
    return (
      <p className="bubble bubble--typing">
        ドキュメントを探しています
        <span className="dots" aria-hidden="true" />
      </p>
    );
  }

  if (request.kind === 'answered' && doc) {
    return (
      <div className="bubble">
        <p className="bubble__head">ドキュメントから回答しました</p>
        <p className="bubble__answer">{request.answer}</p>
        <SourceChip doc={doc} status="確認済み" onOpen={openDoc} />
        <p className="bubble__note">あなたが読めるドキュメントにあったので、{to}への確認は不要でした。</p>
      </div>
    );
  }

  if (request.kind === 'provisional' && doc) {
    const chipStatus: SourceStatus =
      status === 'confirmed' ? '確認済み' : status === 'corrected' ? '訂正済み' : '未確認';
    return (
      <div className="bubble">
        <p className="bubble__head">ドキュメントをもとに推定で回答しました</p>
        <p className="bubble__answer">{status === 'corrected' ? <s>{request.answer}</s> : request.answer}</p>
        <SourceChip doc={doc} status={chipStatus} onOpen={openDoc} />
        <p className="bubble__note">
          {request.staleNote}
          {status === 'provisional' && (
            <>
              ドキュメントが古いため、{to}に確認します。
              <ReplyBy request={request} />
              確認が済むまでは、取引先への回答など、取り消せないことの根拠にしないでください。
            </>
          )}
        </p>
        {status === 'provisional' && <DemoHint to={request.to} />}
      </div>
    );
  }

  // 回答者だけが読めるものにある場合（drafted）も、どこにもない場合（noSource）も、同じ表示にする。
  // 回答者だけが読めるドキュメントがあること自体が情報になるため。
  const pill =
    status === 'answeredByOwner' ? (
      <StatusPill label="回答済み" tone="done" />
    ) : status === 'declined' ? (
      <StatusPill label="見送り" />
    ) : (
      <StatusPill label="回答待ち" tone="warn" />
    );
  return (
    <div className="bubble">
      <p className="bubble__head">
        {to}に確認します {pill}
      </p>
      <p>
        あなたが読めるドキュメントでは答えられなかったため、{to}に確認を依頼しました。
        {status === 'waitingOwner' && <ReplyBy request={request} />}
      </p>
      <p className="bubble__label">{to}に送った質問</p>
      <blockquote className="quote">{request.question}</blockquote>
      {status === 'waitingOwner' && <DemoHint to={request.to} />}
    </div>
  );
}

function FollowupView({ request, state, act }: RequestViewProps) {
  const { status, ownerReply, createdDocId } = state.requests[request.id];
  const doc = useDoc(state, request.docId);
  const createdDoc = useDoc(state, createdDocId);
  const to = nameOf(request.to);
  const openDoc = (docId: string) => act({ type: 'openDoc', docId });

  switch (status) {
    case 'confirmed':
      return (
        <div className="bubble">
          <p className="bubble__head">{to}が確認しました</p>
          <p>推定の回答は正しい内容でした。根拠のドキュメントも確認済みになりました。</p>
          {doc && <SourceChip doc={doc} status="確認済み" onOpen={openDoc} />}
        </div>
      );
    case 'corrected':
      return (
        <div className="bubble">
          <p className="bubble__head">{to}が訂正しました</p>
          <blockquote className="quote">{ownerReply}</blockquote>
          <p className="bubble__answer">{request.correctedAnswer}</p>
          {doc && <SourceChip doc={doc} status="訂正済み" onOpen={openDoc} />}
          <p className="bubble__note">根拠のドキュメントも更新したので、次からは正しい内容で答えます。</p>
        </div>
      );
    case 'answeredByOwner':
      return (
        <div className="bubble">
          <p className="bubble__head">{to}が回答しました</p>
          <p className="bubble__answer">{ownerReply}</p>
          {createdDoc && <SourceChip doc={createdDoc} status="担当者が回答" onOpen={openDoc} />}
          <p className="bubble__note">
            {to}の回答をドキュメントにしました。次に同じことを聞いたときは、{to}への確認は要りません。
          </p>
        </div>
      );
    case 'declined':
      return (
        <div className="bubble">
          <p className="bubble__head">{to}が回答を見送りました</p>
          <p>必要なら、{to}に直接相談してください。</p>
        </div>
      );
    default:
      return null;
  }
}

function SidePanel({ state, act }: Props) {
  const { panel } = state;
  const doc = panel?.kind === 'doc' ? state.docs.find((candidate) => candidate.id === panel.docId) : undefined;

  return (
    <aside className="panel" aria-label={panel?.kind === 'dashboard' ? '今日やること' : 'ドキュメント'}>
      <button type="button" className="icon-button panel__close" aria-label="パネルを閉じる" onClick={() => act({ type: 'closePanel' })}>
        ×
      </button>
      {panel?.kind === 'dashboard' && <Dashboard items={state.items} act={act} />}
      {doc && <DocView doc={doc} persona={state.persona} />}
    </aside>
  );
}
