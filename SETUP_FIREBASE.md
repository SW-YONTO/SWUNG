# Firebase Setup Instructions

To enable Push Notifications, you must set up a Firebase Project.

## 1. Create Firebase Project

1. Go to [Firebase Console](https://console.firebase.google.com/).
2. Click **Add project** and follow the steps.
3. Once created, go to **Project settings** (gear icon).

## 2. Get Web Configuration

1. In the **General** tab, scroll to "Your apps".
2. Click the **</>** (Web) icon to register a web app.
3. Copy the `firebaseConfig` object (apiKey, authDomain, etc.).
4. Open `views/index.ejs` and replace the placeholder `firebaseConfig` with your actual values.

## 3. Get Service Account (Backend)

1. Go to **Project settings** > **Service accounts**.
2. Click **Generate new private key**.
3. Save the file as `serviceAccountKey.json` in the root of your project (`SWUNGv2/`).

## 4. Get VAPID Key

1. Go to **Project settings** > **Cloud Messaging**.
2. Scroll to "Web configuration".
3. Generate a "Key pair".
4. Copy the **Public key**.
5. Open `public/js/notifications.js` and replace `'YOUR_PUBLIC_VAPID_KEY_HERE'` with this key.

## 5. Restart Server

After these changes, restart your server:

```bash
npm run dev
```
