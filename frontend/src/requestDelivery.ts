export type DeliveryReceipt = { fingerprint: string; result: Record<string, unknown> | null; error: string };
export type DeliveryCache = { current: DeliveryReceipt | null };

// Retain the upstream receipt if the dashboard save needs a retry.
export async function externalReceipt(fingerprint: string, send: () => Promise<Record<string, unknown>>, cache: DeliveryCache): Promise<DeliveryReceipt> {
  if (cache.current?.fingerprint === fingerprint) return cache.current;
  try { cache.current = { fingerprint, result: await send(), error: '' }; }
  catch (cause) { cache.current = { fingerprint, result: null, error: cause instanceof Error ? cause.message : 'تعذر الاتصال بالنظام الخارجي.' }; }
  return cache.current;
}
