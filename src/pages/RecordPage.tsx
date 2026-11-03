import { useState } from 'react';
import {
  demo,
  getPerson,
  readersLabel,
  selectPending,
  type Action,
  type RequestStatus,
  type State,
} from '../state';
import type { AiRequest, PersonId } from '../types';

type Props = { state: State; act: (action: Action) => void };

const AI_ANSWERED: RequestStatus[] = ['answered', 'provisional', 'confirmed', 'corrected'];
const OWNER_HANDLED: RequestStatus[] = ['confirmed', 'corrected', 'approved', 'declined', 'answeredByOwner'];
const HANDLED: RequestStatus[] = ['answered', ...OWNER_HANDLED];

const nameOf = (id: PersonId) => `${getPerson(id).shortName}さん`;

export function RecordPage({ state, act }: Props) {
  const person = getPerson(state.persona);
  const mine = demo.requests.filter((request) => request.to === state.persona);
  const statusOf = (request: AiRequest) => state.requests[request.id].status;
  const pending = selectPending(state, state.persona);
  const handled = mine.filter((request) => HANDLED.includes(statusOf(request))).reverse();
  const history = demo.history.filter((entry) => entry.persona === state.persona);

  const aiAnswered = history.length + mine.filter((request) => AI_ANSWERED.includes(statusOf(request))).length;
  const ownerHandled = mine.filter((request) => OWNER_HANDLED.includes(statusOf(request))).length;

  return (
    <div className="page">
      <h1 className="page__title">代理対応の記録</h1>
      <p className="page__description">
        {person.shortName}さんの代わりにAIが対応した内容と、{person.shortName}さんの判断が必要なものです。
      </p>

      <dl className="stats">
        <div>
          <dt>AIが代わりに回答</dt>
          <dd>{aiAnswered}件</dd>
        </div>
        <div>
          <dt>あなたが対応</dt>
          <dd>{ownerHandled}件</dd>
        </div>
        <div>
          <dt>あなたの判断待ち</dt>
          <dd className={pending.length > 0 ? 'stats__warn' : ''}>{pending.length}件</dd>
        </div>
      </dl>

      <section className="record-section" aria-labelledby="pending-title">
        <h2 id="pending-title">あなたの判断待ち</h2>
        {pending.length === 0 ? (
          <p className="empty">判断が必要なものはありません。</p>
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

      <section className="record-section" aria-labelledby="handled-title">
        <h2 id="handled-title">AIが代わりに対応したこと</h2>
        <ul className="record-list">
          {handled.map((request) => (
            <li key={request.id}>
              <HandledRow request={request} state={state} act={act} />
            </li>
          ))}
          {history.map((entry) => (
            <li key={entry.id} className="record-row">
              <div>
                <p className="record-row__question">
                  {entry.from.split(' ')[0]}さん：{entry.question}
                </p>
                <p className="record-row__detail">AIが「{entry.docTitle}」をもとに回答しました</p>
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

function PendingCard({ request, status, state, act }: CardProps) {
  const [editing, setEditing] = useState(false);
  const [reply, setReply] = useState(request.suggestedReply ?? '');
  const doc = state.docs.find((candidate) => candidate.id === request.docId);
  const from = nameOf(request.from);
  const replyField = (
    <label className="field">
      <span className="field__label">あなたの回答</span>
      <textarea value={reply} onChange={(event) => setReply(event.target.value)} rows={3} />
    </label>
  );

  const header = (label: string) => (
    <div className="pending__top">
      <span className="pill pill--warn">{label}</span>
      <span className="pending__urgency">急ぎではありません</span>
    </div>
  );

  if (status === 'provisional' && doc) {
    return (
      <article className="pending">
        {header('未確認の回答の確認')}
        <h3>
          {from}：{request.question}
        </h3>
        <p>
          AIは「{doc.title}」（更新 {doc.updatedAt}）をもとに、推定で回答しました。
        </p>
        <blockquote className="quote">{request.answer}</blockquote>
        {editing ? (
          <>
            {replyField}
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

  if (status === 'waitingApproval' && doc) {
    return (
      <article className="pending">
        {header('開示の確認')}
        <h3>
          {from}：{request.question}
        </h3>
        <p>
          根拠は「{doc.title}」で、閲覧できるのは{readersLabel(doc)}です。{from}に見せてよいですか？
        </p>
        <blockquote className="quote">{request.answer}</blockquote>
        <div className="actions">
          <button type="button" className="button button--primary" onClick={() => act({ type: 'approve', requestId: request.id })}>
            {from}に見せる
          </button>
          <button type="button" className="button button--ghost" onClick={() => act({ type: 'decline', requestId: request.id })}>
            見せない
          </button>
        </div>
        <p className="pending__note">見せるのはこの回答だけで、ドキュメントの閲覧権限は変わりません。</p>
      </article>
    );
  }

  return (
    <article className="pending">
      {header('根拠のない質問')}
      <h3>
        {from}：{request.question}
      </h3>
      <p>根拠になるドキュメントがないため、AIは推測で答えず、あなたに質問しています。</p>
      {replyField}
      <div className="actions">
        <button
          type="button"
          className="button button--primary"
          disabled={!reply.trim()}
          onClick={() => act({ type: 'reply', requestId: request.id, reply: reply.trim() })}
        >
          回答する
        </button>
      </div>
      <p className="pending__note">
        回答はドキュメントとして保存し、次からはAIが答えます。最初の公開範囲は{from}とあなただけです。
      </p>
    </article>
  );
}

function HandledRow({ request, state, act }: Omit<CardProps, 'status'>) {
  const { status, createdDocId } = state.requests[request.id];
  const doc = state.docs.find((candidate) => candidate.id === request.docId);
  const createdDoc = state.docs.find((candidate) => candidate.id === createdDocId);

  const DETAILS: Partial<Record<RequestStatus, string>> = {
    answered: `AIが「${doc?.title}」をもとに回答しました`,
    confirmed: 'AIの推定の回答を、あなたが確認しました',
    corrected: `AIの推定の回答を、あなたが訂正しました。「${doc?.title}」も更新しました`,
    approved: 'あなたが開示を承認し、AIが回答しました',
    declined: 'あなたが開示を見送りました',
    answeredByOwner: `あなたが回答し、AIがドキュメント「${createdDoc?.title}」を作りました`,
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
