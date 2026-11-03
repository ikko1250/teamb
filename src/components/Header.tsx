import { paths, type Route } from '../route';
import { demo } from '../state';
import type { PersonId } from '../types';

type Props = {
  persona: PersonId;
  route: Route;
  pendingCount: number;
  onChangePersona: (persona: PersonId) => void;
};

export function Header({ persona, route, pendingCount, onChangePersona }: Props) {
  return (
    <header className="header">
      <a className="header__logo" href={paths.chat}>
        teamb
      </a>
      <nav className="nav" aria-label="画面">
        <a href={paths.chat} aria-current={route === 'chat' ? 'page' : undefined}>
          AIとの対話
        </a>
        <a href={paths.record} aria-current={route === 'record' ? 'page' : undefined}>
          確認の記録
          {pendingCount > 0 && (
            <span className="badge" aria-label={`あなたへの確認${pendingCount}件`}>
              {pendingCount}
            </span>
          )}
        </a>
      </nav>
      <div className="persona">
        <span className="persona__label" id="persona-label">
          表示する人（デモ用）
        </span>
        <div className="segmented" role="group" aria-labelledby="persona-label">
          {demo.persons.map((person) => (
            <button
              key={person.id}
              type="button"
              aria-pressed={persona === person.id}
              onClick={() => onChangePersona(person.id)}
            >
              {person.name}（{person.department.replace('部', '')}）
            </button>
          ))}
        </div>
      </div>
      <span className="header__demo">架空のデータによるデモ</span>
    </header>
  );
}
