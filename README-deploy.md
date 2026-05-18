# Deploy VanFX as a Public Website

This guide shows how to publish your `index.html` app to GitHub Pages so anyone can open it from a public URL.

## Step 1: Create a GitHub repository

1. Sign in to GitHub and create a new repository.
2. Give it a name like `vanfx-trial`.
3. Do not add a README or license if you already have local files.

## Step 2: Push this folder to GitHub

From the project folder on your computer:

```powershell
cd "C:\Users\user\OneDrive\Documents\VanFX 2"
git init
git add .
git commit -m "Add VanFX web app"
# If your branch is master, push using master; the workflow supports both master and main
# If you want, you can also rename the branch to main before pushing.
git remote add origin https://github.com/<your-username>/<repo-name>.git
git push -u origin master
```

## Step 3: Add GitHub Pages workflow

A workflow file is included at `.github/workflows/deploy.yml`.
This will automatically deploy the repository to GitHub Pages on every push to `main`.

## Step 4: Enable GitHub Pages

1. Open the repository on GitHub.
2. Go to `Settings` → `Pages`.
3. If asked, choose the `GitHub Actions` deployment source.
4. Wait for GitHub to build and publish the site.
5. Your public URL will be displayed on the Pages settings page.

## Notes

- The homepage will be the `index.html` file from the repository root.
- After the first successful deployment, the site will be available at a URL like:

  `https://<your-username>.github.io/<repo-name>/`

- If you want a custom domain later, GitHub Pages supports that too.

## Testing on mobile

Send the public URL to testers.
They can open it in any mobile browser.

## Troubleshooting

- If the site does not appear, check the `Actions` tab in GitHub for deployment logs.
- Make sure the repo is public if you want anyone to access it without signing in.
