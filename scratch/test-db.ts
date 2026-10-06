import dns from 'node:dns'

dns.setDefaultResultOrder('ipv4first')

import { neon } from '@neondatabase/serverless'

async function run() {
  console.log('Resolving DNS for Neon host...')
  try {
    const ips = await dns.promises.resolve4('ep-flat-brook-b5fdbyiu.c-7.us-east-2.aws.neon.tech')
    console.log('Resolved IPs:', ips)
  } catch (e) {
    console.error('DNS resolve error:', e)
  }

  const rawSql = neon('postgresql://neondb_owner:npg_po6ROt9CNhdf@ep-flat-brook-b5fdbyiu.c-7.us-east-2.aws.neon.tech/neondb?sslmode=require')
  try {
    const res = await rawSql`SELECT 1 as test`
    console.log('DB SUCCESS:', res)
  } catch (err) {
    console.error('DB ERROR:', err)
  }
}

run()
