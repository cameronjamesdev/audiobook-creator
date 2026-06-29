# Audiobook Creator SaaS - Development Handover Instructions

If you are a new AI assistant instance starting a fresh chat, read this document to understand the project structure, current progress, and immediate next steps.

---

## Project Structure & Paths
We have physically separated the codebase into two distinct folders on the user's computer:

1. **Personal Version (Do NOT touch unless explicitly requested):**
   * **Path:** `C:\Users\camer\OneDrive\Documents\Audiobook Creator - Personal`
   * **Git Branch:** `main`
   * **GitHub Repo:** `cameronjamesdev/audiobook-creator` (branch `main`)
   * **Hosting:** Paid Netlify site deploying from the `main` branch.
   * **Behavior:** Uses hardcoded logins and makes direct client-side API calls.

2. **SaaS/Production Version (Perform ALL SaaS coding here):**
   * **Path:** `C:\Users\camer\OneDrive\Documents\Audiobook Creator - SaaS`
   * **Git Branch:** `saas-production`
   * **GitHub Repo:** `cameronjamesdev/audiobook-creator` (branch `saas-production`)
   * **Hosting:** Will be hosted on Firebase Hosting.
   * **Behavior:** Will use Firebase Auth and secure Cloud Functions.

3. **Backup Folder (Safety copy):**
   * **Path:** `C:\Users\camer\OneDrive\Documents\Audiobook Creator - Backup`
   * **Note:** Purely static offline backup.

---

## Configuration & Credentials
* **Developer Email:** `cameronjamesdev@outlook.com`
* **Accounts & Login Methods (No passwords stored here):**
  * **Outlook Email:** Direct email & password login.
  * **Google Account:** Direct login (associated with the `cameronjamesdevdev` alias).
  * **GitHub Account:** Log in via **Google Single Sign-On (SSO)** (using the new Google account).
  * **Firebase Console:** Log in via **Google Sign-In** (using the new Google account).
  * **Stripe Dashboard:** Direct login with **email & password** (using `cameronjamesdev@outlook.com` directly, NOT Google Sign-In).
  * **Netlify Dashboard (Personal):** Log in using your usual paid Netlify login (linked to your personal email/GitHub).
* **Firebase Project ID:** `audiobook-creator-pro`
* **Stripe Account:** Set up in Sandbox / Test Mode.
* **Active API Keys:** Stored locally in the gitignored file: `scripts/config.js` inside both project directories (never commit this file!).
* **Netlify Deployments:** Configure to inject keys via environment variables privately during build.

---

## Current Roadmap Progress
We have completed **Phase 1** (Infrastructure Setup) and **Phase 2** (Branching).
We are currently at **Phase 3: Secure Backend Architecture**.
* **Done:** Firebase tools are initialized, `package.json` and boilerplate `index.js` created in the `functions/` folder, and `npm install` has been run.
* **Next Task:** Implement the `/processDocument` proxy endpoint in `functions/index.js` to securely process files using the Gemini API.

---

## Handover Instructions for the AI
1. Propose checking out `saas-production` in `C:\Users\camer\OneDrive\Documents\Audiobook Creator - SaaS`.
2. Review the roadmap details in `artifacts/implementation_plan.md` and `artifacts/task.md`.
3. Proceed with implementing the Cloud Functions in `functions/index.js` and configuring the Firebase Local Emulator Suite for local testing.
