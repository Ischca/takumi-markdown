import { defineConfig } from 'vite';
import { resolve } from 'path';

export default defineConfig({
    build: {
        outDir: 'dist-cli',
        target: 'node18',
        ssr: resolve(__dirname, 'src/cli/index.ts'),
        rollupOptions: {
            external: [
                /^node:/,
                'unified',
                'remark-parse',
                'remark-gfm',
                'lowlight',
                'unist-util-visit',
                /^highlight\.js/,
            ],
            output: {
                entryFileNames: 'takumi-md.mjs',
            },
        },
        sourcemap: false,
        minify: false,
    },
});
