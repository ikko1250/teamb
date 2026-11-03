import { useEffect, useReducer, useRef } from 'react';
import { Header } from './components/Header';
import { ChatPage } from './pages/ChatPage';
import { RecordPage } from './pages/RecordPage';
import { useRoute } from './route';
import { createInitialState, reducer, selectPending, type Action } from './state';

/** AIがドキュメントを探す時間（デモ用） */
const ANSWER_DELAY_MS = 1200;

export function App() {
  const [state, dispatch] = useReducer(reducer, undefined, createInitialState);
  const route = useRoute();
  const mainRef = useRef<HTMLElement>(null);

  useEffect(() => {
    document.title = `${route === 'chat' ? 'AIとの対話' : '確認の記録'} | teamb`;
    mainRef.current?.focus({ preventScroll: true });
  }, [route, state.persona]);

  function act(action: Action) {
    dispatch(action);
    if (action.type === 'ask') {
      setTimeout(() => dispatch({ type: 'resolve', requestId: action.requestId }), ANSWER_DELAY_MS);
    }
  }

  return (
    <div className="app">
      <Header
        persona={state.persona}
        route={route}
        pendingCount={selectPending(state, state.persona).length}
        onChangePersona={(persona) => act({ type: 'setPersona', persona })}
      />
      <main ref={mainRef} tabIndex={-1} className="main">
        {route === 'chat' ? (
          <ChatPage state={state} act={act} />
        ) : (
          <RecordPage state={state} act={act} />
        )}
      </main>
    </div>
  );
}
