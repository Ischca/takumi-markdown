import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { resolve } from 'path';

export default defineConfig({
    plugins: [react()],
    resolve: {
        // Avoid browser-only export conditions to keep SSR-safe code paths.
        conditions: ['module', 'import', 'default']
    },
    build: {
        lib: {
            entry: resolve(__dirname, 'src/lib/index.ts'),
            name: 'TakumiMarkdown',
            formats: ['es', 'cjs'],
            fileName: (format) => `takumi-markdown.${format === 'es' ? 'mjs' : 'cjs'}`
        },
        rollupOptions: {
            external: ['react', 'react-dom', 'react/jsx-runtime'],
            output: {
                globals: {
                    react: 'React',
                    'react-dom': 'ReactDOM',
                    'react/jsx-runtime': 'jsxRuntime'
                }
            }
        },
        outDir: 'dist',
        sourcemap: false,
        cssCodeSplit: false
    }
});
