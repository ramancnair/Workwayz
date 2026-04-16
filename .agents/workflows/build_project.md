# Build Project Workflow

This workflow details the commands required to compile and build the NextJS project.

1.  **Install Node Version Manager (nvm)** (if not already installed) to ensure you have a modern Node.js environment:
    ```bash
    curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.40.4/install.sh | bash
    ```

2.  **Load nvm**:
    ```bash
    export NVM_DIR="$HOME/.nvm"
    [ -s "$NVM_DIR/nvm.sh" ] && \. "$NVM_DIR/nvm.sh"
    ```

3.  **Install Node.js 24**:
    ```bash
    nvm install 24
    nvm use 24
    ```

4.  **Install Project Dependencies**:
    ```bash
    npm install
    ```

5.  **Build the Project**:
    ```bash
    npm run build
    ```
