import typescript from '@rollup/plugin-typescript';
import terser from '@rollup/plugin-terser';
import cleaner from 'rollup-plugin-cleaner';
import json from './package.json' with { type: 'json' };

const banner = `/*
* PreffX v${json.version}
* {@link ${json.repository.url}}
* Copyright (c) Marat Sabitov
* @license ${json.license}
*/`;

const inputs = {
    index: 'src/index.ts',
    state: 'src/state.ts',
    'jsx-runtime': 'src/jsx-runtime.ts',
    'jsx-dev-runtime': 'src/jsx-dev-runtime.ts',
    server: 'src/server/index.ts'
};

const tsPlugin = typescript({
    tsconfig: 'tsconfig.json'
});

export default {
    input: inputs,
    output: {
        dir: 'dist',
        banner,
        format: 'es',
        plugins: [terser()],
        entryFileNames: '[name].js',
        chunkFileNames: '[name].js',
        manualChunks(id) {
            // force the SSR-identity-critical modules into a single shared chunk
            if (/(render|core)\.ts$/.test(id)) {
                return 'core';
            }
        }
    },
    plugins: [
        cleaner({ targets: ['./dist/'] }),
        tsPlugin
    ]
};
