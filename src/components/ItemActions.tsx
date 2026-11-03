import type { Action } from '../state';
import type { Item } from '../types';

export function ItemActions({ item, act }: { item: Item; act: (action: Action) => void }) {
  return (
    <div className="actions">
      <button type="button" className="button button--ghost" onClick={() => act({ type: 'snooze', id: item.id })}>
        後回し
      </button>
      <button type="button" className="button button--ghost" onClick={() => act({ type: 'complete', id: item.id })}>
        完了
      </button>
    </div>
  );
}
