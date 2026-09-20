import { playwright } from '@vitest/browser-playwright'
import { defineConfig } from 'vitest/config'

const jsxConfig = {
    oxc: {
        jsx: {
            development: false,
            importSource: 'src/index',
            pragmaFrag: 'Fragment',
            pragma: 'h'
        }
    }
};

export default defineConfig({
    test: {
        projects: [
            {
                // DOM/browser tests require a real browser.
                extends: true,
                test: {
                    name: 'browser',
                    include: ['tests/**/*.{test,spec}.{ts,tsx}'],
                    exclude: ['tests/ssr/**'],
                    browser: {
                        enabled: true,
                        provider: playwright(),
                        instances: [{ browser: 'chromium' }]
                    }
                },
                ...jsxConfig
            },
            {
                // Server-side rendering tests run in a plain Node environment
                extends: true,
                test: {
                    name: 'node',
                    environment: 'node',
                    include: ['tests/ssr/**/*.{test,spec}.{ts,tsx}']
                },
                ...jsxConfig
            }
        ],
        coverage: {
            provider: 'v8',
            include: ['src/**'],
            reporter: ['html', 'text', 'json', 'lcov'],
            thresholds: {
                lines: 80,
                branches: 70,
                functions: 80,
                statements: 80
            }
        }
    },
});
