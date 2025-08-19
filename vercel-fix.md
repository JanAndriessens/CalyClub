# Fix Vercel 401 Unauthorized Issue

## The Problem
Your Vercel deployment is returning 401 Unauthorized because the project has password protection or is set to private.

## Solution: Make Project Public

### Option 1: Via Vercel Dashboard (Recommended)

1. **Go to Vercel Dashboard**
   - Visit: https://vercel.com/jan-h2mais-projects/calyclub/settings
   
2. **Navigate to Security Settings**
   - In the left sidebar, click on **"Security"**
   - Or go directly to: https://vercel.com/jan-h2mais-projects/calyclub/settings/security

3. **Disable Password Protection**
   - Look for **"Password Protection"** section
   - If it's enabled, **turn it OFF**
   - Click **"Save"**

4. **Check Deployment Protection**
   - Look for **"Deployment Protection"** section
   - Set to **"Public"** or **"None"**
   - Make sure "Vercel Authentication" is **disabled**
   - Click **"Save"**

5. **Check Project Visibility**
   - Go to **"General"** settings
   - Make sure project is not set to "Private"

### Option 2: Via Vercel CLI

Run these commands to remove protection:

```bash
cd "C:\Users\janan\Documents\GitHub\CalyClub"

# Remove password protection
vercel env rm VERCEL_PASSWORD_PROTECTION

# Redeploy without protection
vercel --prod --force
```

### Option 3: Create New Public Deployment

If the above doesn't work, create a fresh public deployment:

```bash
# Remove existing Vercel configuration
cd "C:\Users\janan\Documents\GitHub\CalyClub"
rm -rf .vercel

# Deploy as new public project
vercel --public --prod
```

When prompted:
- Set up and deploy? **Yes**
- Which scope? **Your account**
- Link to existing project? **No**
- Project name? **calyclub-public**
- Directory? **./** (current)

## Quick Check After Fix

Test if it's working:
```bash
curl -I https://calyclub.vercel.app
```

Should return `200 OK` instead of `401 Unauthorized`

## Alternative: Check Team Settings

The issue might be at the team/organization level:

1. Go to: https://vercel.com/teams/jan-h2mais-projects/settings/security
2. Check if there are team-wide security settings
3. Look for:
   - SSO requirements
   - Team member only access
   - Default project protection

## If All Else Fails

Create a completely new Vercel account (personal, not team) and deploy there:
1. Sign out of Vercel
2. Create new account with personal email
3. Deploy CalyClub to personal account
4. This will bypass any team restrictions