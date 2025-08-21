const map = new Map<string, number>()
export function shouldDedupe(key:string, windowMs:number|undefined){ if(!windowMs||windowMs<=0) return false; const now=Date.now(); const last=map.get(key)||0; if(now-last<windowMs) return true; map.set(key, now); return false }
export function clearDedupe(){ map.clear() }
