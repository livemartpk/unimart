# UniMart — Setup Guide (Phase 1)

This is the starting code structure for UniMart, built to match everything we
planned: Emerald Trust theme, Firebase backend, role-based system (Buyer,
Seller, Agent, 6 Admin portals).

## What's included so far

```
unimart/
├── public/
├── src/
│   ├── config/
│   │   └── firebase.js          ← Firebase setup (you must add your keys)
│   ├── pages/
│   │   ├── auth/
│   │   │   ├── BuyerSignUp.jsx  ← Quick sign-up (email + password only)
│   │   │   └── Login.jsx        ← Universal login (all roles)
│   │   ├── buyer/                (empty, next step)
│   │   ├── seller/                (empty, next step)
│   │   ├── agent/                 (empty, next step)
│   │   └── admin/
│   │       ├── super-admin/
│   │       ├── seller-manager/
│   │       ├── marketing-manager/
│   │       ├── support-team/
│   │       ├── finance-team/
│   │       └── content-team/
│   ├── components/               (empty, shared components go here)
│   ├── styles/
│   │   └── theme.css             ← Emerald Trust colors & reusable styles
│   └── utils/                    (empty, helper functions go here)
```

## Step 1 — Create your Firebase project

1. Go to https://console.firebase.google.com
2. Click "Add Project" → name it (e.g. "unimart-pk")
3. Once created, click the **Web (</>) icon** to register a web app
4. Copy the `firebaseConfig` object Firebase gives you
5. Open `src/config/firebase.js` in this project and paste your real values in place of the `"YOUR_..."` placeholders

## Step 2 — Enable Firebase services

In the Firebase Console:
- **Authentication** → Sign-in method → Enable "Email/Password"
- **Firestore Database** → Create database → Start in **test mode** for now (we'll add real security rules before launch)
- **Storage** → Get started (for product images, documents — though we're using Cloudinary for images, Storage can hold seller documents)

## Step 3 — Install dependencies

This project expects a React setup (e.g. Vite or Create React App) with Firebase installed:

```bash
npm install firebase
```

## Step 4 — Test the Buyer Sign-Up flow

1. Run your dev server
2. Open the Buyer Sign-Up page
3. Create an account with a real email you can access (to test the verification email)
4. Check Firebase Console → Authentication — you should see the new user
5. Check Firestore → `users` collection and `buyers` collection — you should see new documents

## What's next

We'll build, one piece at a time:
1. Buyer profile-completion form (triggered at first checkout)
2. Seller registration + Seller Manager approval flow
3. Agent registration + Marketing Manager approval flow
4. Homepage (Emerald Trust + Gen Z style, as designed)
5. Admin portals

## Notes

- All emails/notifications are in **English only** (confirmed decision)
- Country field defaults to Pakistan but is built for future expansion 
- This is Phase 1: Pakistan-focused, free-tier services (Firebase Spark, Cloudinary free, GitHub, Vercel free)
