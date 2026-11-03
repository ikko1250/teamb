import type { Column, Source } from '../types';

export const SOURCE_LABELS: Record<Source, string> = {
  chat: 'チャット',
  mail: 'メール',
  doc: 'ドキュメント',
  ticket: 'チケット',
};

export const COLUMN_LABELS: Record<Column, { title: string; sources: string }> = {
  action: { title: '要対応', sources: 'チャット、メール' },
  task: { title: 'タスク', sources: 'ドキュメント、チケット' },
};
