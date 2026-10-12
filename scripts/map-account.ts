import dotenv from 'dotenv'
dotenv.config({ path: '.env.local' })
import { neon } from '@neondatabase/serverless'
import { initializeApp, getApps, getApp, cert } from 'firebase-admin/app'
import { getAuth } from 'firebase-admin/auth'
import * as readline from 'readline'

function normalizePrivateKey(rawKey: string): string {
    let key = rawKey.trim()
    if ((key.startsWith('"') && key.endsWith('"')) || (key.startsWith("'") && key.endsWith("'"))) {
        key = key.slice(1, -1)
    }
    return key.replace(/\\n/g, '\n').replace(/\r/g, '')
}

function getAdminAuth() {
    if (getApps().length > 0) {
        return getAuth(getApp())
    }

    const projectId = process.env.FIREBASE_PROJECT_ID || process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID
    const clientEmail = process.env.FIREBASE_CLIENT_EMAIL
    const privateKeyRaw = process.env.FIREBASE_PRIVATE_KEY
    const serviceAccountJson = process.env.FIREBASE_SERVICE_ACCOUNT_KEY

    if (serviceAccountJson && serviceAccountJson.trim().length > 0) {
        const parsed = JSON.parse(serviceAccountJson)
        if (parsed.private_key) parsed.private_key = normalizePrivateKey(parsed.private_key)
        return getAuth(
            initializeApp({
                credential: cert(parsed),
                projectId: projectId || parsed.project_id,
            })
        )
    }

    if (clientEmail && privateKeyRaw) {
        return getAuth(
            initializeApp({
                credential: cert({
                    projectId,
                    clientEmail,
                    privateKey: normalizePrivateKey(privateKeyRaw),
                }),
                projectId,
            })
        )
    }

    return getAuth(initializeApp({ projectId }))
}

function getSql() {
    const databaseUrl = process.env.DATABASE_URL
    if (!databaseUrl) {
        throw new Error('DATABASE_URL environment variable is missing')
    }
    return neon(databaseUrl.replace(/\.neon\.tech\./, '.neon.tech'))
}

function maskEmail(email: string): string {
    if (!email || !email.includes('@')) return email || '(no email)'
    const [name, domain] = email.split('@')
    const maskedName = name.length > 2 ? `${name.substring(0, 2)}***` : `${name}*`
    return `${maskedName}@${domain}`
}

function promptUser(question: string): Promise<string> {
    const rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout,
    })
    return new Promise((resolve) => {
        rl.question(question, (answer) => {
            rl.close()
            resolve(answer.trim())
        })
    })
}

async function listProfiles() {
    const sql = getSql()
    console.log('\n================ EXISTING PROFILES & FINANCIAL CONTEXT ================')

    const rows = (await sql`
        SELECT
            p.id,
            p.email,
            p.full_name,
            p.default_currency,
            p.created_at,
            (SELECT COUNT(*) FROM accounts a WHERE a.user_id = p.id) as account_count,
            (SELECT COUNT(*) FROM transactions t WHERE t.user_id = p.id) as transaction_count
        FROM profiles p
        ORDER BY p.created_at ASC
    `) as {
        id: string
        email: string
        full_name: string
        default_currency: string
        created_at: string
        account_count: string
        transaction_count: string
    }[]

    const mappings = (await sql`
        SELECT firebase_uid, canonical_user_id, created_at FROM auth_identity_mappings
    `) as { firebase_uid: string; canonical_user_id: string; created_at: string }[]

    const mappingMap = new Map<string, string>()
    for (const m of mappings) {
        mappingMap.set(m.canonical_user_id, m.firebase_uid)
    }

    console.log(`Found ${rows.length} total profiles in Neon:\n`)
    rows.forEach((r, idx) => {
        const mappedUid = mappingMap.get(r.id)
        const status = mappedUid ? `[MAPPED to Firebase: ${mappedUid}]` : '[UNMAPPED]'
        console.log(`[${idx + 1}] ID: ${r.id}`)
        console.log(`    Name:       ${r.full_name || 'N/A'}`)
        console.log(`    Email:      ${maskEmail(r.email)}`)
        console.log(`    Currency:   ${r.default_currency}`)
        console.log(`    Financials: ${r.account_count} accounts, ${r.transaction_count} transactions`)
        console.log(`    Status:     ${status}`)
        console.log('-----------------------------------------------------------------------')
    })
    console.log('\nUse: npx tsx scripts/map-account.ts map --uid <FIREBASE_UID> --canonical <CANONICAL_ID>')
    console.log('Or:  npx tsx scripts/map-account.ts verify-token --token <ID_TOKEN> --canonical <CANONICAL_ID>\n')
}

async function mapAccount(options: {
    firebaseUid?: string
    idToken?: string
    canonicalUserId?: string
    forceConfirm?: boolean
}) {
    const auth = getAdminAuth()
    const sql = getSql()

    let verifiedUid = options.firebaseUid?.trim()
    let verifiedEmail = ''
    let providerInfo = ''

    // 1. Verify Identity Authenticity
    if (options.idToken) {
        console.log('\n[1/5] Cryptographically verifying Firebase ID token...')
        try {
            const decoded = await auth.verifyIdToken(options.idToken.trim(), false)
            verifiedUid = decoded.uid
            verifiedEmail = decoded.email || ''
            providerInfo = decoded.firebase.sign_in_provider || 'custom'
            console.log(`✓ Token verified cryptographically!`)
            console.log(`  Authenticated Firebase UID: ${verifiedUid}`)
            console.log(`  Provider:                   ${providerInfo}`)
        } catch (err: unknown) {
            const error = err as { message?: string }
            console.error(`✗ Error: Invalid or expired Firebase ID token: ${error.message}`)
            process.exit(1)
        }
    } else if (verifiedUid) {
        console.log('\n[1/5] Verifying Firebase account exists in Firebase Auth project...')
        try {
            const userRecord = await auth.getUser(verifiedUid)
            verifiedEmail = userRecord.email || ''
            providerInfo = userRecord.providerData.map((p) => p.providerId).join(', ') || 'password'
            console.log(`✓ Firebase account confirmed in project!`)
            console.log(`  Firebase UID: ${userRecord.uid}`)
            console.log(`  Provider:     ${providerInfo}`)
        } catch (err: unknown) {
            const error = err as { message?: string }
            console.error(`✗ Error: Firebase user "${verifiedUid}" does not exist in Firebase project: ${error.message}`)
            process.exit(1)
        }
    } else {
        console.error('Error: Please provide either --token <idToken> or --uid <firebaseUid>')
        process.exit(1)
    }

    const canonicalId = options.canonicalUserId?.trim()
    if (!canonicalId) {
        console.error('Error: Missing --canonical <canonicalUserId>')
        process.exit(1)
    }

    // 2. Verify target profile exists in Neon
    console.log('\n[2/5] Verifying target profile in Neon DB...')
    const profiles = (await sql`
        SELECT id, email, full_name, default_currency,
               (SELECT COUNT(*) FROM accounts WHERE user_id = ${canonicalId}) as account_count,
               (SELECT COUNT(*) FROM transactions WHERE user_id = ${canonicalId}) as transaction_count
        FROM profiles WHERE id = ${canonicalId} LIMIT 1
    `) as {
        id: string
        email: string
        full_name: string
        default_currency: string
        account_count: string
        transaction_count: string
    }[]

    if (profiles.length === 0) {
        console.error(`✗ Error: Canonical profile "${canonicalId}" does not exist in Neon profiles table!`)
        process.exit(1)
    }

    const targetProfile = profiles[0]
    console.log(`✓ Target profile confirmed:`)
    console.log(`  Canonical ID: ${targetProfile.id}`)
    console.log(`  Owner:        ${targetProfile.full_name} (${maskEmail(targetProfile.email)})`)
    console.log(`  Data:         ${targetProfile.account_count} accounts, ${targetProfile.transaction_count} transactions`)

    // 3. Check for existing mapping conflicts
    console.log('\n[3/5] Checking uniqueness constraints...')
    const existingUidMapping = (await sql`
        SELECT firebase_uid, canonical_user_id FROM auth_identity_mappings WHERE firebase_uid = ${verifiedUid}
    `) as { firebase_uid: string; canonical_user_id: string }[]

    if (existingUidMapping.length > 0) {
        if (existingUidMapping[0].canonical_user_id === canonicalId) {
            console.log(`✓ Exact mapping already exists in database. No update required.`)
            process.exit(0)
        } else {
            console.error(`✗ Conflict: Firebase UID [${verifiedUid}] is ALREADY mapped to a different canonical ID [${existingUidMapping[0].canonical_user_id}]!`)
            console.error(`  Operation aborted to prevent data corruption.`)
            process.exit(1)
        }
    }

    const existingCanonicalMapping = (await sql`
        SELECT firebase_uid, canonical_user_id FROM auth_identity_mappings WHERE canonical_user_id = ${canonicalId}
    `) as { firebase_uid: string; canonical_user_id: string }[]

    if (existingCanonicalMapping.length > 0) {
        console.error(`✗ Conflict: Canonical profile [${canonicalId}] is ALREADY claimed by Firebase UID [${existingCanonicalMapping[0].firebase_uid}]!`)
        console.error(`  Operation aborted to prevent multi-tenant collision.`)
        process.exit(1)
    }

    // 4. Require Explicit Confirmation
    console.log('\n[4/5] Pending Mapping Plan:')
    console.log(`  + Firebase UID:   ${verifiedUid} (${maskEmail(verifiedEmail)})`)
    console.log(`  + Canonical ID:   ${canonicalId} (${targetProfile.full_name})`)
    console.log(`  + Scope:          ONLY inserts 1 row into auth_identity_mappings. Zero financial changes.`)

    if (!options.forceConfirm) {
        const answer = await promptUser('\nDo you confirm this mapping? (Type "yes" to apply): ')
        if (answer.toLowerCase() !== 'yes') {
            console.log('Mapping cancelled by user.')
            process.exit(0)
        }
    }

    // 5. Atomic Insertion
    console.log('\n[5/5] Writing mapping to Neon DB...')
    await sql`
        INSERT INTO auth_identity_mappings (firebase_uid, canonical_user_id)
        VALUES (${verifiedUid}, ${canonicalId})
    `

    console.log(`\n================ SUCCESS: ACCOUNT MAPPING ESTABLISHED ================\n`)
    console.log(`Firebase UID: [${verifiedUid}]`)
    console.log(`Canonical ID: [${canonicalId}]`)
    console.log(`When this user signs into Hisabe, they will immediately have access to all ${targetProfile.account_count} accounts and ${targetProfile.transaction_count} transactions.\n`)
}

async function main() {
    const args = process.argv.slice(2)
    const command = args[0]

    if (!command || command === 'list' || command === '--list' || command === '-l') {
        await listProfiles()
        return
    }

    let firebaseUid: string | undefined
    let idToken: string | undefined
    let canonicalUserId: string | undefined
    let forceConfirm = false

    for (let i = 0; i < args.length; i++) {
        if (args[i] === '--uid' && args[i + 1]) firebaseUid = args[i + 1]
        if (args[i] === '--token' && args[i + 1]) idToken = args[i + 1]
        if (args[i] === '--canonical' && args[i + 1]) canonicalUserId = args[i + 1]
        if (args[i] === '--yes' || args[i] === '-y') forceConfirm = true
    }

    if (command === 'map' || command === 'verify-token') {
        await mapAccount({ firebaseUid, idToken, canonicalUserId, forceConfirm })
    } else {
        console.log('Usage:')
        console.log('  npx tsx scripts/map-account.ts list')
        console.log('  npx tsx scripts/map-account.ts map --uid <UID> --canonical <CANONICAL_ID>')
        console.log('  npx tsx scripts/map-account.ts map --token <ID_TOKEN> --canonical <CANONICAL_ID>')
    }
}

main().catch((err) => {
    console.error('Fatal error:', err)
    process.exit(1)
})
