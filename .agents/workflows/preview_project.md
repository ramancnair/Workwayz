# Preview Project Workflow

This workflow details the commands required to start the local preview development server.

1.  **Ensure Node is Loaded** (if using nvm):
    ```bash
    export NVM_DIR="$HOME/.nvm"
    [ -s "$NVM_DIR/nvm.sh" ] && \. "$NVM_DIR/nvm.sh"
    nvm use 24
    ```

2.  **Start the Next.js Development Server**:
    ```bash
    npm run dev
    ```

3.  **Access the Preview**:
    Wait for the server to start (it will display "Ready in..."). Navigate down to the URL printed in the terminal output (e.g. `http://localhost:3000`) in a web browser.
