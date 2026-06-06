const storeNameByUserId = new Map<string, string | null>();
const loadPromiseByUserId = new Map<string, Promise<string | null>>();

type FetchStoreName = () => Promise<string | null>;

let fetchStoreNameImpl: FetchStoreName | null = null;

export function registerVendorStoreNameFetcher(fetcher: FetchStoreName) {
  fetchStoreNameImpl = fetcher;
}

export async function loadVendorStoreNameForUser(userId: string): Promise<string | null> {
  if (storeNameByUserId.has(userId)) {
    return storeNameByUserId.get(userId) ?? null;
  }

  let promise = loadPromiseByUserId.get(userId);
  if (!promise) {
    promise = fetchStoreNameImpl?.() ?? Promise.resolve(null);
    loadPromiseByUserId.set(userId, promise);
  }

  const name = await promise;
  storeNameByUserId.set(userId, name);
  loadPromiseByUserId.delete(userId);
  return name;
}

export function clearVendorStoreNameCacheForUser(userId: string) {
  storeNameByUserId.delete(userId);
  loadPromiseByUserId.delete(userId);
}

export function invalidateVendorStoreNameCache() {
  storeNameByUserId.clear();
  loadPromiseByUserId.clear();
  if (typeof window !== "undefined") {
    window.dispatchEvent(new Event("vendor-store-name-changed"));
  }
}
