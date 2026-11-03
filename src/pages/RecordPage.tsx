import { useState } from 'react';
import {
  demo,
  getPerson,
  readersLabel,
  selectPending,
  SOLVED_BY_DOC,
  type Action,
  type RequestStatus,
  type State,
} from '../state';
import type { AiRequest, Doc, PersonId } from '../types';

type Props = { state: State; act: (action: Action) => void };

const OWNER_HANDLED: RequestStatus[] = ['confirmed', 'corrected', 'answeredByOwner', 'declined'];

const nameOf = (id: PersonId) => `${getPerson(id).shortName}さん`;
const kindLabel = (doc: Doc) => (doc.kind === 'memo' ? 'メモ' : 'ドキュメント');

export function RecordPage({ state, act }: Props) {
  const person = getPerson(state.persona);
  const mine = demo.requests.filter((request) => request.to === state.persona);
  const statusOf = (request: AiRequest) => state.requests[request.id].status;
  const pending = selectPending(state, state.persona);
  const handled = mine.filter((request) => OWNER_HANDLED.includes(statusOf(request))).reverse();
  const solved = mine.filter((request) => statusOf(request) === 'answered').reverse();
  const history = demo.history.filter((entry) => entry.persona === state.persona);

  const solvedCount =
    history.length + mine.filter((request) => SOLVED_BY_DOC.includes(statusOf(request))).length;

  return (
    <div className="page">
      <h1 className="page__title">確認の記録</h1>
      <p className="page__description">
        {person.shortName}さんへの確認と、{person.shortName}さんのドキュメントで解決した質問です。
      </p>

      <dl className="stats">
        <div>
          <dt>あなたのドキュメントで解決</dt>
          <dd>{solvedCount}件</dd>
        </div>
        <div>
          <dt>あなたが答えた確認</dt>
          <dd>{handled.length}件</dd>
        </div>
        <div>
          <dt>あなたへの確認</dt>
          <dd className={pending.length > 0 ? 'stats__warn' : ''}>{pending.length}件</dd>
        </div>
      </dl>

      <section className="record-section" aria-labelledby="pending-title">
        <h2 id="pending-title">あなたへの確認</h2>
        {pending.length === 0 ? (
          <p className="empty">確認が必要なものはありません。</p>
        ) : (
          <ul className="record-list">
            {pending.map((request) => (
              <li key={request.id}>
                <PendingCard request={request} status={statusOf(request)} state={state} act={act} />
              </li>
            ))}
          </ul>
        )}
      </section>

      {handled.length > 0 && (
        <section className="record-section" aria-labelledby="handled-title">
          <h2 id="handled-title">あなたが答えた確認</h2>
          <ul className="record-list">
            {handled.map((request) => (
              <li key={request.id}>
                <HandledRow request={request} state={state} act={act} />
              </li>
            ))}
          </ul>
        </section>
      )}

      <section className="record-section" aria-labelledby="solved-title">
        <h2 id="solved-title">あなたのドキュメントで解決した質問</h2>
        <p className="record-section__note">質問した人が読めるドキュメントで解決したので、あなたへの確認はしていません。</p>
        <ul className="record-list">
          {solved.map((request) => {
            const doc = state.docs.find((candidate) => candidate.id === request.docId);
            return (
              <li key={request.id} className="record-row">
                <div>
                  <p className="record-row__question">
                    {nameOf(request.from)}：{request.question}
                  </p>
                  <p className="record-row__detail">「{doc?.title}」で解決しました</p>
                </div>
                <span className="record-row__when">たった今</span>
              </li>
            );
          })}
          {history.map((entry) => (
            <li key={entry.id} className="record-row">
              <div>
                <p className="record-row__question">
                  {entry.from.split(' ')[0]}さん：{entry.question}
                </p>
                <p className="record-row__detail">「{entry.docTitle}」で解決しました</p>
              </div>
              <span className="record-row__when">{entry.when}</span>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}

type CardProps = { request: AiRequest; status: RequestStatus; state: State; act: (action: Action) => void };

/** 回答案の根拠。回答者だけが読めるものなので、回答者の画面にだけ出す。 */
function SourceQuote({ doc }: { doc: Doc }) {
  return (
    <div className="source">
      <p className="source__meta">
        根拠：あなたの{kindLabel(doc)}「{doc.title}」（更新 {doc.updatedAt}・閲覧 {readersLabel(doc)}）
      </p>
      {doc.highlight !== undefined && (
        <blockquote className="quote">
          <mark>{doc.lines[doc.highlight]}</mark>
        </blockquote>
      )}
    </div>
  );
}

function ReplyField({
  request,
  value,
  onChange,
  label = 'あなたの回答',
}: {
  request: AiRequest;
  value: string;
  onChange: (value: string) => void;
  label?: string;
}) {
  return (
    <div className="reply-field">
      <label className="field">
        <span className="field__label">{label}</span>
        <textarea
          value={value}
          onChange={(event) => onChange(event.target.value)}
          rows={3}
          placeholder={request.exampleReply ? `例：${request.exampleReply}` : undefined}
        />
      </label>
      {request.exampleReply && !value && (
        <button type="button" className="button button--ghost button--small" onClick={() => onChange(request.exampleReply!)}>
          デモ用の例文を入れる
        </button>
      )}
    </div>
  );
}

function PendingCard({ request, status, state, act }: CardProps) {
  const [editing, setEditing] = useState(false);
  const [reply, setReply] = useState('');
  const doc = state.docs.find((candidate) => candidate.id === request.docId);
  const from = nameOf(request.from);

  const header = (label: string) => (
    <div className="pending__top">
      <span className="pill pill--warn">{label}</span>
      <span className="pending__urgency">急ぎではありません（返事の目安：{request.replyBy}）</span>
    </div>
  );
  const title = (
    <h3>
      {from}：{request.question}
    </h3>
  );
  const docNote = (
    <p className="pending__note">
      {from}に届くのは回答だけです。回答はドキュメントにし、最初の公開範囲は{from}とあなただけにします。次に{from}が同じことを聞いたときは、あなたへの確認は要りません。
    </p>
  );
  const send = (text: string) => act({ type: 'reply', requestId: request.id, reply: text.trim() });
  const decline = (
    <button type="button" className="button button--ghost" onClick={() => act({ type: 'decline', requestId: request.id })}>
      答えない
    </button>
  );

  if (status === 'provisional' && doc) {
    return (
      <article className="pending">
        {header('推定の回答の確認')}
        {title}
        <p>
          「{doc.title}」（更新 {doc.updatedAt}）が古いため、{from}には次のとおり推定で回答してあります。内容が正しいか確認してください。
        </p>
        <blockquote className="quote">{request.answer}</blockquote>
        {editing ? (
          <>
            <ReplyField request={request} value={reply} onChange={setReply} label="正しい内容" />
            <div className="actions">
              <button
                type="button"
                className="button button--primary"
                disabled={!reply.trim()}
                onClick={() => act({ type: 'correct', requestId: request.id, reply: reply.trim() })}
              >
                訂正を送る
              </button>
              <button type="button" className="button button--ghost" onClick={() => setEditing(false)}>
                やめる
              </button>
            </div>
            <p className="pending__note">訂正は{from}に届き、根拠のドキュメントも更新されます。</p>
          </>
        ) : (
          <div className="actions">
            <button type="button" className="button button--primary" onClick={() => act({ type: 'confirm', requestId: request.id })}>
              この内容で正しい
            </button>
            <button type="button" className="button button--ghost" onClick={() => setEditing(true)}>
              訂正する
            </button>
          </div>
        )}
      </article>
    );
  }

  if (request.kind === 'drafted' && doc) {
    return (
      <article className="pending">
        {header('回答案の確認')}
        {title}
        <p>あなたの{kindLabel(doc)}から、回答案を用意しました。このまま答えてよいですか？</p>
        <SourceQuote doc={doc} />
        {editing ? (
          <>
            <ReplyField request={request} value={reply} onChange={setReply} />
            <div className="actions">
              <button type="button" className="button button--primary" disabled={!reply.trim()} onClick={() => send(reply)}>
                回答を送る
              </button>
              <button type="button" className="button button--ghost" onClick={() => setEditing(false)}>
                やめる
              </button>
            </div>
          </>
        ) : (
          <>
            <div className="source">
              <p className="source__meta">{from}への回答案</p>
              <blockquote className="quote quote--draft">{request.answer}</blockquote>
            </div>
            <div className="actions">
              <button type="button" className="button button--primary" onClick={() => send(request.answer!)}>
                このまま答える
              </button>
              <button
                type="button"
                className="button button--ghost"
                onClick={() => {
                  setReply(request.answer!);
                  setEditing(true);
                }}
              >
                直して答える
              </button>
              {decline}
            </div>
          </>
        )}
        {docNote}
      </article>
    );
  }

  return (
    <article className="pending">
      {header('質問')}
      {title}
      <p>{from}が読めるドキュメントにも、あなたのドキュメントやメモにも、答えが見つかりませんでした。</p>
      <ReplyField request={request} value={reply} onChange={setReply} />
      <div className="actions">
        <button type="button" className="button button--primary" disabled={!reply.trim()} onClick={() => send(reply)}>
          回答する
        </button>
        {decline}
      </div>
      {docNote}
    </article>
  );
}

function HandledRow({ request, state, act }: Omit<CardProps, 'status'>) {
  const { status, ownerReply, createdDocId } = state.requests[request.id];
  const doc = state.docs.find((candidate) => candidate.id === request.docId);
  const createdDoc = state.docs.find((candidate) => candidate.id === createdDocId);

  const answeredDetail =
    request.kind === 'drafted'
      ? ownerReply === request.answer
        ? '回答案のまま回答しました'
        : '回答案を直して回答しました'
      : 'あなたが回答しました';
  const DETAILS: Partial<Record<RequestStatus, string>> = {
    confirmed: '推定の回答を、あなたが確認しました',
    corrected: `推定の回答を、あなたが訂正しました。「${doc?.title}」も更新しました`,
    answeredByOwner: `${answeredDetail}。回答をドキュメント「${createdDoc?.title}」にしました`,
    declined: '回答を見送りました',
  };

  return (
    <div className="record-row">
      <div>
        <p className="record-row__question">
          {nameOf(request.from)}：{request.question}
        </p>
        <p className="record-row__detail">{DETAILS[status]}</p>
        {createdDoc && (
          <p className="record-row__detail">
            公開範囲：{readersLabel(createdDoc)}
            {createdDoc.readers !== 'all' && (
              <button type="button" className="button button--ghost button--small" onClick={() => act({ type: 'widen', docId: createdDoc.id })}>
                全員に公開する
              </button>
            )}
          </p>
        )}
      </div>
      <span className="record-row__when">たった今</span>
    </div>
  );
}
