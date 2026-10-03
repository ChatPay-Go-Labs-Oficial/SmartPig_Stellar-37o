import { usePrivy, usePrivyClient } from '@privy-io/expo';
import { useEffect, useState } from 'react';
import { AppState, type StyleProp, Text, type TextStyle } from 'react-native';

// TEMPORÁRIO — sai com o revert do commit que o adicionou.
//
// Mostra, na tela "Sessão não carregou", qual parte do `isReady` do Privy está
// pendente no iOS e se o JS começou antes de o usuário abrir o app.

// Avaliados quando o _layout importa este módulo, ou seja, no início do JS
// (o Metro do Expo não usa inlineRequires).
const JS_STARTED_AT = Date.now();
const INITIAL_APP_STATE = AppState.currentState;
let foregroundedAt: number | null =
  INITIAL_APP_STATE === 'background' ? null : JS_STARTED_AT;

AppState.addEventListener('change', (nextAppState) => {
  if (foregroundedAt === null && nextAppState !== 'background') {
    foregroundedAt = Date.now();
  }
});

const PING_TIMEOUT_MS = 1_000;
const REFRESH_MS = 2_000;

function mark(value: boolean | null): string {
  if (value === null) return '…';
  return value ? '✓' : '✗';
}

function seconds(since: number | null, now: number): string {
  return since === null ? '–' : `${Math.round((now - since) / 1000)}s`;
}

export function PrivyGateDiagnostic({ style }: { style?: StyleProp<TextStyle> }) {
  const { user } = usePrivy();
  const client = usePrivyClient();
  const [walletResponds, setWalletResponds] = useState<boolean | null>(null);
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    let cancelled = false;

    const check = async () => {
      const responds = await client.embeddedWallet.ping(PING_TIMEOUT_MS);
      if (cancelled) return;
      setWalletResponds(responds);
      setNow(Date.now());
    };

    check();
    const interval = setInterval(check, REFRESH_MS);

    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, [client]);

  return (
    <Text style={style}>
      {`sessão ${mark(Boolean(user))} · carteira ${mark(walletResponds)}\n` +
        `JS ${seconds(JS_STARTED_AT, now)} · 1º plano ${seconds(foregroundedAt, now)} · início ${INITIAL_APP_STATE}`}
    </Text>
  );
}
