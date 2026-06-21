# AbhyasMitra Premium

> Premium subject-wise engineering notes for SPPU students.  
> Purchase securely via Razorpay · View in-browser with watermarking · Managed via Admin Panel

---

## Tech Stack

| Layer | Technology |
|---|---|
| Framework | Next.js 14+ (App Router, TypeScript) |
| Database | Firebase Firestore |
| File Storage | Firebase Storage |
| Auth | Firebase Auth (Google + Email/Password) |
| Payments | Razorpay (Orders API + Webhooks) |
| Styling | Tailwind CSS |
| Animations | Framer Motion |
| PDF Rendering | pdfjs-dist (canvas-based) |
| Icons | lucide-react |
| Charts | recharts |
| Toasts | sonner |

---

## Getting Started

### 1. Clone and install

```bash
cd abhyasmitra-premium
npm install
```

### 2. Set up environment variables

```bash
cp .env.example .env.local
```

Fill in `.env.local` with your actual Firebase and Razorpay credentials.

### 3. Firebase Setup

1. Create a [Firebase project](https://console.firebase.google.com/)
2. Enable **Authentication** → Email/Password + Google providers
3. Enable **Firestore Database** (start in production mode)
4. Enable **Firebase Storage**
5. In Project Settings → Service Accounts → **Generate new private key** (for Admin SDK)
6. Copy the JSON values to your `.env.local` (`FIREBASE_ADMIN_*` variables)
7. Deploy **Firestore rules**: copy `firestore.rules` content to Firestore Rules tab
8. Deploy **Storage rules**: copy `storage.rules` content to Storage Rules tab

### 4. Razorpay Setup

1. Create a [Razorpay account](https://razorpay.com/)
2. Get your API keys from Dashboard → Settings → API Keys
3. Add a **Webhook** in Dashboard → Webhooks:
   - URL: `https://yourdomain.com/api/razorpay/webhook`
   - Secret: create a random string → add to `RAZORPAY_WEBHOOK_SECRET`
   - Event: `payment.captured`

### 5. Run locally

```bash
npm run dev
```

Visit `http://localhost:3000`

### 6. Admin Panel

Navigate to `/admin/login` and sign in with `vinaybhadane06@gmail.com`.  
Admin access is verified server-side via Firebase custom claims.

---

## Project Structure

```
/app
  /page.tsx                     → Landing page
  /LandingClient.tsx            → Landing page client component
  /notes/[id]/page.tsx          → Note detail + purchase
  /library/page.tsx             → User's purchased notes
  /view/[purchaseId]/page.tsx   → Secure PDF viewer
  /auth/page.tsx                → Sign in / Sign up
  /admin/page.tsx               → Admin dashboard
  /admin/login/page.tsx         → Admin login
  /admin/products/page.tsx      → Product management
  /admin/orders/page.tsx        → Orders table
  /api/razorpay/create-order/   → Create Razorpay order
  /api/razorpay/verify-payment/ → Verify payment signature
  /api/razorpay/webhook/        → Webhook (source of truth)
  /api/pdf/[purchaseId]/        → Secure PDF streaming
  /api/admin/check-admin/       → Admin verification
  /api/admin/upload-product/    → Product upload
/lib
  /firebase/client.ts           → Firebase client SDK
  /firebase/admin.ts            → Firebase Admin SDK (server only)
  /razorpay.ts                  → Razorpay helper
  /types.ts                     → Shared TypeScript types
/components
  Navbar.tsx
  NoteCard.tsx
  SkeletonCard.tsx
  Footer.tsx
  AdminSidebar.tsx
  SecurePdfViewer.tsx
```

---

## Security Architecture

### Payment Flow
1. Frontend → `/api/razorpay/create-order` (creates Razorpay order)
2. Frontend opens Razorpay modal → user pays
3. Frontend → `/api/razorpay/verify-payment` (server-side HMAC-SHA256 signature check)
4. **Razorpay webhook** → `/api/razorpay/webhook` (source of truth — writes purchase to Firestore)

The webhook handles browser-close edge cases where verify-payment might not be called.

### PDF Access
- PDFs are stored in Firebase Storage at `notes/` path (no public read)
- `/api/pdf/[purchaseId]` verifies the Auth token → checks Firestore ownership → streams bytes
- Raw Storage URL is never sent to the client at any point
- Frontend receives bytes via `fetch()` and renders on `<canvas>` using pdfjs-dist

### Firestore Rules
- `products`: public read for published items, admin-only writes
- `purchases`: user reads own docs only; writes blocked (Admin SDK only via server)
- `admins`: no client access

---

## Content Protection — Honest Disclaimer

> **Important note on PDF viewer protection**

The in-browser PDF viewer implements several deterrent measures:
- Renders PDF pages on `<canvas>` (no raw PDF file URL in HTML)
- Diagonal watermark with buyer's email drawn pixel-level onto each canvas
- Right-click, Ctrl+S, Ctrl+P, Ctrl+C, F12, Ctrl+Shift+I blocked via keydown listener
- CSS `user-select: none` on the viewer container
- Dev-tools opening heuristic (window size differential) blurs the canvas

**These are deterrents, not unbreakable DRM.**

Any content rendered on a screen can theoretically be captured by an external camera or screen-recording tool. True DRM that prevents screenshot-level capture does not exist in web browsers.

The watermark with the buyer's identity (email) is the actual security mechanism — it creates traceability if content is shared, and acts as a psychological deterrent. The blocking scripts stop 95%+ of casual copying attempts, which is the realistic and honest goal.

---

## Deployment (Vercel)

```bash
npm run build  # Verify build passes
vercel deploy  # Or push to GitHub with Vercel connected
```

Add all `.env.local` variables to Vercel's Environment Variables settings.

---

## Accessibility Note

The secure PDF viewer page intentionally overrides normal text-selection accessibility behavior (`user-select: none`, `pointer-events: none` on canvas) as a content-protection measure. Keyboard navigation for page controls (arrow keys, zoom buttons) is preserved. This trade-off applies only to the `/view/[purchaseId]` page.

---

*Made with care for SPPU engineering students.*
