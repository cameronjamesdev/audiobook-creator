# Audiobook Creator Pro

A 100% client-side web application that converts text documents (PDF, Word, Markdown) into professional audiobooks using Google Gemini (for parsing/formatting) and OpenAI TTS (for voice narration).

---

## 🤖 Future AI Assistant Context 
*(If you are an AI reading this repo to help Cameron, this section is everything you need to know about the architecture.)*

This is a **zero-build static site**. There is no Node.js backend, no Webpack, no build step. It is pure HTML, CSS, and JS. You run it by simply opening `index.html` in a browser.

### 1. Hosting & Deployment
- **Repo:** GitHub (`camtheclam33/audiobook-creator`)
- **Hosting:** **Netlify**. Any push to the `main` branch on GitHub automatically deploys to the live Netlify site within ~30 seconds.

### 2. Database (Firebase Firestore)
The application uses **Firebase Firestore** (Standard edition) to sync user audiobook libraries across devices in real-time.
- **Project ID:** `audiobook-creator-33917`
- **Implementation:** We use the Firebase v10 Compat CDN scripts (located in the `<head>` of `index.html`).
- **Initialization & Logic:** Setup and real-time listeners (`onSnapshot`) are entirely contained in `scripts/app.js` using the global `firebase.firestore()` object.
- **Security Rules:** Currently set to Test Mode (`allow read, write: if true;`). Security is maintained via client-side UI namespacing.
- **Data Structure:** Books are stored as individual documents at: `users/{userID}/books/{bookID}` to avoid the 1MB Firestore document limit.

### 3. Authentication & API Keys
We do **not** use Firebase Auth. Authentication is handled by a hardcoded `USERS` array at the very top of `scripts/app.js`.
- The array stores the user's ID, email, password, and their personal **Gemini API Key** and **OpenAI API Key**.
- When a user logs in via the UI, their API keys are automatically populated into the application state and hidden key inputs.
- API calls go *directly* from the client's browser to the Google/OpenAI APIs. No API traffic routes through a backend. 

### 4. Legacy Migration
If Cameron logs into a device where he previously used the app's older fully-offline `localStorage` version, `app.js` runs a one-time migration. It sweeps `audiobook_library` and `audiobook_library_cameron` from the browser's local storage and auto-uploads those books to his Firestore profile.

---

## 🧑‍💻 Developer Instructions (For Cameron)

### Making Changes
Because this app is linked to GitHub and Netlify, updating the live website is incredibly easy:
1. Open the project folder on your laptop.
2. Ask the AI to make changes, add features, tweak CSS, etc.
3. Test it locally by just opening `index.html` in your browser.
4. When you are happy with the changes, ask the AI to "commit and push to GitHub".
5. Wait 30 seconds. Your live Netlify website is now updated for everyone!

### Managing Users
If you want to invite a new friend to use the app:
1. Open `scripts/app.js`.
2. Look at the top for `const USERS = [ ... ]`.
3. Copy one of the existing user blocks and paste it below to create a new one. 
4. Change the `id`, `name`, `email`, and `password` for them. (They can share your API keys or you can put theirs in).
5. Commit and push the code. They can now log in online!

### Backups
Even though everything is safely in the Google cloud, you can always click **"Export"** in the sidebar to download your entire library as a `.json` file backup to your hard drive.

---

### 🚀 Future Optimization Tools (MCP Requests)
Cameron has requested that future AI sessions look into adding and integrating these MCP (Model Context Protocol) servers to improve workflow:
- ➕ GitHub MCP
- ➕ Perplexity MCP
- ➕ Sequential Thinking MCP

### MCP Servers
    ➕ GitHub MCP
    ➕ Perplexity MCP
    ➕ Sequential Thinking