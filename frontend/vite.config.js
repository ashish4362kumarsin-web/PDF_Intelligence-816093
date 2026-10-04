import { fileURLToPath, URL } from 'node:url';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
export default defineConfig({
    plugins: [react()],
    resolve: {
        alias: {
            '@': fileURLToPath(new URL('./src', import.meta.url))
        }
    },
    server: {
        port: 5173,
        host: '0.0.0.0'
    },
    preview: {
        port: 4173,
        host: '0.0.0.0'
    },
    build: {
        rollupOptions: {
            output: {
                manualChunks: function (id) {
                    if (id.includes('/node_modules/firebase/') || id.includes('/node_modules/@firebase/')) {
                        return 'firebase-vendor';
                    }
                    if (id.includes('/node_modules/react-markdown/') || id.includes('/node_modules/remark-') || id.includes('/node_modules/micromark')) {
                        return 'markdown-vendor';
                    }
                }
            }
        }
    }
});
