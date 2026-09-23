#!/bin/sh

echo "ProjectFlow Docker Entrypoint Started"

# Check if there is a persistent update override in the data volume
if [ -d "./data/app_override" ]; then
    echo "=========================================="
    echo "    PERSISTENT APP OVERRIDE DETECTED      "
    echo "=========================================="
    
    # Use Node.js to compare base image version vs override version safely
    SHOULD_APPLY=$(node -e "
      const fs = require('fs');
      try {
        const basePkg = JSON.parse(fs.readFileSync('./package.json', 'utf8'));
        const overridePkg = JSON.parse(fs.readFileSync('./data/app_override/package.json', 'utf8'));
        
        const baseV = basePkg.version || '0.0.0';
        const overV = overridePkg.version || '0.0.0';
        
        function cmp(v1, v2) {
          const p1 = v1.split('.').map(n => parseInt(n, 10) || 0);
          const p2 = v2.split('.').map(n => parseInt(n, 10) || 0);
          for (let i = 0; i < Math.max(p1.length, p2.length); i++) {
            const a = p1[i] || 0;
            const b = p2[i] || 0;
            if (a > b) return 1;
            if (a < b) return -1;
          }
          return 0;
        }
        
        // Output YES only if override version is strictly greater than base image version
        if (cmp(overV, baseV) > 0) {
          console.log('YES');
        } else {
          console.log('NO');
        }
      } catch(e) {
        // Fallback: If parsing fails, do not apply
        console.log('NO');
      }
    ")
    
    if [ "$SHOULD_APPLY" = "YES" ]; then
        echo "Applying updated version from ./data/app_override to /app..."
        cp -rf ./data/app_override/* ./
        echo "Update successfully applied! Booting server..."
    else
        echo "Base image is newer or equal to override. Purging stale override..."
        rm -rf ./data/app_override
    fi
    echo "=========================================="
fi

# Execute the main process
exec "$@"
