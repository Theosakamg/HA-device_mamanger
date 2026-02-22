import { defineConfig } from 'vite';

export default defineConfig({
  build: {
    lib: {
      entry: 'src/device-manager-app.ts',
      formats: ['es'],
      fileName: () => 'device-manager.js',
    },
    outDir: 'dist',
    rollupOptions: {
      output: {
        inlineDynamicImports: true,
      },
    },
    minify: 'terser',
    sourcemap: false,
  },
});
