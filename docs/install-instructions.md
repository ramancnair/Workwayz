# ProjectFlow — Install Instructions

## 1. Download the Project

Clone the repository from GitHub:

```bash
git clone https://github.com/ramancnair/ProjectFlow.git
cd ProjectFlow
```

---

## 2. Software Prerequisites

Install the following software **before** proceeding with the project setup. The order listed below is the recommended install sequence.

| # | Software | Minimum Version | Purpose | Download Link |
|---|----------|-----------------|---------|---------------|
| 1 | **Git** | 2.40+ | Clone the repository | [git-scm.com](https://git-scm.com/downloads) |
| 2 | **Node.js** (LTS) | 18.x or later | JavaScript runtime for Next.js | [nodejs.org](https://nodejs.org/) |
| 3 | **npm** | 9.x or later | Package manager (bundled with Node.js) | Included with Node.js |
| 4 | **Firebase CLI** *(optional)* | Latest | Deploy to Firebase App Hosting & manage services | `npm install -g firebase-tools` |
| 5 | **Genkit CLI** *(optional)* | Latest | Run and test Genkit AI flows locally | `npm install -g genkit-cli` |

> **Note:** npm is installed automatically when you install Node.js. No separate install step is needed.

---

## 3. Environment Variables Setup

The project requires a `.env` file in the root directory with the following keys:

```env
# Firebase Configuration
NEXT_PUBLIC_FIREBASE_API_KEY="<your-firebase-api-key>"
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN="<your-project>.firebaseapp.com"
NEXT_PUBLIC_FIREBASE_PROJECT_ID="<your-project-id>"
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET="<your-project>.firebasestorage.app"
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID="<your-sender-id>"
NEXT_PUBLIC_FIREBASE_APP_ID="<your-app-id>"

# Gemini AI Key (used by Genkit)
GEMINI_API_KEY=<your-gemini-api-key>
```

> Ask the project administrator for the actual values, or create your own Firebase project and Gemini API key.

---

## 4. Install Dependencies

From the project root directory, run:

```bash
npm install
```

This will install all required dependencies listed in `package.json`, including Next.js, React, Firebase SDK, Genkit, Radix UI components, TailwindCSS, and more.

---

## 5. Run the Application

### Development Server (primary)

```bash
npm run dev
```

This starts the Next.js development server. By default, the app will be available at **http://localhost:3000** (port 9002 when run via Firebase Studio).

### Genkit AI Server *(optional — only if working on AI features)*

In a **separate terminal**, run one of:

```bash
npm run genkit:dev      # Start the Genkit dev server
npm run genkit:watch    # Start with hot-reload on AI flow changes
```

### Production Build

```bash
npm run build    # Create an optimized production build
npm start        # Serve the production build
```

---

## 6. Other Useful Commands

| Command | Description |
|---------|-------------|
| `npm run lint` | Run ESLint to check for code issues |
| `npm run typecheck` | Run the TypeScript compiler to check for type errors |
| `npm run build` | Build the project for production deployment |

---

## 7. Quick-Start Summary

```text
1.  Install Git
2.  Install Node.js (v18+)
3.  git clone https://github.com/ramancnair/ProjectFlow.git
4.  cd ProjectFlow
5.  Create .env file with required keys (see Section 3)
6.  npm install
7.  npm run dev
8.  Open http://localhost:3000 in your browser
```

---

## 8. Troubleshooting

| Issue | Solution |
|-------|----------|
| `npm: command not found` | Node.js is not installed or not in your system PATH. Re-install Node.js. |
| `Module not found` errors | Run `npm install` again to ensure all dependencies are installed. |
| Firebase errors on startup | Verify your `.env` file contains valid Firebase configuration keys. |
| Port 3000 already in use | Stop the other process, or run `npx next dev -p <port>` to use a different port. |
| Genkit / AI features not working | Ensure `GEMINI_API_KEY` is set in `.env` and the Genkit CLI is installed. |
