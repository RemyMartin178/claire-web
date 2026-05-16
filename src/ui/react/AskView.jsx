import React from 'react';
import CluelyAskView from './cluely-ask/CluelyAskView.jsx';

// AskView is now a thin wrapper around the Cluely-parity implementation
// (Phase 4). All conversation/state logic lives in CluelyAskView.
export default function AskView() {
  return <CluelyAskView />;
}
