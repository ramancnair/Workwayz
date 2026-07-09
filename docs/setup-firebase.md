# ProjectFlow Setup Guide: Firebase Database & Auth

This guide provides comprehensive instructions for installing and setting up ProjectFlow using **Firebase** for both the database and authentication.

## 1. Prerequisites

- **Git**: [Download Git](https://git-scm.com/downloads)
- **Node.js (LTS)**: v18.x or later. [Download Node.js](https://nodejs.org/) (npm is included).

## 2. Clone the Repository & Install Dependencies

Open your terminal or command prompt and run the following commands:

```bash
git clone https://github.com/ramancnair/ProjectFlow.git
cd ProjectFlow
npm install
```
*(The `npm install` command will download and install all necessary dependencies, libraries, and frameworks required by ProjectFlow).*

## 3. Set Up Firebase (DB & Auth)

1. Navigate to the [Firebase Console](https://console.firebase.google.com/).
2. Click **Add project** and follow the on-screen prompts to create a new project.
3. Once the project is created, click the **Web** icon (`</>`) on the project overview page to add a web app to your project.
4. Register the app (e.g., name it `ProjectFlow`).
5. Firebase will provide a `firebaseConfig` object. **Keep this open** or copy it, as you will need these values during the app configuration step.
6. **Enable Authentication**:
   - In the left sidebar, navigate to **Build > Authentication**.
   - Click **Get Started**.
   - Go to the **Sign-in method** tab, click **Email/Password**, and enable it. Save your changes.
7. **Enable Firestore Database**:
   - Navigate to **Build > Firestore Database**.
   - Click **Create database**.
   - Choose your location.
   - Start in **Test mode** (this allows you to read/write initially without restrictive security rules, which you can configure later).

## 4. Set Up AI Providers

ProjectFlow uses AI features to suggest improvements for tasks and tests. You can choose either a cloud provider or run a local AI model.

### Option A: Google AI Studio (Recommended)
1. Go to [Google AI Studio](https://aistudio.google.com/).
2. Sign in with your Google account.
3. Click **Get API key** on the left menu.
4. Click **Create API key in new project**. 
5. **Copy this key**; you will need it for the wizard.

### Option B: LM Studio (Local AI)
If you prefer not to use cloud AI, you can run models locally.
1. Download and install [LM Studio](https://lmstudio.ai/).
2. Search and download a model of your choice (e.g., Llama 3 or Mistral).
3. Start the Local Inference Server. By default, it runs on `http://localhost:1234/v1`. This URL will be used in the wizard.

## 5. App Configuration (The Wizard)

ProjectFlow includes a built-in Configuration UI that automatically generates your `.env.local` file based on your inputs.

1. Start the development server by running:
   ```bash
   npm run dev
   ```
2. Open your browser and navigate to `http://localhost:3000`.
3. Expand the Sidebar and navigate to **Access Settings**. (This will open the Configuration UI).
4. **Database Configuration** (Take these from your `firebaseConfig` object):
   - **Provider**: Select `Firebase`
   - **API Key**: Paste your `apiKey`
   - **Auth Domain**: Paste your `authDomain`
   - **Project ID**: Paste your `projectId`
   - **Storage Bucket**: Paste your `storageBucket`
   - **Messaging Sender ID**: Paste your `messagingSenderId`
   - **App ID**: Paste your `appId`
5. **AI Configuration**:
   - **Provider**: Select `Google AI Studio` (or `LM Studio` if running locally).
   - **API Key**: Paste your Google AI Studio API Key.
   - *(For LM Studio, enter the endpoint: `http://localhost:1234/v1`)*.
6. Click **Save**. The application will automatically generate the required `.env.local` file in your project directory.
7. Go back to your terminal, stop the server (`Ctrl + C`), and restart it:
   ```bash
   npm run dev
   ```

### Alternative: Manual `.env.local` Setup
If you prefer, you can skip the wizard and create a file named `.env.local` in the root folder (`ProjectFlow/`) with the following content:

```env
NEXT_PUBLIC_DATABASE_PROVIDER="firebase"
NEXT_PUBLIC_AUTH_PROVIDER="firebase"
NEXT_PUBLIC_FIREBASE_API_KEY="<your-firebase-api-key>"
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN="<your-project>.firebaseapp.com"
NEXT_PUBLIC_FIREBASE_PROJECT_ID="<your-project-id>"
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET="<your-project>.firebasestorage.app"
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID="<your-sender-id>"
NEXT_PUBLIC_FIREBASE_APP_ID="<your-app-id>"

NEXT_PUBLIC_AI_PROVIDER="google"
GEMINI_API_KEY="<your-gemini-api-key>"
```

## 6. You're All Set!
Open `http://localhost:3000`, register a new account, and begin using ProjectFlow. The first user registered will have full administrator privileges.
