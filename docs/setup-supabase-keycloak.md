# Workwayz Setup Guide: Supabase DB & Keycloak Auth

This guide provides comprehensive instructions for installing and setting up Workwayz using **Supabase** as the database and **Keycloak** for authentication. Both services will be run locally via Docker.

## 1. Prerequisites

- **Git**: [Download Git](https://git-scm.com/downloads)
- **Node.js (LTS)**: v18.x or later. [Download Node.js](https://nodejs.org/) (npm is included).
- **Docker & Docker Compose**: Ensure Docker is running on your machine. [Download Docker Desktop](https://www.docker.com/products/docker-desktop).

## 2. Clone the Repository & Install Dependencies

Open your terminal or command prompt and run:

```bash
git clone https://github.com/ramancnair/Workwayz.git
cd Workwayz
npm install
```
*(The `npm install` command will install Next.js, React, and all necessary application dependencies).*

## 3. Set Up Supabase (Database via Docker)

1. Open a new terminal window and clone the Supabase Docker repository:
   ```bash
   git clone --depth 1 https://github.com/supabase/supabase-docker.git
   cd supabase-docker/docker
   ```
2. Copy the example environment variables file to create a `.env` file:
   ```bash
   cp .env.example .env
   ```
3. Start the Supabase stack in the background:
   ```bash
   docker-compose up -d
   ```
4. Once the containers are running, you can access the Supabase Studio dashboard at `http://localhost:8000`.
   - Default login: Username: `supabase`, Password: `this_password_is_secret`.
5. **Get your API Credentials**:
   - Open the `.env` file you created in `supabase-docker/docker`.
   - Find the **`ANON_KEY`** (a long JWT token) and the **`API_EXTERNAL_URL`** (typically `http://localhost:8000` or `http://localhost:54321`). 
   - Keep these handy for the Workwayz wizard.

## 4. Set Up Keycloak (Auth via Docker)

1. Open another terminal window and start a Keycloak instance:
   ```bash
   docker run -p 8080:8080 -e KEYCLOAK_ADMIN=admin -e KEYCLOAK_ADMIN_PASSWORD=admin quay.io/keycloak/keycloak:latest start-dev
   ```
2. Open your browser and navigate to the Keycloak Admin Console at `http://localhost:8080`.
3. Log in with Username: `admin`, Password: `admin`.
4. **Create a Realm**:
   - In the top-left dropdown (which defaults to "master"), click **Create Realm**.
   - Name the realm `workwayz` and click **Create**.
5. **Create a Client**:
   - In the left sidebar under the `workwayz` realm, click **Clients**, then **Create client**.
   - **Client ID**: `workwayz-client`. Leave the rest as default and click **Next**.
   - **Client authentication**: Toggle this **ON**.
   - **Standard flow**: Enabled. **Direct access grants**: Enabled. Click **Next**.
   - **Valid redirect URIs**: Enter `http://localhost:3000/*`.
   - **Web origins**: Enter `http://localhost:3000`.
   - Click **Save**.
6. **Get Credentials**:
   - Navigate to the **Credentials** tab for the `workwayz-client` you just created.
   - Copy the **Client Secret**. You will need this for the wizard.

## 5. Set Up AI Providers

### Option A: Google AI Studio (Recommended)
1. Go to [Google AI Studio](https://aistudio.google.com/).
2. Sign in with Google, click **Get API key**, and create a new key. **Copy it**.

### Option B: LM Studio (Local AI)
1. Download and install [LM Studio](https://lmstudio.ai/).
2. Search and download a model (e.g., Llama 3).
3. Start the Local Server. The default URL is `http://localhost:1234/v1`.

## 6. App Configuration (The Wizard)

Workwayz provides a Configuration UI to easily set up your `.env.local` file.

1. Navigate back to your `Workwayz` directory terminal and start the server:
   ```bash
   npm run dev
   ```
2. Open your browser to `http://localhost:3000`. Navigate to **Access Settings** in the sidebar.
3. **Database Configuration** (from Supabase):
   - **Provider**: Select `Supabase`.
   - **Supabase URL**: Paste your `API_EXTERNAL_URL` (e.g., `http://localhost:8000`).
   - **Supabase Anon Key**: Paste the `ANON_KEY` from your Supabase `.env` file.
4. **Auth Configuration** (from Keycloak):
   - **Provider**: Select `Keycloak`.
   - **Keycloak URL**: `http://localhost:8080`.
   - **Keycloak Realm**: `workwayz`.
   - **Keycloak Client ID**: `workwayz-client`.
   - **Admin Client ID**: `workwayz-client`.
   - **Admin Client Secret**: Paste the Client Secret you copied from Keycloak.
5. **AI Configuration**:
   - Select `Google AI Studio` and provide your copied API key, OR select `LM Studio` and provide the local URL.
6. Click **Save**. Workwayz will automatically generate your `.env.local` file.
7. Stop the dev server (`Ctrl + C`) and restart it:
   ```bash
   npm run dev
   ```

### Alternative: Manual `.env.local` Setup
If you prefer not to use the wizard, create a `.env.local` file in your `Workwayz` root directory:

```env
NEXT_PUBLIC_DATABASE_PROVIDER="supabase"
NEXT_PUBLIC_AUTH_PROVIDER="keycloak"

NEXT_PUBLIC_SUPABASE_URL="http://localhost:8000"
NEXT_PUBLIC_SUPABASE_ANON_KEY="<your-anon-key>"

NEXT_PUBLIC_KEYCLOAK_URL="http://localhost:8080"
NEXT_PUBLIC_KEYCLOAK_REALM="workwayz"
NEXT_PUBLIC_KEYCLOAK_CLIENT_ID="workwayz-client"
KEYCLOAK_ADMIN_CLIENT_ID="workwayz-client"
KEYCLOAK_ADMIN_CLIENT_SECRET="<your-keycloak-client-secret>"

NEXT_PUBLIC_AI_PROVIDER="google"
GEMINI_API_KEY="<your-gemini-api-key>"
```

## 7. You're All Set!
Open `http://localhost:3000`. You will now be redirected to the Keycloak login screen. Register your new account and start using Workwayz!
