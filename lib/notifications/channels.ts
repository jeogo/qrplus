let bc: BroadcastChannel | null = null
export function initBroadcast(){ if(typeof window==='undefined') return; try { bc=new BroadcastChannel('notifications-sync') } catch { bc=null } }
export function postBroadcast(e:any){ try { bc?.postMessage(e) } catch {} }
export function closeBroadcast(){ try { bc?.close() } catch {}; bc=null }
