# Deploy to Render.com - Quick Guide

## Step 1: Login
1. Open https://dashboard.render.com
2. Login with GitHub

## Step 2: Create Web Service
1. Click "New +" → "Web Service"
2. Find your GitHub repo: `remontsuri-ai-site`
3. Click "Connect"

## Step 3: Configure
Fill in these fields:

```
Name: psychoanalyze-ai
Environment: Node
Build Command: npm install && npm run build
Start Command: npm run start
```

## Step 4: Deploy
1. Click "Create Web Service"
2. Wait 2-3 minutes for build
3. Get your URL: https://psychoanalyze-ai.onrender.com

## Done!
Share the URL with everyone!
