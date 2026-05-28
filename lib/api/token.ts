let _provider: (() => Promise<string | null>) | null = null;

export function setTokenProvider(fn: () => Promise<string | null>) {
  _provider = fn;
}

export async function getToken(): Promise<string | null> {
  return _provider ? _provider() : null;
}
