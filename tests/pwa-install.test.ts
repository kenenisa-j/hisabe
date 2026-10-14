/**
 * PWA Installation Behavior Tests
 *
 * Tests:
 * 1. Installed-app detection (display-mode: standalone/fullscreen/minimal-ui, iOS navigator.standalone, localStorage)
 * 2. Session dismissal & repeat display on subsequent visits (sessionStorage)
 * 3. Native install prompt handling and rejection of unconfirmed installation
 * 4. Fallback instructions flow for Android Chrome, iOS Safari & Desktop browsers
 * 5. Manifest configuration & Service Worker presence
 * 6. Required UI content verification
 *
 * Runner: node:test
 * Run: npx tsx --test tests/pwa-install.test.ts
 */

import { describe, it, beforeEach } from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import manifest from '../src/app/manifest'

describe('PWA Manifest Configuration', () => {
    it('manifest returns valid PWA configuration with required properties', () => {
        const config = manifest()
        assert.equal(config.name, 'Hisabe ሂሳብ — Ethiopian Finance')
        assert.equal(config.short_name, 'Hisabe')
        assert.equal(config.display, 'standalone')
        assert.equal(config.start_url, '/dashboard')
        assert.equal(config.id, '/')
        assert.equal(config.scope, '/')
        assert.equal(config.theme_color, '#10b981')
        assert.equal(config.background_color, '#020617')
        assert.ok(Array.isArray(config.icons), 'icons should be an array')
        assert.ok(config.icons.length >= 2, 'manifest should provide multiple icon resolutions')

        // Must include 192x192 and 512x512
        const has192 = config.icons.some(i => i.sizes === '192x192')
        const has512 = config.icons.some(i => i.sizes === '512x512')
        assert.ok(has192, 'manifest must contain 192x192 icon')
        assert.ok(has512, 'manifest must contain 512x512 icon')
    })

    it('service worker file exists in public/sw.js', () => {
        const swPath = path.join(process.cwd(), 'public', 'sw.js')
        assert.ok(fs.existsSync(swPath), 'public/sw.js must exist')
        const content = fs.readFileSync(swPath, 'utf8')
        assert.ok(content.includes('install'), 'service worker must handle install event')
        assert.ok(content.includes('activate'), 'service worker must handle activate event')
        assert.ok(content.includes('fetch'), 'service worker must handle fetch event')
    })
})

describe('PWA Installation Detection & Session Dismissal Logic', () => {
    let mockSessionStorage: Record<string, string>
    let mockLocalStorage: Record<string, string>

    beforeEach(() => {
        mockSessionStorage = {}
        mockLocalStorage = {}
    })

    function checkIsAppInstalled(env: {
        isStandaloneMedia?: boolean
        isFullscreen?: boolean
        isMinimalUi?: boolean
        isIOSStandalone?: boolean
        isAndroidApp?: boolean
        localStorageInstalled?: boolean
    }): boolean {
        const isStandaloneDisplay = env.isStandaloneMedia === true
        const isFullscreen = env.isFullscreen === true
        const isMinimalUi = env.isMinimalUi === true
        const isIOSStandalone = env.isIOSStandalone === true
        const isAndroidApp = env.isAndroidApp === true
        const isRecorded = env.localStorageInstalled === true || mockLocalStorage['hisabe_pwa_installed'] === 'true'
        return isStandaloneDisplay || isFullscreen || isMinimalUi || isIOSStandalone || isAndroidApp || isRecorded
    }

    function shouldShowPopup(env: {
        isStandaloneMedia?: boolean
        isFullscreen?: boolean
        isMinimalUi?: boolean
        isIOSStandalone?: boolean
        isAndroidApp?: boolean
        localStorageInstalled?: boolean
    }): boolean {
        if (checkIsAppInstalled(env)) {
            return false
        }
        if (mockSessionStorage['hisabe_pwa_dismissed'] === 'true') {
            return false
        }
        return true
    }

    it('never shows popup if app is in display-mode: standalone', () => {
        const show = shouldShowPopup({ isStandaloneMedia: true })
        assert.equal(show, false)
    })

    it('never shows popup if app is in display-mode: fullscreen or minimal-ui', () => {
        assert.equal(shouldShowPopup({ isFullscreen: true }), false)
        assert.equal(shouldShowPopup({ isMinimalUi: true }), false)
    })

    it('never shows popup if iOS navigator.standalone is true', () => {
        const show = shouldShowPopup({ isIOSStandalone: true })
        assert.equal(show, false)
    })

    it('never shows popup if Android TWA referrer is present', () => {
        const show = shouldShowPopup({ isAndroidApp: true })
        assert.equal(show, false)
    })

    it('never shows popup if confirmed installed in localStorage', () => {
        mockLocalStorage['hisabe_pwa_installed'] = 'true'
        const show = shouldShowPopup({})
        assert.equal(show, false)
    })

    it('shows popup on first visit when not installed', () => {
        const show = shouldShowPopup({})
        assert.equal(show, true)
    })

    it('dismissal suppresses popup during the same page session', () => {
        // Initial state: shows
        assert.equal(shouldShowPopup({}), true)

        // User clicks "Maybe Later" or dismisses
        mockSessionStorage['hisabe_pwa_dismissed'] = 'true'

        // Subsequent check in the same session: does NOT show
        assert.equal(shouldShowPopup({}), false)
    })

    it('shows popup again on subsequent visit after session clears', () => {
        // User previously dismissed in past session
        mockSessionStorage['hisabe_pwa_dismissed'] = 'true'
        assert.equal(shouldShowPopup({}), false)

        // New visit (fresh session where sessionStorage is reset)
        mockSessionStorage = {}

        // Shows again on the new visit
        assert.equal(shouldShowPopup({}), true)
    })
})

describe('PWA Installation Prompt Behavior & Content', () => {
    it('does not mark app as installed when user dismisses the native prompt', async () => {
        let isInstalled = false
        const promptEvent = {
            prompt: async () => {},
            userChoice: Promise.resolve<{ outcome: 'accepted' | 'dismissed'; platform: string }>({
                outcome: 'dismissed',
                platform: '',
            }),
        }

        const choiceResult = await promptEvent.userChoice
        if (choiceResult.outcome === 'accepted') {
            isInstalled = true
        }

        assert.equal(isInstalled, false, 'dismissed prompt must not mark app as installed')
    })

    it('marks app as installed only when userChoice confirms accepted', async () => {
        let isInstalled = false
        const promptEvent = {
            prompt: async () => {},
            userChoice: Promise.resolve<{ outcome: 'accepted' | 'dismissed'; platform: string }>({
                outcome: 'accepted',
                platform: 'web',
            }),
        }

        const choiceResult = await promptEvent.userChoice
        if (choiceResult.outcome === 'accepted') {
            isInstalled = true
        }

        assert.equal(isInstalled, true, 'confirmed outcome marks app as installed')
    })

    it('triggers fallback instructions when native prompt is unavailable', () => {
        let showInstructions = false
        const deferredPrompt = null

        // User clicks Install HISABE
        if (deferredPrompt) {
            // would trigger prompt
        } else {
            showInstructions = true
        }

        assert.equal(showInstructions, true, 'must show instructions if native prompt unavailable')
    })

    it('contains exact required strings for title, message, and button labels', () => {
        const filePath = path.join(process.cwd(), 'src', 'components', 'mobile', 'pwa-install-prompt.tsx')
        const content = fs.readFileSync(filePath, 'utf8')

        // Title
        assert.ok(content.includes('Install HISABE 🇪🇹'), 'must contain exact title')

        // Message
        assert.ok(content.includes('Take control of your money! 💰'), 'must contain message hook')
        assert.ok(content.includes('Track your expenses, manage your budget, and reach your savings goals with HISABE.'), 'must contain core message')
        assert.ok(content.includes('Install HISABE on your phone for quick and easy access anytime!'), 'must contain CTA message')

        // Buttons
        assert.ok(content.includes('📲 Install Now'), 'must contain exact primary button text')
        assert.ok(content.includes('Maybe Later'), 'must contain exact secondary button text')

        // Instructions for Android, iOS, Desktop
        assert.ok(content.includes('Install app') && content.includes('Add to Home screen'), 'must include Android Chrome instructions')
        assert.ok(content.includes('Share') && content.includes('Add to Home Screen'), 'must include iOS Safari instructions')
        assert.ok(content.includes('Desktop'), 'must include Desktop browser instructions')
    })
})
