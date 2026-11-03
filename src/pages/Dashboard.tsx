import { useEffect, useRef, useState } from 'react';
import { ItemActions } from '../components/ItemActions';
import { ItemMeta } from '../components/ItemMeta';
import { COLUMN_LABELS } from '../components/labels';
import { selectColumn, type Action, type ItemState } from '../state';
import type { Column } from '../types';

type Props = { items: ItemState[]; act: (action: Action) => void };

/** スキル「今日やること」。対話の横のパネルに表示する。 */
export function Dashboard({ items, act }: Props) {
  return (
    <div className="dashboard">
      <h2 className="panel__title">今日やること</h2>
      <div className="columns">
        <ColumnView column="action" items={items} act={act} />
        <ColumnView column="task" items={items} act={act} />
      </div>
    </div>
  );
}

function ColumnView({ column, items, act }: Props & { column: Column }) {
  const { full, mini, overflow, excluded } = selectColumn(items, column);
  const labels = COLUMN_LABELS[column];

  return (
    <section className="column" aria-labelledby={`column-${column}`}>
      <h3 className="column__title" id={`column-${column}`}>
        {labels.title}
        <span className="column__sources">{labels.sources}</span>
      </h3>
      <ol className="cards">
        {full.map((item) => (
          <li key={item.id}>
            <FullCard item={item} act={act} />
          </li>
        ))}
        {mini.map((item) => (
          <li key={item.id}>
            <MiniCard item={item} act={act} />
          </li>
        ))}
      </ol>
      <p className="column__more">
        ほかに{overflow.length}件、AIが除外{excluded.length}件
      </p>
    </section>
  );
}

type CardProps = { item: ItemState; act: (action: Action) => void };

function FullCard({ item, act }: CardProps) {
  return (
    <article className="card card--full">
      <ItemMeta item={item} />
      <h4 className="card__title" title={item.title}>
        {item.title}
      </h4>
      <div className="card__bottom">
        <p className="card__reason" title={item.reason}>
          {item.reason}
        </p>
        <ItemActions item={item} act={act} />
      </div>
    </article>
  );
}

function MiniCard({ item, act }: CardProps) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!open) return;
    closeRef.current?.focus();

    function onPointerDown(event: PointerEvent) {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false);
    }
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        setOpen(false);
        triggerRef.current?.focus();
      }
    }
    document.addEventListener('pointerdown', onPointerDown);
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('pointerdown', onPointerDown);
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [open]);

  return (
    <div className="mini" ref={rootRef}>
      <button
        type="button"
        ref={triggerRef}
        className="card card--mini"
        aria-expanded={open}
        onClick={() => setOpen((value) => !value)}
      >
        {item.title}
      </button>
      {open && (
        <div className="popover" role="dialog" aria-label={item.title}>
          <div className="popover__top">
            <ItemMeta item={item} />
            <button
              type="button"
              ref={closeRef}
              className="icon-button"
              aria-label="閉じる"
              onClick={() => {
                setOpen(false);
                triggerRef.current?.focus();
              }}
            >
              ×
            </button>
          </div>
          <h4 className="popover__title">{item.title}</h4>
          <p className="popover__reason">{item.reason}</p>
          <p className="popover__original">元の件名：{item.originalTitle}</p>
          <ItemActions item={item} act={act} />
        </div>
      )}
    </div>
  );
}
