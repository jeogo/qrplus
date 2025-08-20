/*
 Seed script: creates an admin account (if none), Algerian restaurant sample data:
 - Admin user (if not existing username)
 - 2 staff users: waiter & kitchen
 - 3 tables
 - 4 categories (Arabic / French hybrid names for Algeria context)
 - Products per category with Algerian DZD prices and placeholder images

 Run with: npx ts-node scripts/seed-demo-data.ts  (or build a one-off npm script)
 Requires Firebase Admin initialized (uses existing admin config in project).
*/

import admin from '@/lib/firebase/admin'
import bcrypt from 'bcryptjs'
import { nextSequence } from '@/lib/firebase/sequences'

async function ensureAdmin(username: string, password: string, restaurantName: string){
  const db = admin.firestore()
  const usernameLower = username.toLowerCase()
  const userSnap = await db.collection('users').where('username_lower','==',usernameLower).limit(1).get()
  if(!userSnap.empty){
    const data = userSnap.docs[0].data()
    return { accountId: data.account_id as number, adminUserId: data.id as number }
  }
  const now = new Date().toISOString()
  const accountId = await nextSequence('accounts')
  const userId = await nextSequence('users')
  const systemSettingId = await nextSequence('system_settings')
  const email = `${usernameLower}@demo.local`
  const hash = await bcrypt.hash(password,10)
  await db.collection('accounts').doc(String(accountId)).set({ id:accountId, name:restaurantName, email, start_date:now, end_date:now, active:true, created_at:now, updated_at:now })
  await db.collection('system_settings').doc(String(systemSettingId)).set({ id:systemSettingId, account_id:accountId, logo_url:'', language:'fr', currency:'DZD', tax:0, created_at:now, updated_at:now })
  await db.collection('users').doc(`seed-${userId}`).set({ id:userId, account_id:accountId, username, username_lower:usernameLower, email, password:hash, role:'admin', created_at:now, updated_at:now })
  return { accountId, adminUserId: userId }
}

async function createStaff(accountId:number){
  const db = admin.firestore()
  const now = new Date().toISOString()
  const defs: { username:string; role:'waiter'|'kitchen'; password:string; perms?:Partial<{approve_orders:boolean; serve_orders:boolean; make_ready:boolean}> }[] = [
    { username:'garçon1', role:'waiter', password:'pass123', perms:{ serve_orders:true } },
    { username:'cuisine1', role:'kitchen', password:'pass123', perms:{ make_ready:true } },
  ]
  for(const def of defs){
    const lower = def.username.toLowerCase()
    const dup = await db.collection('staff_users').where('account_id','==',accountId).where('username_lower','==',lower).limit(1).get()
    if(!dup.empty) continue
    const id = await nextSequence('staff_users')
    const hash = await bcrypt.hash(def.password,10)
    await db.collection('staff_users').doc(String(id)).set({
      id,
      account_id: accountId,
      username: def.username,
      username_lower: lower,
      password: hash,
      role: def.role,
      permissions: {
        approve_orders: false,
        serve_orders: def.role==='waiter',
        make_ready: def.role==='kitchen'
      },
      active: true,
      created_at: now,
      updated_at: now
    })
  }
}

async function createTables(accountId:number){
  const db = admin.firestore()
  const existing = await db.collection('tables').where('account_id','==',accountId).get()
  if(!existing.empty) return
  const now = new Date().toISOString()
  for(let i=1;i<=3;i++){
    const id = await nextSequence('tables')
    const qr_code = `https://demo.local/menu/${accountId}/${id}`
    await db.collection('tables').doc(String(id)).set({ id, account_id:accountId, table_number:i, qr_code, created_at:now, updated_at:now })
  }
}

async function createMenu(accountId:number){
  const db = admin.firestore()
  const catSnap = await db.collection('categories').where('account_id','==',accountId).limit(1).get()
  if(!catSnap.empty) return
  const now = new Date().toISOString()
  const categories = [
    { name:'Plats Traditionnels', image_url:'/placeholder.jpg', description:'Cuisine algérienne authentique' },
    { name:'Grillades', image_url:'/placeholder.jpg', description:'Viandes grillées' },
    { name:'Boissons', image_url:'/placeholder.jpg', description:'Froides & chaudes' },
    { name:'Desserts', image_url:'/placeholder.jpg', description:'Douceurs locales' }
  ]
  const products: { category:string; name:string; price:number; image_url?:string; description?:string }[] = [
    { category:'Plats Traditionnels', name:'Couscous Royal', price:1500, image_url:'/placeholder.jpg', description:'Couscous aux légumes et viande' },
    { category:'Plats Traditionnels', name:'Chakhchoukha', price:1300, image_url:'/placeholder.jpg', description:'Plat traditionnel constantinois' },
    { category:'Plats Traditionnels', name:'Tajine Zitoun', price:1200, image_url:'/placeholder.jpg', description:'Poulet aux olives' },
    { category:'Grillades', name:'Brochettes de Poulet', price:1100, image_url:'/placeholder.jpg' },
    { category:'Grillades', name:'Côtelette d Agneau', price:1800, image_url:'/placeholder.jpg' },
    { category:'Boissons', name:'Thé à la Menthe', price:300, image_url:'/placeholder.jpg' },
    { category:'Boissons', name:'Jus d Orange Frais', price:500, image_url:'/placeholder.jpg' },
    { category:'Desserts', name:'Makroud', price:400, image_url:'/placeholder.jpg' },
    { category:'Desserts', name:'Baklawa', price:600, image_url:'/placeholder.jpg' }
  ]
  const catIdMap = new Map<string, number>()
  for(const cat of categories){
    const id = await nextSequence('categories')
    await db.collection('categories').doc(String(id)).set({
      id,
      account_id: accountId,
      name: cat.name,
      description: cat.description,
      image_url: cat.image_url,
      active: true,
      created_at: now,
      updated_at: now
    })
    catIdMap.set(cat.name, id)
  }
  for(const p of products){
    const id = await nextSequence('products')
    const category_id = catIdMap.get(p.category)!
    await db.collection('products').doc(String(id)).set({
      id,
      account_id: accountId,
      category_id,
      name: p.name,
      description: p.description || '',
      image_url: p.image_url || '/placeholder.jpg',
      price: p.price,
      available: true,
      created_at: now,
      updated_at: now
    })
  }
}

async function main(){
  const ADMIN_USERNAME = process.env.SEED_ADMIN_USERNAME || 'demoAdmin'
  const ADMIN_PASSWORD = process.env.SEED_ADMIN_PASSWORD || 'password123'
  const RESTAURANT_NAME = process.env.SEED_RESTAURANT_NAME || 'Restaurant Algérien Démo'
  const { accountId } = await ensureAdmin(ADMIN_USERNAME, ADMIN_PASSWORD, RESTAURANT_NAME)
  await createStaff(accountId)
  await createTables(accountId)
  await createMenu(accountId)
  console.log('Seed completed for account', accountId)
}

main().catch(e=>{ console.error(e); process.exit(1) })
