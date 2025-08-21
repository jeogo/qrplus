import { loadUnifiedPrefs } from '../preferences'
import type { NotificationSeverity } from '../registry'
import { toast } from 'sonner'
interface ShowToastOptions { message:string; severity:NotificationSeverity; sticky?:boolean; duration?:number }
export function showToast(opts: ShowToastOptions){ const prefs=loadUnifiedPrefs(); if(!prefs.ui.enableToasts) return; const base={ duration: opts.sticky? Infinity: (opts.duration||prefs.ui.durationMs) }; switch(opts.severity){ case 'success': return toast.success(opts.message, base); case 'error': return toast.error(opts.message, base); case 'warning': return (toast as any).warning? (toast as any).warning(opts.message, base): toast(opts.message, base); case 'loading': return (toast as any).loading? (toast as any).loading(opts.message, base): toast(opts.message, base); default: return (toast as any).info? (toast as any).info(opts.message, base): toast(opts.message, base) } }
