# Step 1: Use Node.js environment
FROM node:20-alpine

# Step 2: Create app directory
WORKDIR /app

# Step 3: Copy package files
COPY package*.json ./

# Step 4: Install ALL dependencies (needed for the build step)
RUN npm ci

# Step 5: Copy the rest of your Next.js project files
COPY . .

# Step 6: Build your Next.js application 
# (This creates the optimized production build)
RUN npm run build

# Step 7: Next.js runs on port 3000 by default
EXPOSE 3000

# Step 8: Start the Next.js server using your exact script
CMD ["npm", "start"]