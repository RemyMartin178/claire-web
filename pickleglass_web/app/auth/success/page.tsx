'use client';
import { Suspense, useEffect, useMemo, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';

function SuccessContent() {
  const sp = useSearchParams();
  const router = useRouter();
  const flow = sp.get('flow');
  const sessionId = sp.get('session_id') || sp.get('sessionId');
  const debug = sp.get('debug') === '1';
  const [manual, setManual] = useState(false);

  const state = useMemo(
    () => 'st-' + Math.random().toString(36).slice(2, 10),
    []
  );
  const deep = useMemo(() => {
    if (!sessionId) return null;
    return `pickleglass://auth/callback?code=${encodeURIComponent(sessionId)}&state=${encodeURIComponent(state)}`;
  }, [sessionId, state]);

  useEffect(() => {
    if (flow !== 'mobile') {
      debug && console.log('[success] non-mobile flow → redirect /activity');
      router.replace('/activity');
      return;
    }
    if (!deep) {
      debug && console.warn('[success] missing sessionId, abort deep link');
      return;
    }

    // 1) tentative immédiate
    const t1 = setTimeout(() => {
      debug && console.log('[success] attempting window.location to', deep);
      try { (window.location as any).href = deep; } catch (e) { console.error(e); }
    }, 200);

    // 2) iframe fallback
    const t2 = setTimeout(() => {
      debug && console.log('[success] attempting iframe fallback');
      const ifr = document.createElement('iframe');
      ifr.style.display = 'none';
      ifr.src = deep!;
      document.body.appendChild(ifr);
      setTimeout(() => { try { ifr.remove(); } catch {} }, 2500);
    }, 1000);

    // 3) afficher bouton manuel
    const t3 = setTimeout(() => {
      debug && console.log('[success] enabling manual button');
      setManual(true);
    }, 1800);

    return () => { clearTimeout(t1); clearTimeout(t2); clearTimeout(t3); };
  }, [flow, deep, router, debug]);

  if (flow !== 'mobile') return null;

  return (
    <main className="mx-auto max-w-md p-6">
      <h1 className="text-xl font-semibold">connexion réussie</h1>
              <p className="mt-2">on te renvoie vers l&apos;app claire...</p>
      {manual && deep && (
        <a
          href={deep}
          className="mt-4 inline-flex items-center rounded-md border px-4 py-2"
          onClick={() => debug && console.log('[success] manual click →', deep)}
        >
          ouvrir claire
        </a>
      )}
      {debug && (
        <pre className="mt-4 text-xs whitespace-pre-wrap">
{`flow=${flow}
sessionId=${sessionId}
deep=${deep}
state=${state}`}
        </pre>
      )}
    </main>
  );
}

export default function SuccessPage() {
  return (
    <Suspense fallback={null}>
      <SuccessContent />
    </Suspense>
  );
}


