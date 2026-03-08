# Deploy to Render.com

## Quick Deploy

1. Go to https://dashboard.render.com
2. Create New -> Web Service
3. Connect your GitHub repository
4. Configure:
   - Build Command: `npm install && npm run build`
   - Start Command: `npm run start`
   - Environment: Node

## Environment Variables
No extra env vars needed - API connects to Ollama Cloud.

## Note
The frontend calls `/api/chat` which is served by the Express server.
