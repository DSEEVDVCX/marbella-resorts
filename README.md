# Marbella Resorts — Online Booking System

A booking system for multiple chalets/resorts, working on mobile and desktop. All data and preferences are stored in **Firebase** (Firestore + Authentication) — no `localStorage`/`sessionStorage` or PWA cache is used at all.

## Features
- Image gallery for each resort
- Google Maps location
- Interactive calendar showing available and booked dates
- Send booking requests directly via WhatsApp (choose the resort and date)
- Social media integration (Instagram, TikTok, WhatsApp)
- Fully responsive Arabic RTL design
- Polished interface with animations and visual effects
- Admin dashboard protected by Firebase Authentication
- Per-visitor preferences (theme, language, favorites) saved in Firestore via anonymous authentication

## Project Structure
```text
index.html                  ← Home page (hero, resorts, map, calendar)
unit-details.html           ← Resort details page + reviews
faq.html                    ← Frequently asked questions
cancellation-policy.html     ← Cancellation policy
about.html                  ← About us
admin.html                  ← Admin dashboard (protected by Firebase Auth)
css/
  ├── style.css             ← Main styling
  └── admin.css             ← Dashboard styling
js/
  ├── firebase-loader.js    ← Central Firebase loader (injects CDN SDKs + utils + config + data.js)
  ├── utils.js              ← General utilities (esc() for HTML escaping / XSS prevention)
  ├── firebase-config.js    ← Firebase config + admin email (ADMIN_EMAIL) + offline persistence
  ├── theme-init.js         ← Prevents theme flash (loaded in <head> on every page)
  ├── data.js               ← Default data + the store layer (Firestore/Auth)
  ├── shared.js             ← Shared utilities (language, theme, navigation, focus-trapped lightbox)
  ├── app.js                ← Home page logic (calendar, WhatsApp, UI)
  ├── unit-details.js       ← Details page logic (gallery, reviews)
  ├── faq.js                ← FAQ page logic
  ├── cancellation-policy.js ← Cancellation policy page logic
  ├── about.js              ← About page initialization
  └── admin.js              ← Dashboard logic (CRUD + Auth)
assets/images/              ← Resort images and logo
```

## Running Locally
Open `index.html` in a browser, or run a local server:
```powershell
python -m http.server 8000
```
Then visit: `http://localhost:8000`

> Note: the pages need an internet connection to load Firebase and to load/save data from Firestore.

## Firebase Setup (one-time)
1. Create a project in the [Firebase Console](https://console.firebase.google.com/) and put the `firebaseConfig` values in `js/firebase-config.js` (already present).
2. **Authentication → Sign-in method**, enable:
   - **Email/Password** (for the admin account).
   - **Anonymous** (required for: visitor preferences theme/language/favorites **and for submitting bookings and reviews**). If you disable it, bookings will not be saved in Firestore and the admin will not see them even though they are sent via WhatsApp.
3. **Authentication → Users**, create a user with an email and password. The email must match the `ADMIN_EMAIL` value in `js/firebase-config.js` (default `admin@marbella-resorts.com` — change it to an email you own if you want to be able to reset the password later).
4. **Firestore Database**, create the database. Settings and resorts are seeded automatically on first run.
5. **ImgBB** (for uploading resort images), get a free API key from [api.imgbb.com](https://api.imgbb.com/) and enter it in Dashboard → Settings → "ImgBB API Key". (No need to enable Firebase Storage — see the "Uploading Images" section below.)

### Firestore Collections Used
| Collection | Document | Purpose |
|---|---|---|
| `settings` | `main` | General settings (brand, WhatsApp, links…) |
| `units` | `{unitId}` | Resort data + booked dates + likes |
| `bookings` | auto | Booking requests |
| `reviews` | auto | Guest reviews |
| `users` | `{uid}` | Visitor/admin preferences (lang, theme, favorites) |

### Recommended Firestore Security Rules
```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    function isSignedIn() { return request.auth != null; }
    function isAdmin() { return isSignedIn() && request.auth.token.email == 'admin@marbella-resorts.com'; }

    function isStr(v, maxLen) { return v is string && v.size() <= maxLen; }

    function validBooking(d) {
      return d is map
        && d.keys().hasOnly(['id','unitId','unitName','date','name','phone','price','currency','notes','createdAt'])
        && d.keys().hasAll(['id','unitId','unitName','date','name','phone','price','currency','createdAt'])
        && isStr(d.id, 64)
        && isStr(d.unitId, 64)
        && isStr(d.unitName, 120)
        && isStr(d.date, 20)
        && isStr(d.name, 100)
        && isStr(d.phone, 30)
        && d.price is number && d.price >= 0
        && isStr(d.currency, 10)
        && isStr(d.createdAt, 40)
        && (!d.keys().hasAll(['notes']) || isStr(d.notes, 1000));
    }

    function validReview(d) {
      return d is map
        && d.keys().hasOnly(['unitId','name','text','rating','createdAt'])
        && d.keys().hasAll(['unitId','name','text','rating','createdAt'])
        && isStr(d.unitId, 64)
        && isStr(d.name, 100)
        && isStr(d.text, 1000)
        && d.rating is number && d.rating % 1 == 0 && d.rating >= 1 && d.rating <= 5
        && isStr(d.createdAt, 40);
    }

    match /settings/main { allow read: if true; allow write: if isAdmin(); }

    match /units/{id} {
      allow read: if true;
      // Write is admin-only. (If you want to allow updating likes/dates from the site, enable the alternative below instead.)
      allow write: if isAdmin();
    }

    match /bookings/{id} {
      allow read: if isAdmin();
      allow create: if isSignedIn() && validBooking(request.resource.data);   // anonymously signed-in visitors can submit a request
      allow delete, update: if isAdmin();
    }

    match /reviews/{id} {
      allow read: if true;
      allow create: if isSignedIn() && validReview(request.resource.data);
      allow delete, update: if isAdmin();
    }

    match /users/{uid} {
      allow read, delete: if isSignedIn() && request.auth.uid == uid;
      allow create, update: if isSignedIn() && request.auth.uid == uid
        && request.resource.data.keys().hasOnly(['lang','theme','favorites','updatedAt','createdAt']);
    }
  }
}
```
> Note: when `units` writes are admin-only, likes/dates will not update automatically from the site (which is the safest option). The admin can manage booked dates from the dashboard.

### Uploading Resort Images (via ImgBB — completely free)
The project uses **ImgBB** to upload resort images instead of Firebase Storage (completely free, unlimited space, no credit card required). The key is stored in `SETTINGS.imgbbKey` (in Firestore under `settings/main`).

#### Getting a free ImgBB key
1. Open [api.imgbb.com](https://api.imgbb.com/) → sign up / log in with a Google account or email.
2. Click **Get API key** → copy the **API Key**.
3. In Dashboard → **Settings** tab → paste the key into the **"ImgBB API Key (for image uploads)"** field → save.

> Notes:
> - Images are uploaded directly from the browser to ImgBB via `https://api.imgbb.com/1/upload`; no need to enable Firebase Storage.
> - Free ImgBB does not support deleting images via API; when you delete an image from the dashboard, only the reference is removed from the resort data (the file stays on ImgBB's server). An optional delete link is stored in the response but requires a browser call.
> - Free ImgBB limits are generous (upload up to 32MB/image, ~300 uploads/minute) — plenty for a site of this size.

## Customization
- To quickly edit settings and resorts: `js/data.js` contains the default arrays (`SETTINGS`, `UNITS`) that are seeded into Firestore on first run. After that, data is managed from the dashboard.
- To change the logo: replace `assets/images/logo.png`.

## Admin Dashboard
Open `admin.html`. Log in with the admin account (Email/Password) in Firebase Authentication.
- Manage booked dates, edit prices and descriptions, booking history, CSV export, general settings, change password.
- View and delete guest reviews (the "Reviews" section).
- Upload/remove resort images via ImgBB from the resort edit dialog (key from Settings).
- "Forgot password?" sends a recovery link to the email registered in `ADMIN_EMAIL`.

## Deployment
The project is static pages — suitable for deployment on GitHub Pages, Firebase Hosting, or any static host.

> **Note about CSP:** `js/firebase-loader.js` injects the Firebase SDKs via `document.write` during initial parsing. There is no CSP currently. If you add a Content Security Policy later (recommended on Firebase Hosting via `firebase.json`/`_headers`), `script-src` must allow `https://www.gstatic.com` and `'self'`, and must not block parser-inserted scripts — otherwise Firebase will not load and the site becomes non-functional.
