# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

CalyClub is a Firebase-based member management PWA with dual deployment (Firebase Hosting + Vercel). The application uses vanilla JavaScript with Firebase SDK v8 for browser compatibility, especially optimized for iPad Safari.

## IMPORTANT: Project Master Plan Tracking

**ALWAYS update `PROJECT-MASTER-PLAN.md` when implementing features:**
1. Before starting work, check the master plan for current status
2. Update the "Implementation Status" section as you complete features
3. Mark items as COMPLETED with checkmarks (✅) when done
4. Add completion dates and any relevant notes
5. Update percentages for in-progress features
6. Document any blockers or dependencies discovered

The PROJECT-MASTER-PLAN.md is the single source of truth for project progress and should be kept current at all times.

## Development Commands

### Local Development
```bash
# Install dependencies
npm install

# Start development server with nodemon
npm run dev

# Start production server
npm start

# Optimize/build for production
npm run optimize
```

### Firebase Functions
```bash
# Install function dependencies
cd functions && npm install

# Build TypeScript functions
cd functions && npm run build

# Deploy functions only
cd functions && npm run deploy

# Run functions locally with emulator
cd functions && npm run serve

# Lint TypeScript code
cd functions && npm run lint
```

### Firebase Deployment
```bash
# Deploy everything (hosting, functions, rules)
firebase deploy

# Start Firebase emulator suite
firebase emulators:start

# Deploy specific services
firebase deploy --only hosting
firebase deploy --only functions
firebase deploy --only firestore:rules
```

### Git & Deployment
```bash
# Quick deployment with auto-generated commit message
npm run deploy:quick

# Deployment with custom commit message
npm run deploy:message

# Verify deployment status
npm run deploy:verify
```

### Testing & Maintenance
```bash
# Performance testing
npm run perf:test

# Clear cache (if script exists)
npm run cache:clear

# Test PWA locally (Windows)
pwa-deploy.bat
```

## Architecture & Key Patterns

### Core Application Structure
- **Frontend**: Vanilla JavaScript (ES6+) with Firebase SDK v8.10.1
- **Backend**: Firebase services (Firestore, Auth, Storage) + TypeScript Cloud Functions
- **Hosting**: Dual deployment to Firebase Hosting and Vercel
- **Database**: Firestore with offline persistence
- **Authentication**: Firebase Auth with email/password and Google OAuth

### Critical Files & Load Order
Every HTML page must include these files in this exact order:
```html
<script src="deployment-timestamp.js"></script>
<script src="firebase-config.js"></script>
<!-- Firebase SDK scripts -->
<script src="auth-guard.js"></script>
```

### Module Dependencies
- `firebase-config.js` - Loads Firebase configuration asynchronously (MUST load first)
- `auth-guard.js` - Protects pages from unauthenticated access
- `navigation.js` - Shared navigation component
- `session-manager.js` - Handles session timeouts
- `device-utils.js` - Device detection and mobile optimizations

### Firebase Integration Pattern
```javascript
// Always wait for Firebase config to load
const config = await window.firebaseConfigPromise;

// Use global Firebase references
const user = window.auth.currentUser;
const snapshot = await window.db.collection('membres').get();

// Error handling pattern
try {
    // Firebase operation
} catch (error) {
    window.handleError(error, 'Operation description');
}
```

### User Management Flow
1. New users register via `register.html`
2. Admin must approve users in `user-management.html`
3. Users have roles: admin, member, or pending
4. Account lockout after 5 failed login attempts
5. Session timeout after 30 minutes of inactivity

### iPad & Mobile Optimizations
- Minimum 44px touch targets for all interactive elements
- iPad-specific enhancements in `ipad-enhancements.js`
- Touch-friendly table interactions in `table-touch-enhancements.js`
- Viewport meta tags prevent zoom on input focus

### Deployment Strategy
- **Primary**: Push to GitHub `main` branch triggers Vercel deployment
- **Firebase**: Manual deployment via `firebase deploy`
- **Verification**: Each page includes `deployment-timestamp.js` for version checking
- **Domains**: 
  - Production: https://calyclub.vercel.app
  - Firebase: https://calyclub.firebaseapp.com

### Security Considerations
- Firebase config loaded dynamically (never committed)
- Admin role verification for sensitive operations
- CORS configured for allowed domains only
- Session management with automatic logout
- Account lockout protection

## Important Constraints

### Browser Compatibility
- Optimized for Safari (iPad/iPhone)
- Uses Firebase SDK v8 (not v9+) for compatibility
- No build tools or transpilation required
- Vanilla JavaScript only (no frameworks)

### File System Requirements
- All paths must be absolute (not relative)
- Windows environment (use backslashes in file paths)
- Git repository not initialized in current directory

### Development Workflow
1. Read existing code before making changes
2. Follow existing patterns and conventions
3. Test locally before deployment
4. Use deployment scripts for consistent commits
5. Verify deployment with timestamp checks

## Common Tasks

### Adding New Pages
1. Create HTML file in `public/`
2. Include required scripts in correct order
3. Add auth guard if page requires authentication
4. Update navigation in `navigation.js`
5. Test deployment timestamp verification

### Modifying Firebase Functions
1. Edit TypeScript files in `functions/src/`
2. Run `npm run lint` to check for errors
3. Build with `npm run build`
4. Test locally with `npm run serve`
5. Deploy with `npm run deploy`

### Updating User Permissions
1. Check user roles in Firestore `users` collection
2. Use `scripts/set-admin-roles.cjs` for admin setup
3. Verify permissions in `user-management.html`

### Debugging Issues
- Check browser console for errors
- Verify Firebase config loaded successfully
- Check deployment timestamp matches
- Review Firebase Functions logs
- Test on actual iPad for Safari-specific issues