import { readersLabel } from '../state';
import type { Doc } from '../types';

export type SourceStatus = '確認済み' | '未確認' | '訂正済み' | '担当者が回答';

type Props = { doc: Doc; status: SourceStatus; onOpen: (docId: string) => void };

/** 回答の根拠。ドキュメント名、更新日、担当者、閲覧できる人、状態を必ず見せる。 */
export function SourceChip({ doc, status, onOpen }: Props) {
  const tone = status === '未確認' ? 'chip--warn' : status === '訂正済み' ? 'chip--info' : '';
  return (
    <button type="button" className={`chip ${tone}`} onClick={() => onOpen(doc.id)}>
      <span className="chip__label">根拠</span>
      <span className="chip__title">{doc.title}</span>
      <span className="chip__meta">
        更新 {doc.updatedAt}・担当 {doc.owner}・閲覧 {readersLabel(doc)}
      </span>
      <span className="chip__status">{status}</span>
    </button>
  );
}
