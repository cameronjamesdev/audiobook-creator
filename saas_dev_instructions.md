# Audiobook Creator SaaS - Development Handover Instructions

If you are a new AI assistant instance starting a fresh chat, read this document to understand the project structure, current progress, and immediate next steps.

---

## Project Structure & Paths
We have successfully consolidated the codebase into one primary folder on your computer to leverage Git branches instead of separate physical copies.

**Master Directory:** `C:\Users\camer\OneDrive\Documents\Audiobook Creator`
**GitHub Repo:** `cameronjamesdev/audiobook-creator`

1. **Personal Version (Branch: `main`)**
   * **Behavior:** Uses hardcoded logins and makes direct client-side API calls.
   * **Hosting:** Paid Netlify site automatically deploying from the `main` branch.
   * **Rule:** Do NOT commit SaaS backend or Firebase configurations to this branch.

2. **SaaS/Production Version (Branch: `saas-production`)**
   * **Behavior:** Uses Firebase Auth and secure Cloud Functions.
   * **Hosting:** Will be hosted on Firebase Hosting (or Netlify configured for this branch).
   * **Rule:** Perform ALL SaaS coding and Stripe integration in this branch.

*(Note: There may still be a static `Audiobook Creator - Backup` folder on the computer, but it is purely an offline safety copy).*
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
