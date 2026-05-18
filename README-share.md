# VanFX Trial Share Guide

This workspace contains a single-page static web app in `index.html`.

## How to share for mobile testing

1. Share the `index.html` file directly.
   - Upload it to cloud storage (Google Drive, OneDrive, Dropbox) and send the download link.
   - Or attach it to an email or messaging app.

2. Open the file on a phone.
   - On Android or iPhone, open the browser and navigate to the downloaded file.
   - Some phones can open local HTML files directly from the file manager.
   - If the browser does not allow local file access, use a local server.

## Best trial setup

### Option A: Open directly as a file
- Save `index.html` to the phone.
- Open it in the browser.
- This is the fastest way to preview the app.

### Option B: Use a temporary local server (recommended)
- Host the file in a simple server on a computer.
- Share the local network URL with testers.

Example with Python (if available):
```bash
cd "C:\Users\user\OneDrive\Documents\VanFX 2"
python -m http.server 8000
```
Then open on the phone using:
```
http://<computer-ip>:8000/index.html
```

### Option C: Deploy to GitHub Pages or Netlify
- Upload this folder or `index.html` to a hosting service.
- Share the public URL for easy mobile access.

## What to test

Ask testers to try these sections:
- Signup and login
- Subscription / plan flow
- Home page alerts and graphs
- Today's signal and free content
- Video library and video preview
- History page entries
- Notifications and calendar modal
- Profile and logout flow

## Feedback areas

- Does the app load correctly on mobile?
- Are buttons easy to tap?
- Is the signal information clear?
- Are any sections missing or confusing?
- Does the admin dashboard feel usable?

## Notes

- This app is a static single-page site, so it works best as a local HTML file or simple hosted page.
- For a public URL, use GitHub Pages. A deployment guide is available in `README-deploy.md` and the workflow is already set up at `.github/workflows/deploy.yml`.
- If you want, I can also help set up Netlify hosting instead.
