import fs from 'fs';
import path from 'path';

export function getConnectionsPath(): string {
    const dataDir = path.join(process.cwd(), 'data');
    if (!fs.existsSync(dataDir)) {
        try { fs.mkdirSync(dataDir, { recursive: true }); } catch (e) { }
    }
    
    const newDataPath = path.join(dataDir, 'connections.json');
    const oldPath = path.join(process.cwd(), 'connections.json');
    
    // Auto-migrate from root to data directory if old exists but new doesn't
    if (fs.existsSync(oldPath) && !fs.existsSync(newDataPath)) {
        try {
            fs.copyFileSync(oldPath, newDataPath);
            // Optionally, we could delete the old one to avoid confusion:
            // fs.unlinkSync(oldPath);
        } catch (e) {
            console.warn('Failed to auto-migrate connections.json', e);
            return oldPath; // Fallback to old if we couldn't migrate
        }
    }
    
    return newDataPath;
}
