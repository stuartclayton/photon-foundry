# GitHub Pages Deployment Guide

This guide walks you through deploying the Photon Foundry website to GitHub Pages.

## Prerequisites

- Git installed on your system
- A GitHub account
- The photon-foundry-website repository initialized

## Step-by-Step Deployment

### 1. Initialize Git Repository (if not already done)

```bash
cd photon-foundry-website
git init
```

### 2. Create GitHub Repository

1. Go to [GitHub.com](https://github.com) and sign in
2. Click the **+** icon in the top right → **New repository**
3. Name your repository: `photon-foundry-website`
4. Set visibility to **Public** (required for GitHub Pages on free accounts)
5. Do **NOT** initialize with README (we already have one)
6. Click **Create repository**

### 3. Connect Local Repository to GitHub

```bash
# Add the remote origin (replace YOUR-USERNAME with your GitHub username)
git remote add origin https://github.com/YOUR-USERNAME/photon-foundry-website.git

# Verify the remote was added
git remote -v
```

### 4. Commit and Push Your Files

```bash
# Add all files to staging
git add .

# Commit with a message
git commit -m "Initial commit: Photon Foundry website"

# Push to GitHub
git branch -M main
git push -u origin main
```

### 5. Enable GitHub Pages

1. Go to your repository on GitHub
2. Click **Settings** (top menu)
3. Click **Pages** (left sidebar)
4. Under **Source**, select:
   - Branch: `main`
   - Folder: `/ (root)`
5. Click **Save**

### 6. Wait for Deployment

- GitHub will build and deploy your site automatically
- This typically takes 1-2 minutes
- You'll see a green checkmark when it's ready
- Your site will be available at: `https://YOUR-USERNAME.github.io/photon-foundry-website/`

### 7. Verify Deployment

1. Click the **Visit site** button in the GitHub Pages settings
2. Or navigate directly to your GitHub Pages URL
3. Confirm the site loads correctly with the logo and styling

## Making Updates

After the initial deployment, updating the site is simple:

```bash
# Make your changes to files
# Then commit and push

git add .
git commit -m "Update: description of changes"
git push
```

GitHub Pages will automatically rebuild and redeploy within 1-2 minutes.

## Custom Domain

To use the custom domain `photon-foundry.com`:

1. In your repository's GitHub Pages settings, enter your custom domain: `photon-foundry.com`
2. Create a `CNAME` file in the root with your domain name:
   ```
   photon-foundry.com
   ```
3. Configure DNS records with your domain registrar:

   - **A Records** pointing to GitHub's IPs:
     - `185.199.108.153`
     - `185.199.109.153`
     - `185.199.110.153`
     - `185.199.111.153`
   - Or a **CNAME** record pointing to `YOUR-USERNAME.github.io`

4. Wait for DNS propagation (can take up to 48 hours, usually much faster)

## Troubleshooting

### Site Not Loading

- Check that GitHub Pages is enabled in Settings → Pages
- Verify the correct branch and folder are selected
- Check the Actions tab for deployment status/errors

### Images Not Showing

- Ensure image paths are relative (e.g., `assets/logo.svg`, not `/assets/logo.svg`)
- Check that all assets are committed and pushed to the repository

### 404 Error

- If using a custom domain, verify DNS settings
- Check that `index.html` is in the root of your repository

### Changes Not Appearing

- Wait 1-2 minutes for GitHub to rebuild
- Hard refresh your browser (Cmd+Shift+R on Mac, Ctrl+Shift+R on Windows)
- Check deployment status in Actions tab

## Resources

- [GitHub Pages Documentation](https://docs.github.com/en/pages)
- [Custom Domain Setup](https://docs.github.com/en/pages/configuring-a-custom-domain-for-your-github-pages-site)
- [GitHub Actions Status](https://github.com/YOUR-USERNAME/photon-foundry-website/actions)

## Quick Reference Commands

```bash
# Check status
git status

# Add all changes
git add .

# Commit changes
git commit -m "Your commit message"

# Push to GitHub (triggers deployment)
git push

# View remote URL
git remote -v

# Pull latest changes
git pull
```

---

**Note**: Replace `YOUR-USERNAME` with your actual GitHub username throughout this guide.
