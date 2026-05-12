import AsyncStorage from '@react-native-async-storage/async-storage';
import type { StorageAdapter, StoredCredential, StoredSession } from 'smart-account-kit';

const CREDENTIALS_KEY = 'sak:credentials';
const SESSION_KEY = 'sak:session';

type SerializedCredential = Omit<StoredCredential, 'publicKey'> & { publicKey: number[] };

function serialize(credential: StoredCredential): SerializedCredential {
  return { ...credential, publicKey: Array.from(credential.publicKey) };
}

function deserialize(raw: SerializedCredential): StoredCredential {
  return { ...raw, publicKey: new Uint8Array(raw.publicKey) };
}

async function loadAll(): Promise<Record<string, SerializedCredential>> {
  const json = await AsyncStorage.getItem(CREDENTIALS_KEY);
  return json ? JSON.parse(json) : {};
}

async function saveAll(map: Record<string, SerializedCredential>): Promise<void> {
  await AsyncStorage.setItem(CREDENTIALS_KEY, JSON.stringify(map));
}

export class ExpoStorageAdapter implements StorageAdapter {
  async save(credential: StoredCredential): Promise<void> {
    const map = await loadAll();
    map[credential.credentialId] = serialize(credential);
    await saveAll(map);
  }

  async get(credentialId: string): Promise<StoredCredential | null> {
    const map = await loadAll();
    const raw = map[credentialId];
    return raw ? deserialize(raw) : null;
  }

  async getByContract(contractId: string): Promise<StoredCredential[]> {
    const map = await loadAll();
    return Object.values(map)
      .filter((c) => c.contractId === contractId)
      .map(deserialize);
  }

  async getAll(): Promise<StoredCredential[]> {
    const map = await loadAll();
    return Object.values(map).map(deserialize);
  }

  async delete(credentialId: string): Promise<void> {
    const map = await loadAll();
    delete map[credentialId];
    await saveAll(map);
  }

  async update(
    credentialId: string,
    updates: Partial<Omit<StoredCredential, 'credentialId' | 'publicKey'>>,
  ): Promise<void> {
    const map = await loadAll();
    if (map[credentialId]) {
      map[credentialId] = { ...map[credentialId], ...updates };
      await saveAll(map);
    }
  }

  async clear(): Promise<void> {
    await AsyncStorage.removeItem(CREDENTIALS_KEY);
  }

  async saveSession(session: StoredSession): Promise<void> {
    await AsyncStorage.setItem(SESSION_KEY, JSON.stringify(session));
  }

  async getSession(): Promise<StoredSession | null> {
    const json = await AsyncStorage.getItem(SESSION_KEY);
    return json ? JSON.parse(json) : null;
  }

  async clearSession(): Promise<void> {
    await AsyncStorage.removeItem(SESSION_KEY);
  }
}
