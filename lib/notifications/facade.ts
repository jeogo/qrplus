import { NOTIFICATION_TYPES, NotificationType, NotificationDefinition } from './registry'
import { shouldDedupe } from './dedupe'
import { playSound } from './sound'
import { loadUnifiedPrefs } from './preferences'
import { showToast } from './adapters/sonner'

export interface NotifyInput<T extends NotificationType = NotificationType>{ type:T; data?: any; dedupeKey?: string; override?: Partial<Pick<ResolvedNotification,'message'|'severity'|'sticky'>> }
export interface ResolvedNotificationMeta { dedupeKey?: string; dedupeMs?:number; source?:string }
export interface ResolvedNotification { type:NotificationType; message:string; severity:NotificationDefinition['severity']; category:NotificationDefinition['category']; sticky?:boolean; sound?:boolean; meta?:ResolvedNotificationMeta; data?:any }

let telemetryCb: ((n:ResolvedNotification)=>void)|undefined
export function configureNotifications(opts:{ telemetry?:(n:ResolvedNotification)=>void }={}){ telemetryCb=opts.telemetry }

function currentLanguage(){ if(typeof window==='undefined') return 'ar'; try { return localStorage.getItem('language')||'ar' } catch { return 'ar' } }

export function notify<T extends NotificationType>(input: NotifyInput<T>): ResolvedNotification | undefined {
	const def = NOTIFICATION_TYPES[input.type] as NotificationDefinition & { en?: (p?:any)=>string };
	if(!def){ console.warn('[notify] unknown type', input.type); return }
	const prefs=loadUnifiedPrefs();
	if(!prefs.categories[def.category as keyof typeof prefs.categories]) return;
	const data=input.data;
	const lang=currentLanguage();
	const baseMsg = lang==='fr'? def.fr(data): (lang==='en' && typeof def.en==='function'? def.en(data): def.ar(data));
	const msg = input.override?.message || baseMsg;
	const severity = input.override?.severity || def.severity;
		const defAny = def as NotificationDefinition; // widen for optional fields
		const sticky = input.override?.sticky ?? defAny.sticky;
		const soundEnabled = !!defAny.sound && prefs.sound.enabled;
	const dedupeMs = def.dedupeWindowMs;
	const dedupeKey = input.dedupeKey || (dedupeMs? `${input.type}:${msg}`: undefined);
	if(dedupeKey && dedupeMs && shouldDedupe(dedupeKey, dedupeMs)) return;
	const resolved: ResolvedNotification = { type: input.type, message: msg, severity, category:def.category, sticky, sound:soundEnabled, meta:{ dedupeKey, dedupeMs, source:'app' }, data };
	if(soundEnabled) playSound();
	showToast({ message: msg, severity, sticky });
	telemetryCb?.(resolved);
	return resolved;
}
