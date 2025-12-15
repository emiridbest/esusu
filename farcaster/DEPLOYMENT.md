# Deploying Farcaster App to Vercel

## Prerequisites
- Vercel account (https://vercel.com)
- Git repository (optional but recommended)

## Deployment Steps

### Option 1: Deploy via Vercel CLI (Recommended)

1. **Install Vercel CLI** (if not already installed):
```bash
npm install -g vercel
```

2. **Login to Vercel**:
```bash
vercel login
```

3. **Deploy from the farcaster directory**:
```bash
cd farcaster
vercel
```

4. **Follow the prompts**:
   - Set up and deploy? **Y**
   - Which scope? Select your account
   - Link to existing project? **N** (first time) or **Y** (redeployment)
   - What's your project's name? **esusu-farcaster**
   - In which directory is your code located? **./**
   - Want to modify settings? **N**

5. **Deploy to production**:
```bash
vercel --prod
```

### Option 2: Deploy via Vercel Dashboard

1. **Push to GitHub** (if not already):
```bash
git add .
git commit -m "Prepare Farcaster app for Vercel deployment"
git push origin main
```

2. **Go to Vercel Dashboard**:
   - Visit https://vercel.com/dashboard
   - Click "Add New Project"
   - Import your repository

3. **Configure Project**:
   - Framework Preset: **Next.js**
   - Root Directory: **farcaster**
   - Build Command: `npm run build`
   - Install Command: `npm install --legacy-peer-deps`
   - Output Directory: `.next`

4. **Add Environment Variables** (IMPORTANT):
   Copy all variables from `.env.local` to Vercel:
   - Go to Project Settings → Environment Variables
   - Add each variable from your `.env.local` file
   - Make sure to update production values:
     - `NEXT_PUBLIC_APP_URL` → Your Vercel URL
     - `NEXTAUTH_URL` → Your Vercel URL
     - `NEXT_PUBLIC_SANDBOX_MODE` → `false` (for production)

5. **Deploy**:
   - Click "Deploy"
   - Wait for build to complete

## Required Environment Variables for Vercel

Make sure to add these in Vercel Dashboard → Settings → Environment Variables:

### Critical Variables:
```
NEXT_PUBLIC_APP_URL=https://farcaster.xyz/miniapps/ODGMy9CdO8UI/esusu
NEXT_PUBLIC_URL=https://farcaster.xyz/miniapps/ODGMy9CdO8UI/esusu
NEXT_PUBLIC_FARCASTER_FID=849363
MONGODB_URI=your_mongodb_connection_string
NEXTAUTH_URL=https://farcaster.xyz/miniapps/ODGMy9CdO8UI/esusu
NEXTAUTH_SECRET=your_secret
CELO_RPC_URL=https://forno.celo.org
NEXT_PUBLIC_REWARD_TOKEN_ADDRESS=0x25db74CF4E7BA120526fd87e159CF656d94bAE43
NEXT_PUBLIC_APP_ADDRESS=0x4d4cC2E0c5cBC9737A0dEc28d7C2510E2BEF5A09
NEXT_PUBLIC_INVITER_ADDRESS=0x4d4cC2E0c5cBC9737A0dEc28d7C2510E2BEF5A09
BACKEND_WALLET_PRIVATE_KEY=your_private_key
NEXT_PUBLIC_AUTH_URL=https://auth.reloadly.com/oauth/token
NEXT_PUBLIC_API_URL=https://topups.reloadly.com
NEXT_PUBLIC_FX_API_URL=https://topups.reloadly.com/operators/fx-rate
NEXT_PUBLIC_SANDBOX_MODE=false
NEXT_CLIENT_ID=your_reloadly_client_id
NEXT_CLIENT_SECRET=your_reloadly_client_secret
NEXT_PUBLIC_AUDIENCE_URL=https://topups.reloadly.com
EMAIL_SERVICE=gmail
EMAIL_USER=your_email
EMAIL_PASSWORD=your_email_password
EMAIL_FROM=noreply@esusuafrica.com
NODE_ENV=production
```

## Post-Deployment

1. **Update Farcaster Manifest**:
   - Edit `public/.well-known/farcaster.json`
   - Update all URLs to your Vercel deployment URL
   - Redeploy

2. **Test the Deployment**:
   - Visit your Vercel URL
   - Test wallet connection
   - Test data purchase flow
   - Test freebies claim

3. **Monitor Logs**:
   - Check Vercel deployment logs for any errors
   - Monitor function logs in Vercel dashboard

## Troubleshooting

### Build Fails
- Check Vercel build logs
- Ensure all dependencies are in `package.json`
- Verify TypeScript has no errors: `npm run build` locally

### Environment Variables Not Working
- Make sure variables are added in Vercel dashboard
- Redeploy after adding new variables
- Check variable names match exactly (case-sensitive)

### API Routes Failing
- Check function logs in Vercel
- Verify all environment variables are set
- Check MongoDB connection string is correct

## Useful Commands

```bash
# Check deployment status
vercel inspect [deployment-url]

# View deployment logs
vercel logs [deployment-url]

# List all deployments
vercel list

# Promote a deployment to production
vercel promote [deployment-url]

# Roll back to previous deployment
vercel rollback
```

## Domain Configuration

To use a custom domain:
1. Go to Project Settings → Domains
2. Add your domain
3. Update DNS records as instructed
4. Update `NEXT_PUBLIC_APP_URL` and `NEXTAUTH_URL` to your custom domain
5. Redeploy

## Success!

Your Farcaster app should now be live at:
- **Production**: https://farcaster.xyz/miniapps/ODGMy9CdO8UI/esusu
- **Farcaster Mini App**: https://farcaster.xyz/miniapps/ODGMy9CdO8UI/esusu
