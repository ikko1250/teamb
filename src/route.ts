import { useEffect, useState } from 'react';

export type Route = 'chat' | 'record';

function parseHash(hash: string): Route {
  return hash.replace(/^#/, '').split('?')[0] === '/record' ? 'record' : 'chat';
}

export function useRoute(): Route {
  const [route, setRoute] = useState(() => parseHash(location.hash));
  useEffect(() => {
    const onChange = () => setRoute(parseHash(location.hash));
    addEventListener('hashchange', onChange);
    return () => removeEventListener('hashchange', onChange);
  }, []);
  return route;
}

export const paths = {
  chat: '#/',
  record: '#/record',
};
