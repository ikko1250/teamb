import { canRead, getPerson, readersLabel } from '../state';
import type { Doc, PersonId } from '../types';

export function DocView({ doc, persona }: { doc: Doc; persona: PersonId }) {
  if (!canRead(doc, persona)) {
    return (
      <div className="doc">
        <h2 className="panel__title">{doc.title}</h2>
        <p className="doc__locked">
          {getPerson(persona).shortName}さんには、このドキュメントの閲覧権限がありません。
          回答は、担当者が開示を承認した部分だけが届いています。
        </p>
        <p className="meta">
          担当 {doc.owner}・閲覧 {readersLabel(doc)}
        </p>
      </div>
    );
  }

  return (
    <div className="doc">
      <h2 className="panel__title">{doc.title}</h2>
      <p className="meta">
        <span className={doc.stale ? 'meta__due meta__due--today' : ''}>
          更新 {doc.updatedAt}
          {doc.stale && '（長く更新されていません）'}
        </span>
        <span>担当 {doc.owner}</span>
        <span>閲覧 {readersLabel(doc)}</span>
      </p>
      <ol className="doc__lines">
        {doc.lines.map((line, index) => (
          <li key={index}>{index === doc.highlight ? <mark>{line}</mark> : line}</li>
        ))}
      </ol>
      {doc.highlight !== undefined && <p className="doc__note">印を付けた行が、回答の根拠です。</p>}
    </div>
  );
}
