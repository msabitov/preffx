import { playwright } from '@vitest/browser-playwright'
import { defineConfig } from 'vitest/config'

export default defineConfig({
    test: {
        browser: {
            enabled: true,
            provider: playwright(),
            instances: [{ browser: 'chromium' }]
        },
    },
    oxc: {
        jsx: {
            development: false,
            importSource: 'src/index',
            pragmaFrag: 'Fragment',
            pragma: 'h'
        }
    },
});
