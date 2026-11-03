import type { Item } from '../types';
import { SOURCE_LABELS } from './labels';

export function ItemMeta({ item }: { item: Item }) {
  return (
    <p className="meta">
      <span>{SOURCE_LABELS[item.source]}</span>
      {item.sender && <span>{item.sender}</span>}
      {item.due && (
        <span className={item.due.startsWith('今日') ? 'meta__due meta__due--today' : 'meta__due'}>
          {item.due}
        </span>
      )}
    </p>
  );
}
