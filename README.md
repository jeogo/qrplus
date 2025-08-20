# QRPlus V3

A modern multi-role restaurant ordering platform built with Next.js 14 (App Router) + TypeScript, Firestore (real-time via SSE), Tailwind CSS, and a modular UI component system (Radix + custom design tokens). Supports roles: Admin, Kitchen, Waiter, and Public (table menu) with live order streaming and daily order numbering.

## ✨ Core Features
- Real-time orders stream (Server-Sent Events) with role-based filtering (admin: all, kitchen: approved, waiter: ready)
- Daily sequential order numbering reset every day (daily_number) in addition to global order ID
- Batch order details endpoint to eliminate N+1 queries for order items
- Audio alerts with user preferences for kitchen and waiter roles
- Push notifications (FCM) across full order lifecycle (new, approved, ready, served, cancelled) with per-role localization
- Privacy-aware client push: customer devices receive anonymized titles (no order numbers) and deep-link to their table page
- Authentication (session endpoint cached client-side) & role-based UI routing
- Public menu view via nested path `/menu/[restaurantId]/[tableId]` (premium modern UI, responsive, RTL-aware, optimized images)
- Upload signing endpoint (dynamic) for media (Cloudinary integration)
- Theming (dark/light) via CSS variables + `next-themes`
- Complete bilingual support (Arabic RTL & French)
- Component library: Buttons, Dialogs, Menus, Toasts, Cards, Tables, Tabs, Toggles, Inputs (lean: removed unused form & chart libs)

## 🧱 Tech Stack
| Layer | Technology |
|-------|------------|
| Framework | Next.js 14 App Router (React 18) |
| Language | TypeScript |
| Styling | Tailwind CSS + custom CSS vars (design tokens) |
| UI Primitives | Radix UI + shadcn-inspired wrappers |
| Forms & Validation | Basic native handling (planned schema lib) |
| Real-time | SSE (custom endpoint) over Firestore change events |
| Database | Firestore (firebase + firebase-admin) |
| Auth | Custom (JWT / session cookie)* |
| Images / Uploads | Cloudinary (signed upload API) |
| Charts | (Planned) |
| Misc | lucide-react icons |

*Implementation details may evolve; session optimization reduces redundant `/api/auth/me` requests.

## 📁 Project Structure (Key Paths)
```
app/
  layout.tsx                # Root layout with AuthProvider
  page.tsx                  # Landing / root page
  admin/                    # Admin section (analytics, dashboard, menu, orders, settings, tables, users)
  kitchen/                  # Kitchen dashboard with audio alerts
  waiter/                   # Waiter dashboard with audio alerts
  auth/                     # Auth (login/register UI)
  menu/[restaurantId]/[tableId]/ # Public menu & order status (nested identifiers)
  api/                      # REST & streaming endpoints
    orders/                 # CRUD + batch details
    public/                 # Public (no auth) menu + orders stream
    stream/orders           # SSE stream (private roles)
    uploads/sign            # Dynamic upload signing (cookies used)
components/
  ui/                       # Reusable UI primitives (Radix wrappers)
  admin-*.tsx              # Admin-specific components
  system-*.tsx             # System status components
hooks/                      # Custom hooks (mobile, session, orders stream, etc.)
lib/                        # Utility libs (auth, i18n, order tracking, etc.)
  i18n/                     # Bilingual text resources (Arabic/French)
  firebase/                 # Firebase client & admin SDK helpers
  auth/                     # JWT authentication utilities
  orders/                   # Order processing utilities
public/                     # Static assets & PWA (manifest, sw.js, images)
styles/                     # Global styles
types/                      # TypeScript definitions
```

## 🎵 Audio Alerts System
- Kitchen & Waiter dashboards include configurable audio alerts
- Audio notifications for new orders (kitchen) and ready orders (waiter)
- User-controlled volume and enable/disable toggle
- Fallback handling for missing audio files
- Uses HTML5 Audio API with error handling

## 🌐 Bilingual Support
- Complete Arabic (RTL) and French language support
- Dedicated translation files in `lib/i18n/` for each page/role
- Dynamic text direction handling
- Role-specific translations for optimal UX
- Consistent bilingual interface across all user roles

## 🧾 Order Numbering
- `daily_number`: Incrementing counter reset per UTC day (or business day) via transactional Firestore increment
- Displayed on kitchen, waiter, and admin UI for easier referencing than full ID
- Separate from primary order document ID

## 🚀 Development
Prerequisites:
- Node.js >= 18.18
- Firebase project (Firestore + service account for admin SDK)
- Cloudinary credentials (if enabling uploads)

Install & Run:
```bash
npm install
npm run dev
```
Production Build:
```bash
npm run build
npm start
```
Type Check & Lint:
```bash
npm run type-check
npm run lint
```

## 🔐 Environment Variables (Expected)
(Define these in `.env.local` – names indicative; adjust to actual implementation.)
```
FIREBASE_PROJECT_ID=
FIREBASE_PRIVATE_KEY=        # multiline key with proper escaping
FIREBASE_CLIENT_EMAIL=
NEXT_PUBLIC_FIREBASE_API_KEY=
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=
NEXT_PUBLIC_FIREBASE_PROJECT_ID=
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=
NEXT_PUBLIC_FIREBASE_APP_ID=
JWT_SECRET=
CLOUDINARY_CLOUD_NAME=
CLOUDINARY_API_KEY=
CLOUDINARY_API_SECRET=
```

## 🧪 Testing (Planned)
Planned test coverage includes:
- Concurrency: daily_number transactional increments (no duplicates)
- SSE resilience: auto-reconnect & duplicate suppression
- Audio alerts: user preferences & role-based triggers
- Batch endpoint correctness: items aggregation & performance
- Bilingual text rendering and RTL layout support

## 🛠 API Overview (Selected)
| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/api/orders` | GET/POST | List or create orders |
| `/api/orders/[id]` | GET/PATCH | Fetch or update a single order |
| `/api/orders/details-batch` | POST | Batch fetch order items/details |
| `/api/stream/orders` | GET (SSE) | Private real-time order events |
| `/api/public/orders/stream` | GET (SSE) | Public stream (limited scope) |
| `/api/public/menu/[restaurantId]/[tableId]/categories` | GET | Active categories with available products |
| `/api/public/menu/[restaurantId]/[tableId]/products?category_id=` | GET | Products in a category (available only) |
| `/api/public/menu/[restaurantId]/[tableId]/meta` | GET | Restaurant/table public metadata |
| `/api/public/menu/[restaurantId]/[tableId]/orders` | POST | Create a new public order |
| `/api/uploads/sign` | POST | Cloudinary upload signature (dynamic) |
| `/api/auth/login` | POST | Authenticate user |
| `/api/auth/me` | GET | Session validation (cached client-side) |

## 🎨 Theming
- CSS variables defined via `:root` and dark mode with `class` strategy
- Tailwind config maps semantic tokens (e.g., `--primary`, `--card`)
- Supports quick theming and potential future brand customization

## 📡 Real-Time Architecture
1. Firestore change listener (server) transforms order events to lightweight payload
2. SSE endpoint streams events to connected clients with role-based filtering
3. Client hooks subscribe and filter events → triggers audio alerts & state updates
4. UI re-renders order lists (kitchen, waiter, admin pages)
5. RTDB mirror provides immediate updates for public menu order tracking
6. Automatic reconnection with exponential backoff for resilient connections

## 🧹 Recent Maintenance / Refactors
- Reintroduced & upgraded web push notifications (FCM) with foreground + background handling
- Added client (public visitor) push token registration & table-scoped filtering
- Privacy: Order numbers hidden from public UI & client push messages
- Consolidated SSE streaming with role-based filtering
- Introduced batch details endpoint removing N+1 fetch patterns
- Added daily_number logic across complete order lifecycle
- Enhanced bilingual support with comprehensive i18n structure
- Improved error handling and loading states across all roles
- Modernized public menu UI (animated grids, skeletons, responsive modals, audio toggle, note field)

## 🔭 Roadmap / Next Steps
- Sentry integration (errors, traces, performance spans for order lifecycle & SSE & push)
- Shared OrderCard / StatusBadge components to reduce code duplication
- Server-side caching / ISR for relatively static reference data (categories, products)
- BroadcastChannel cross-tab sync for session state and system status / notification dedupe
- Granular push preference UI per status & role
- Cloudinary on-the-fly transformations (f_auto,q_auto) for further LCP improvements
- Enhanced analytics with order trends and performance metrics
- Automated test suite execution in CI/CD pipeline

## ⚠️ Build Notes
- `next.config.mjs` currently ignores type & ESLint errors during build (adjust for stricter CI)
- `/api/uploads/sign` flagged dynamic (uses cookies) – expected
- Images unoptimized mode for simpler deployment (consider enabling Next Image Optimization later)

## 📄 License
Specify a license (MIT, Apache-2.0, etc.) – currently not declared.

## 🤝 Contributing
1. Fork & clone
2. Create feature branch
3. Ensure type check & lint pass
4. Submit PR with clear description & screenshots if UI change

## 🙋 Support / Questions
Open an issue or contact the maintainer.

# QRPlus V3 - نظام إدارة المطاعم الذكي

## الملخص بالعربية

نظام QRPlus V3 هو حل شامل وحديث لإدارة المطاعم مبني بأحدث التقنيات. يوفر النظام إدارة متكاملة للطلبات والقوائم مع دعم كامل للغة العربية والفرنسية.

### 🏆 المميزات الرئيسية:
- **إدارة متعددة الأدوار**: مدير، مطبخ، نادل، عملاء
- **البث المباشر**: تحديثات فورية للطلبات عبر SSE
- **إشعارات فورية**: دعم كامل للتنبيهات (طلب جديد، اعتماد، جاهز، تقديم، إلغاء) مع تخصيص حسب الدور واللغة
- **الترقيم اليومي**: أرقام طلبات يومية منطقية (مخفي للعملاء لحماية الخصوصية)
- **الإشعارات الصوتية**: تنبيهات صوتية قابلة للتحكم للمطبخ والندل
- **واجهة ثنائية اللغة**: دعم كامل للعربية (RTL) والفرنسية
- **قائمة رقمية حديثة**: تصميم عصري سريع الاستجابة لكل طاولة مع تجربة مستخدم مميزة
- **لوحة تحكم شاملة**: إحصائيات وتحليلات مفصلة

### 📊 تدفق العمل:
1. **العميل**: يمسح QR Code ويطلب من القائمة الرقمية
2. **المطبخ**: يستقبل الطلبات المعتمدة مع إنذار صوتي
3. **النادل**: يستلم الطلبات الجاهزة ويقدمها للعملاء
4. **المدير**: يراقب العمليات ويدير النظام بالكامل

### 🛠️ التقنيات المستخدمة:
- **Next.js 14** مع TypeScript للأداء الأمثل
- **Firebase Firestore** للبيانات المباشرة
- **Tailwind CSS + Radix UI** للتصميم الحديث
- **JWT Authentication** للأمان المتقدم
- **PWA Ready** مع Service Worker

### 🌟 مزايا خاصة:
- تصميم متجاوب لجميع الأجهزة
- نظام ألوان قابل للتخصيص
- رفع الصور الآمن مع Cloudinary
- خصوصية العملاء: عدم إظهار رقم الطلب في واجهة الزبون أو تنبيهاتهم
- توجيه ذكي للإشعارات: العميل ينتقل مباشرة لصفحة طاولته عند النقر
- تحليلات متقدمة ولوحات بيانية
- حماية شاملة للمسارات والبيانات

---

Generated on 2025-08-17.
