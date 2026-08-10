const storeProfileByUserId = new Map<
  string,
  { storeName: string | null; storeSlug: string | null }
>();
const loadPromiseByUserId = new Map<
  string,
  Promise<{ storeName: string | null; storeSlug: string | null }>
>();

type FetchStoreProfile = () => Promise<{
  storeName: string | null;
  storeSlug: string | null;
}>;

let fetchStoreProfileImpl: FetchStoreProfile | null = null;

export function registerVendorStoreNameFetcher(fetcher: FetchStoreProfile) {
  fetchStoreProfileImpl = fetcher;
}

export async function loadVendorStoreProfileForUser(userId: string): Promise<{
  storeName: string | null;
  storeSlug: string | null;
}> {
  if (storeProfileByUserId.has(userId)) {
    return storeProfileByUserId.get(userId) ?? { storeName: null, storeSlug: null };
  }

  let promise = loadPromiseByUserId.get(userId);
  if (!promise) {
    promise = fetchStoreProfileImpl?.() ?? Promise.resolve({ storeName: null, storeSlug: null });
    loadPromiseByUserId.set(userId, promise);
  }

  const profile = await promise;
  storeProfileByUserId.set(userId, profile);
  loadPromiseByUserId.delete(userId);
  return profile;
}

export async function loadVendorStoreNameForUser(userId: string): Promise<string | null> {
  const profile = await loadVendorStoreProfileForUser(userId);
  return profile.storeName;
}

export function clearVendorStoreNameCacheForUser(userId: string) {
  storeProfileByUserId.delete(userId);
  loadPromiseByUserId.delete(userId);
}

export function invalidateVendorStoreNameCache() {
  storeProfileByUserId.clear();
  loadPromiseByUserId.clear();
  if (typeof window !== "undefined") {
    window.dispatchEvent(new Event("vendor-store-name-changed"));
  }
}
