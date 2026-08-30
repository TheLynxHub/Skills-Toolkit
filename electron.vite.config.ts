import {cpSync, existsSync, mkdirSync, readdirSync} from 'node:fs';

import federation from '@originjs/vite-plugin-federation';
import {sentryVitePlugin} from '@sentry/vite-plugin';
import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import {defineConfig} from 'electron-vite';
import {resolve} from 'path';

export default defineConfig(({mode}) => {
  const isDev = mode === 'development';

  return {
    main: {
      root: resolve('extension/src/main'),
      build: {
        sourcemap: true,
        externalizeDeps: {exclude: ['tree-kill']},
        outDir: resolve('extension_out/scripts/main'),
        rolldownOptions: {
          input: resolve('extension/src/main/lynxExtension.ts'),
          output: {entryFileNames: 'mainEntry.cjs', format: 'cjs'},
        },
        plugins: [
          sentryVitePlugin({
            authToken: process.env.SENTRY_AUTH_TOKEN,
            org: 'lynxhub',
            project: 'skills-toolkit',
            disable: isDev,
            sourcemaps: {
              filesToDeleteAfterUpload: '**/*.map',
            },
          }),
        ],
      },
      plugins: [
        {
          name: 'copy-skills',
          closeBundle() {
            const srcDir = resolve(__dirname, 'node_modules/skills/dist');
            const destDir = resolve(__dirname, '../extension_out/scripts/main/skills');
            if (existsSync(srcDir)) {
              mkdirSync(destDir, {recursive: true});
              cpSync(srcDir, destDir, {recursive: true});
              console.log('Successfully copied skills CLI to extension_out/scripts/main/skills');
            } else {
              console.error('Could not find skills dist folder at', srcDir);
            }

            const nodeModulesSrcDir = resolve(__dirname, 'node_modules');
            const nodeModulesDestDir = resolve(destDir, 'node_modules');
            if (existsSync(nodeModulesSrcDir)) {
              mkdirSync(nodeModulesDestDir, {recursive: true});
              const entries = readdirSync(nodeModulesSrcDir);
              for (const entry of entries) {
                if (entry === 'skills' || entry === '.bin' || entry.startsWith('.')) continue;
                const entrySrc = resolve(nodeModulesSrcDir, entry);
                const entryDest = resolve(nodeModulesDestDir, entry);
                cpSync(entrySrc, entryDest, {recursive: true});
                console.log(`Successfully copied ${entry} dependency to ${entryDest}`);
              }
            } else {
              console.error('Could not find node_modules folder at', nodeModulesSrcDir);
            }
          },
        },
      ],
      resolve: {
        alias: {
          '@lynx_common': resolve(__dirname, '..', 'src/common'),
          '@lynx_main': resolve(__dirname, '..', 'src/main'),
        },
      },
    },
    renderer: {
      root: resolve('extension/src/renderer'),
      plugins: [
        sentryVitePlugin({
          authToken: process.env.SENTRY_AUTH_TOKEN,
          org: 'lynxhub',
          project: 'skills-toolkit',
          disable: isDev,
          sourcemaps: {
            filesToDeleteAfterUpload: '**/*.map',
          },
        }),
        react(),
        tailwindcss(),
        federation({
          name: 'extension',
          filename: 'rendererEntry.mjs',
          exposes: {
            Extension: resolve('extension/src/renderer/Extension.tsx'),
          },
          shared: {
            react: {generate: false},
            'react-dom': {generate: false},
            'react-redux': {generate: false},
            '@heroui/react': {generate: false},
            '@heroui/styles': {generate: false},
            'react-aria': {generate: false},
          },
        }),
      ],
      resolve: {
        alias: {
          '@lynx_module': resolve(__dirname, '..', 'module/src'),
          '@lynx_extension': resolve(__dirname, '..', 'extension/src'),
          '@lynx_common': resolve(__dirname, '..', 'src/common'),
          '@lynx': resolve(__dirname, '..', 'src/renderer/mainWindow'),
          '@lynx_shared': resolve(__dirname, '..', 'src/renderer/shared'),
          '@lynx_assets': resolve(__dirname, '..', 'src/renderer/shared/assets'),
        },
      },
      build: {
        sourcemap: true,
        outDir: resolve('extension_out/scripts/renderer'),
        rolldownOptions: {
          input: resolve('extension/src/renderer/index.html'),
          treeshake: {moduleSideEffects: false},
        },
        assetsDir: '',
        minify: false,
        target: 'esnext',
        cssCodeSplit: false,
        modulePreload: false,
      },
      publicDir: resolve(__dirname, 'extension/src/renderer/Public'),
    },
  };
});
