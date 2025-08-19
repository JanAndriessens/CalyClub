# Firebase Console Setup Guide for CalyClub

## Step 1: Create New Firebase Project

1. **Go to Firebase Console**
   - Open https://console.firebase.google.com/
   - Click "Create a project" or "Add project"

2. **Project Setup**
   - Project name: `calyclub`
   - Project ID will be: `calyclub` (or `calyclub-xxxxx` if taken)
   - Click "Continue"

3. **Google Analytics** (Optional but recommended)
   - Enable Google Analytics: Yes
   - Select "Default Account for Firebase"
   - Click "Create project"
   - Wait for project creation (~30 seconds)

## Step 2: Enable Authentication

1. **Navigate to Authentication**
   - In left sidebar, click "Build" → "Authentication"
   - Click "Get started"

2. **Enable Sign-in Methods**
   - **Email/Password:**
     - Click "Email/Password"
     - Enable "Email/Password" toggle
     - Enable "Email link (passwordless sign-in)" if needed
     - Click "Save"
   
   - **Google Sign-in:**
     - Click "Add new provider"
     - Select "Google"
     - Enable toggle
     - Set public-facing name: "CalyClub"
     - Set support email: your-email@domain.com
     - Click "Save"

3. **Authorized Domains**
   - Go to "Settings" tab
   - Add these domains:
     ```
     localhost
     calyclub.firebaseapp.com
     calyclub.web.app
     caly-club.vercel.app
     ```

## Step 3: Create Firestore Database

1. **Navigate to Firestore**
   - Click "Build" → "Firestore Database"
   - Click "Create database"

2. **Database Configuration**
   - Choose location: `europe-west3` (or your preferred region)
   - Start in: "Production mode"
   - Click "Create"

3. **Initial Collections Setup**
   Create these collections manually:
   
   a. **users** collection:
   - Click "Start collection"
   - Collection ID: `users`
   - Add sample document (can delete later):
     - Document ID: "temp"
     - Field: `email` (string) = "temp@example.com"
   - Click "Save"

   b. **membres** collection:
   - Click "Start collection"
   - Collection ID: `membres`
   - Add sample document

   c. **events** collection:
   - Collection ID: `events`

## Step 4: Update Firestore Security Rules

1. **Go to Firestore Rules**
   - Click "Rules" tab in Firestore
   
2. **Replace with these rules:**
   ```javascript
   rules_version = '2';
   service cloud.firestore {
     match /databases/{database}/documents {
       // Users collection - authenticated users can read their own data
       match /users/{userId} {
         allow read: if request.auth != null && 
                        (request.auth.uid == userId || 
                         request.auth.token.role == 'admin');
         allow write: if request.auth != null && 
                         request.auth.uid == userId;
         allow create: if request.auth != null && 
                          request.auth.uid == userId;
       }
       
       // Members collection - authenticated users can read, admins can write
       match /membres/{document=**} {
         allow read: if request.auth != null;
         allow write: if request.auth != null && 
                         request.auth.token.role == 'admin';
       }
       
       // Events collection
       match /events/{document=**} {
         allow read: if request.auth != null;
         allow write: if request.auth != null && 
                         request.auth.token.role == 'admin';
       }
     }
   }
   ```
   
3. **Publish Rules**
   - Click "Publish"

## Step 5: Setup Firebase Storage

1. **Navigate to Storage**
   - Click "Build" → "Storage"
   - Click "Get started"

2. **Configure Storage**
   - Start in production mode
   - Choose location: Same as Firestore (e.g., `europe-west3`)
   - Click "Done"

3. **Update Storage Rules**
   - Click "Rules" tab
   - Replace with:
   ```javascript
   rules_version = '2';
   service firebase.storage {
     match /b/{bucket}/o {
       function isAuthenticated() {
         return request.auth != null;
       }
       
       function isValidOrigin() {
         return request.origin.matches('http://localhost:3001|https://calyclub.web.app|https://calyclub.firebaseapp.com');
       }
       
       match /avatars/{fileName} {
         allow read: if isAuthenticated();
         allow write: if isAuthenticated() && 
                        request.resource.size < 5 * 1024 * 1024;
         allow delete: if isAuthenticated();
       }
       
       match /documents/{userId}/{fileName} {
         allow read: if isAuthenticated();
         allow write: if isAuthenticated() && 
                        request.resource.size < 10 * 1024 * 1024;
       }
       
       match /{allPaths=**} {
         allow read, write: if false;
       }
     }
   }
   ```
   - Click "Publish"

4. **Configure CORS**
   - You'll need to run this command locally:
   ```bash
   gsutil cors set cors.json gs://calyclub.firebasestorage.app
   ```

## Step 6: Get Firebase Configuration

1. **Project Settings**
   - Click gear icon → "Project settings"
   - Scroll to "Your apps" section
   - Click "Web" icon (</>) to add web app

2. **Register Web App**
   - App nickname: "CalyClub Web"
   - ✅ Also set up Firebase Hosting
   - Click "Register app"

3. **Copy Configuration**
   Save this configuration:
   ```javascript
   const firebaseConfig = {
     apiKey: "YOUR_NEW_API_KEY",
     authDomain: "calyclub.firebaseapp.com",
     projectId: "calyclub",
     storageBucket: "calyclub.firebasestorage.app",
     messagingSenderId: "YOUR_SENDER_ID",
     appId: "YOUR_APP_ID",
     measurementId: "YOUR_MEASUREMENT_ID"
   };
   ```

## Step 7: Enable Firebase Hosting

1. **Already enabled** from Step 6
2. **Deploy from local machine:**
   ```bash
   firebase login
   firebase use calyclub
   firebase deploy --only hosting
   ```

## Step 8: Setup Cloud Functions (if needed)

1. **Upgrade to Blaze Plan**
   - Click "Upgrade" in Firebase Console
   - Select "Blaze" pay-as-you-go plan
   - Add billing account

2. **Deploy Functions**
   ```bash
   cd functions
   npm install
   npm run deploy
   ```

## Step 9: Update Local Environment

1. **Create .env file** in your project root:
   ```env
   # Firebase Configuration
   FIREBASE_API_KEY=YOUR_NEW_API_KEY
   FIREBASE_AUTH_DOMAIN=calyclub.firebaseapp.com
   FIREBASE_PROJECT_ID=calyclub
   FIREBASE_STORAGE_BUCKET=calyclub.firebasestorage.app
   FIREBASE_MESSAGING_SENDER_ID=YOUR_SENDER_ID
   FIREBASE_APP_ID=YOUR_APP_ID
   FIREBASE_MEASUREMENT_ID=YOUR_MEASUREMENT_ID
   
   # Session Security
   SESSION_SECRET=calyclub_super_secure_session_secret_key_2025_production_ready_random_string_xyz789
   
   # Application Settings
   NODE_ENV=development
   PORT=3001
   ```

2. **Update firebase-config.js** with new values

## Step 10: Initialize Firebase Admin Users

1. **Create First Admin User**
   - Go to Authentication → Users
   - Click "Add user"
   - Add your admin email and password
   - Note the User UID

2. **Set Admin Role in Firestore**
   - Go to Firestore
   - Navigate to `users` collection
   - Create document with ID = User UID
   - Add fields:
     ```
     email: "admin@example.com"
     role: "admin"
     createdAt: (timestamp)
     isApproved: true
     ```

## Step 11: Test Your Setup

1. **Test Authentication**
   - Visit https://calyclub.firebaseapp.com/login.html
   - Try logging in with your admin account

2. **Verify Database Access**
   - Check Firestore for login records
   - Test member creation

3. **Test Storage**
   - Try uploading an avatar image
   - Verify it appears in Storage

## Step 12: Domain Configuration (Optional)

1. **Custom Domain Setup**
   - Go to Hosting in Firebase Console
   - Click "Add custom domain"
   - Follow verification steps
   - Add DNS records as instructed

## Troubleshooting Checklist

- [ ] Firebase project created with ID "calyclub"
- [ ] Authentication providers enabled
- [ ] Firestore database created with correct rules
- [ ] Storage bucket configured with CORS
- [ ] Web app registered and config obtained
- [ ] Local .env file updated
- [ ] firebase-config.js updated
- [ ] First admin user created
- [ ] Test login successful

## Important URLs After Setup

- Firebase Console: https://console.firebase.google.com/project/calyclub
- Live App: https://calyclub.firebaseapp.com
- Alternative: https://calyclub.web.app
- Firestore: https://console.firebase.google.com/project/calyclub/firestore
- Authentication: https://console.firebase.google.com/project/calyclub/authentication

## Next Steps

1. Deploy to Firebase Hosting:
   ```bash
   firebase deploy
   ```

2. Update Vercel environment variables (if using Vercel)

3. Test all functionality:
   - User registration
   - Login/logout
   - Member management
   - Event creation
   - File uploads

---

**Need Help?**
- Firebase Documentation: https://firebase.google.com/docs
- Firebase Status: https://status.firebase.google.com/
- Support: https://firebase.google.com/support