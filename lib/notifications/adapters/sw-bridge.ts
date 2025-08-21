import { notify } from "../facade";

// Bridge for messages coming from the service worker via BroadcastChannel
const CHANNEL_NAME = "sw:notifications";
let initialized = false;
export function initServiceWorkerBridge() {
  if (typeof window === "undefined" || initialized) return;
  initialized = true;
  try {
    const bc = new BroadcastChannel(CHANNEL_NAME);
    bc.addEventListener("message", (event) => {
      const data = event.data;
      if (!data || typeof data !== "object") return;
      if (data.type && typeof data.type === "string") {
  // meta غير معرفة في NotifyInput حالياً؛ إذا احتجناها لاحقاً نعدل الواجهة
  notify({ type: data.type as any, data: data.data });
      }
    });
  } catch {
    /* ignore */
  }
}
