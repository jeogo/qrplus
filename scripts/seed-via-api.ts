/*
 Seed demo data using public API endpoints instead of direct Firestore admin access.
 Steps:
 1. Register admin (if username already exists falls back to login)
 2. Create tables (idempotent)
 3. Upsert categories (skip if exists)
 4. Upsert products (skip if product with same name already exists for account)
 5. Create staff users (waiter & kitchen) if missing
 6. (Optional) Create sample orders referencing created products

 Usage (ensure dev server running on localhost:3000):
   SEED_BASE_URL=http://localhost:3000 SEED_ADMIN_USERNAME=demoAdmin SEED_ADMIN_PASSWORD=password123 npx ts-node --transpile-only scripts/seed-via-api.ts

 Or via npm script (after adding to package.json):
   npm run seed:api

 Env Vars:
   SEED_BASE_URL          Base URL (default http://localhost:3000)
   SEED_ADMIN_USERNAME    Admin username (default demoAdmin)
   SEED_ADMIN_PASSWORD    Admin password (default password123)
   SEED_RESTAURANT_NAME   Restaurant name (default "Restaurant Algérien Démo")
  SEED_LANGUAGE          Default language (fr|ar) default fr
  SEED_REMOTE_IMAGES     1 to use remote Unsplash images (default 1) else uses /placeholder.jpg
  SEED_CREATE_ORDERS     1 to create sample orders (default 1) set 0 to skip
  SEED_LOGOUT_AFTER      1 to logout after seeding (default 1) set 0 to keep session

 NOTE: Endpoint paths derived from current codebase. Staff creation endpoint path is /api/admin/users (file name) though comments reference staff_users.
 Image sources (if SEED_REMOTE_IMAGES=1) use Unsplash public URLs (license allows free usage). For production replace with your own hosted images / CDN.
*/

interface FetchOpts { method?: string; path: string; body?: any }

class CookieJar {
  private jar: Record<string,string> = {}
  absorb(setCookieHeaders: string[]|undefined){
    if(!setCookieHeaders) return
    for(const h of setCookieHeaders){
      const part = h.split(';')[0]
      const eq = part.indexOf('=')
      if(eq>0){
        const name = part.slice(0,eq).trim()
        const value = part.slice(eq+1).trim()
        if(value) this.jar[name]=value
      }
    }
  }
  header(): string | undefined { const entries = Object.entries(this.jar); return entries.length? entries.map(([k,v])=>`${k}=${v}`).join('; '): undefined }
}

const jar = new CookieJar()
const base = process.env.SEED_BASE_URL || 'http://localhost:3000'
// Safety: enforce localhost or https unless explicitly allowed
if(!/^https:\/\//.test(base) && !/localhost|127\.0\.0\.1/.test(base)){
  if(!process.env.ALLOW_UNSAFE_SEED){
    console.error('Refusing to run seeder against non-HTTPS non-localhost base URL:', base, '\nSet ALLOW_UNSAFE_SEED=1 to override (NOT recommended for production).')
    process.exit(2)
  }
}
const adminUser = process.env.SEED_ADMIN_USERNAME || 'demoAdmin'
const adminPass = process.env.SEED_ADMIN_PASSWORD || 'password123'
const restaurantName = process.env.SEED_RESTAURANT_NAME || 'Restaurant Algérien Démo'
const language = (process.env.SEED_LANGUAGE === 'ar' ? 'ar' : 'fr')

async function api<T=any>({ method='GET', path, body }: FetchOpts): Promise<T>{
  const res = await fetch(base + path, {
    method,
    headers: {
      'Content-Type':'application/json',
      ...(jar.header()? { 'Cookie': jar.header() }: {})
    },
    body: body? JSON.stringify(body): undefined,
  })
  jar.absorb(res.headers.getSetCookie?.())
  if(!res.ok){
    let txt = await res.text().catch(()=> '')
    throw new Error(`${method} ${path} ${res.status} ${res.statusText} ${txt}`)
  }
  const json = await res.json().catch(()=> ({}))
  return json as T
}

async function ensureAdminAuth(){
  try {
    console.log('Registering admin...')
    await api({ method:'POST', path:'/api/auth/register', body:{ username: adminUser, restaurant_name: restaurantName, password: adminPass, language } })
    console.log('Admin registered.')
  } catch (e:any){
    if(/409/.test(String(e.message)) || /exists/i.test(String(e.message))){
      console.log('Admin exists, attempting login...')
      await api({ method:'POST', path:'/api/auth/login', body:{ email: adminUser, password: adminPass } })
      console.log('Logged in as existing admin.')
    } else {
      throw e
    }
  }
}

async function createTables(){
  console.log('Ensuring tables (1..3)...')
  // Fetch existing
  let existing: number[] = []
  try {
    const resp = await api<{ success:boolean; data:{ table_number:number }[] }>({ path:'/api/tables' })
    existing = resp.data.map(t=> t.table_number)
  } catch {/* ignore */}
  for(let i=1;i<=3;i++){
    if(existing.includes(i)) continue
    try { await api({ method:'POST', path:'/api/tables', body:{ table_number:i } }) } catch(e:any){ if(!/409/.test(String(e.message))) console.warn('Table',i,'skip:', e.message) }
  }
}

const REMOTE = process.env.SEED_REMOTE_IMAGES !== '0'
const IMG = REMOTE ? {
  plats: 'https://images.unsplash.com/photo-1606491956689-2f03e33d19b3?w=800&auto=format&fit=crop', // couscous
  grill: 'https://images.unsplash.com/photo-1550304943-4f24f54ddde9?w=800&auto=format&fit=crop', // brochettes
  drinks: 'https://images.unsplash.com/photo-1613470200078-6e1469d68d1b?w=800&auto=format&fit=crop', // mint tea
  desserts: 'https://images.unsplash.com/photo-1627308595187-4f936a1dc4e0?w=800&auto=format&fit=crop', // sweets
  couscous: 'https://images.unsplash.com/photo-1606491956689-2f03e33d19b3?w=800&auto=format&fit=crop',
  chakhchoukha: 'https://images.unsplash.com/photo-1604909052743-1764827d7b0d?w=800&auto=format&fit=crop',
  tajine: 'https://images.unsplash.com/photo-1604908554168-0162ab1801d1?w=800&auto=format&fit=crop',
  brochette: 'https://images.unsplash.com/photo-1550304943-4f24f54ddde9?w=800&auto=format&fit=crop',
  agneau: 'https://images.unsplash.com/photo-1604908177453-7460b6436e24?w=800&auto=format&fit=crop',
  the: 'https://images.unsplash.com/photo-1613470200078-6e1469d68d1b?w=800&auto=format&fit=crop',
  jus: 'https://images.unsplash.com/photo-1576402187878-974f70c890a5?w=800&auto=format&fit=crop',
  makroud: 'https://images.unsplash.com/photo-1604908177225-d248dcc4c668?w=800&auto=format&fit=crop',
  baklawa: 'https://images.unsplash.com/photo-1627308595187-4f936a1dc4e0?w=800&auto=format&fit=crop'
} : {} as Record<string,string>

const fallbackImg = '/placeholder.jpg'

const categoryDefs = [
  { name:'Plats Traditionnels', image_url: IMG.plats || fallbackImg, description:'Cuisine algérienne authentique' },
  { name:'Grillades', image_url: IMG.grill || fallbackImg, description:'Viandes grillées' },
  { name:'Boissons', image_url: IMG.drinks || fallbackImg, description:'Froides & chaudes' },
  { name:'Desserts', image_url: IMG.desserts || fallbackImg, description:'Douceurs locales' },
]

async function createCategoriesAndProducts(){
  console.log('Upserting categories & products...')
  // Fetch existing categories first for idempotency
  let existingCats: { id:number; name:string }[] = []
  try {
    const catResp = await api<{ success:boolean; data:{ id:number; name:string }[] }>({ path:'/api/categories' })
    existingCats = catResp.data.map(c=> ({ id:c.id, name:c.name }))
  } catch {/* ignore */}
  const nameToId = new Map(existingCats.map(c=> [c.name, c.id]))
  for(const c of categoryDefs){
    if(!nameToId.has(c.name)){
      try {
        const resp = await api<{ success:boolean; data:{ id:number } }>({ method:'POST', path:'/api/categories', body:c })
        nameToId.set(c.name, resp.data.id)
      } catch(e:any){ console.warn('Category create skip', c.name, e.message) }
    }
  }
  // Products (skip if name already exists)
  let existingProducts: { id:number; name:string }[] = []
  try {
    const prodResp = await api<{ success:boolean; data:{ id:number; name:string }[] }>({ path:'/api/products' })
    existingProducts = prodResp.data.map(p=> ({ id:p.id, name:p.name }))
  } catch {/* ignore */}
  const existingNames = new Set(existingProducts.map(p=> p.name))
  const products = [
    { cat:'Plats Traditionnels', name:'Couscous Royal', price:1500, description:'Couscous aux légumes et viande', image_url: IMG.couscous || fallbackImg },
    { cat:'Plats Traditionnels', name:'Chakhchoukha', price:1300, description:'Plat traditionnel constantinois', image_url: IMG.chakhchoukha || fallbackImg },
    { cat:'Plats Traditionnels', name:'Tajine Zitoun', price:1200, description:'Poulet aux olives', image_url: IMG.tajine || fallbackImg },
    { cat:'Grillades', name:'Brochettes de Poulet', price:1100, description:'Brochettes marinées', image_url: IMG.brochette || fallbackImg },
    { cat:'Grillades', name:'Côtelette d\'Agneau', price:1800, description:'Côtelettes grillées', image_url: IMG.agneau || fallbackImg },
    { cat:'Boissons', name:'Thé à la Menthe', price:300, description:'Thé vert fraîcheur', image_url: IMG.the || fallbackImg },
    { cat:'Boissons', name:'Jus d\'Orange Frais', price:500, description:'Pressé du jour', image_url: IMG.jus || fallbackImg },
    { cat:'Desserts', name:'Makroud', price:400, description:'Gâteau de semoule dattes', image_url: IMG.makroud || fallbackImg },
    { cat:'Desserts', name:'Baklawa', price:600, description:'Pâtisserie aux fruits secs', image_url: IMG.baklawa || fallbackImg },
  ]
  for(const p of products){
    if(existingNames.has(p.name)) continue
    const category_id = nameToId.get(p.cat)
    if(!category_id){ console.warn('Missing category for product', p.name); continue }
    try { await api({ method:'POST', path:'/api/products', body:{ category_id, name:p.name, price:p.price, image_url:p.image_url, description:p.description } }) }
    catch(e:any){ console.warn('Product create skip', p.name, e.message) }
  }
}

async function createStaff(){
  console.log('Creating staff users...')
  const staff = [
    { username:'garçon1', password:'pass123', role:'waiter' },
    { username:'cuisine1', password:'pass123', role:'kitchen' },
  ]
  for(const s of staff){
    try {
      await api({ method:'POST', path:'/api/admin/users', body:{ username:s.username, password:s.password, role:s.role } })
    } catch(e:any){ console.warn('Staff skip', s.username, e.message) }
  }
}

async function createSampleOrders(){
  if(process.env.SEED_CREATE_ORDERS === '0') return
  console.log('Creating sample orders...')
  // Need product ids
  let prods: { id:number; name:string }[] = []
  try {
    const resp = await api<{ success:boolean; data:{ id:number; name:string }[] }>({ path:'/api/products' })
    prods = resp.data
  } catch(e:any){ console.warn('Cannot fetch products for orders', e.message); return }
  if(prods.length === 0) return
  let tables: { id:number; table_number:number }[] = []
  try {
    const tResp = await api<{ success:boolean; data:{ id:number; table_number:number }[] }>({ path:'/api/tables' })
    tables = tResp.data
  } catch {/* ignore */}
  const pickRandomItems = ()=> {
    const count = Math.min(3, Math.max(1, Math.round(Math.random()*3)))
    const shuffled = [...prods].sort(()=> Math.random()-0.5).slice(0,count)
    return shuffled.map(p=> ({ product_id:p.id, quantity: 1 + Math.floor(Math.random()*2) }))
  }
  for(const t of tables.slice(0,3)){
    try { await api({ method:'POST', path:'/api/orders', body:{ table_id: t.id, items: pickRandomItems() } }) }
    catch(e:any){ console.warn('Order create skip (table', t.id, '):', e.message) }
  }
}

async function summary(){
  try {
    const cats = await api<{ success:boolean; data:any[] }>({ path:'/api/categories' })
    const prods = await api<{ success:boolean; data:any[] }>({ path:'/api/products' })
    console.log('Summary: categories=', cats.data.length, 'products=', prods.data.length)
  } catch(e:any){ console.warn('Summary fetch failed', e.message) }
}

async function logout(){
  try { await api({ method:'POST', path:'/api/auth/logout' }) } catch { /* ignore */ }
}

async function run(){
  console.log('Seeding via API at', base)
  await ensureAdminAuth()
  await createTables()
  await createCategoriesAndProducts()
  await createStaff()
  await createSampleOrders()
  await summary()
  if(process.env.SEED_LOGOUT_AFTER !== '0'){
    await logout()
    console.log('Logged out (cookie cleared client-side).')
  }
  console.log('Seed via API done.')
}

run().catch(e=>{ console.error('Seed failed:', e); process.exit(1) })
