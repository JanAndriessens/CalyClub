# CalyClub Vercel Deployment Guide

## Quick Setup Steps

### 1. Push to GitHub
```bash
git add .
git commit -m "Update CalyClub configuration for Vercel deployment"
git push origin main
```

### 2. Deploy to Vercel

#### Option A: Vercel CLI (Recommended)
```bash
# Install Vercel CLI globally
npm i -g vercel

# Deploy from project directory
cd CalyBase
vercel

# Follow prompts:
# - Project name: calyclub
# - Framework: Other
# - Build command: (leave empty)
# - Output directory: public
```

#### Option B: Vercel Dashboard
1. Go to https://vercel.com/dashboard
2. Click "Add New..." → "Project"
3. Import from GitHub: `JanAndriessens/CalyClub`
4. Configure:
   - **Project Name:** calyclub
   - **Framework Preset:** Other
   - **Root Directory:** CalyBase
   - **Build Command:** (leave empty)
   - **Output Directory:** public

### 3. Environment Variables (Not needed for static deployment)

The Firebase configuration is already embedded in the static files, so no environment variables are required for this deployment.

### 4. Custom Domain (Optional)

After deployment:
1. Go to your Vercel project dashboard
2. Click "Settings" → "Domains"
3. Add your custom domain
4. Configure DNS with provided CNAME/A records

## Current Configuration

### Firebase Config
- **Project ID:** calyclub-72808
- **Auth Domain:** calyclub-72808.firebaseapp.com
- **Storage:** calyclub-72808.firebasestorage.app

### Domain Updates Needed
When deployed, update these files with your Vercel URL:
- `cors.json` - Add Vercel domain to allowed origins
- `storage.rules` - Add Vercel domain to allowed origins
- `firebase-config.js` - Update production domain check

## Expected URLs

### Development
- **Firebase:** https://calyclub-72808.web.app
- **Vercel:** https://calyclub-[random].vercel.app

### Production (with custom domain)
- **Custom:** https://calyclub.com (your domain)

## Testing Deployment

After deployment, test these URLs:
1. **Main App:** https://your-vercel-url.vercel.app
2. **Login:** https://your-vercel-url.vercel.app/login.html
3. **Members:** https://your-vercel-url.vercel.app/membres.html
4. **Storage Test:** https://your-vercel-url.vercel.app/test-storage.html

## Troubleshooting

### Common Issues:
1. **404 errors:** Check vercel.json routes configuration
2. **Firebase errors:** Verify Firebase config in firebase-config.js
3. **CORS errors:** Add Vercel domain to cors.json and redeploy Firebase

### Updates After Vercel Deployment:
```bash
# Update CORS to include Vercel domain
# Update firebase-config.js production check
# Redeploy Firebase rules: firebase deploy --only storage,firestore
```

## Deployment Commands Summary

```bash
# 1. Commit changes
git add .
git commit -m "Prepare for Vercel deployment"
git push origin main

# 2. Deploy to Vercel
vercel

# 3. Update Firebase CORS (after getting Vercel URL)
firebase deploy --only storage

# 4. Test deployment
curl -I https://your-vercel-url.vercel.app
```

## Benefits of Vercel Deployment

✅ **Fast Global CDN** - Better performance worldwide
✅ **Easy Custom Domains** - Simpler DNS setup
✅ **Automatic HTTPS** - SSL certificates included
✅ **GitHub Integration** - Auto-deploy on push
✅ **Analytics** - Built-in performance monitoring
✅ **Preview Deployments** - Branch previews

Your CalyClub will be accessible from multiple URLs:
- Firebase: https://calyclub-72808.web.app
- Vercel: https://calyclub.vercel.app
- Custom: https://your-domain.com