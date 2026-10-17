<div align="center">
<img width="1200" height="475" alt="GHBanner" src="https://ai.google.dev/static/site-assets/images/share-ais-513315318.png" />
</div>

# Run and deploy your AI Studio app

This contains everything you need to run your app locally.

View your app in AI Studio: https://ai.studio/apps/5239b1b8-5259-44ae-8b76-3d794e90f76d

## Run Locally

**Prerequisites:**  Node.js


1. Install dependencies:
   `npm install`
2. Set the `GEMINI_API_KEY` in [.env.local](.env.local) to your Gemini API key
3. Run the app:
   `npm run dev`


## Deploy on Render (free)

This project is prepared as a Node/Express web service so the REST, SSE, and WebSocket multiplayer server can run together.

1. Create a Git repository and upload this project.
2. In Render, create a **Web Service** from that repository.
3. Choose the **Free** instance.
4. Render will use `render.yaml` (or set Build Command to `npm install && npm run build` and Start Command to `npm start`).
5. If you want AI explanations, add `GEMINI_API_KEY` as a secret environment variable. Do not put the real key in the source code.
6. Open the generated `onrender.com` URL and test Practice, AI explanations, and Challenge a Friend.

Note: the free service can sleep after inactivity, so the first request after sleeping may take about a minute. Multiplayer WebSockets are supported by Render web services.
