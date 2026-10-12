import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'

export default async function HomePage() {
  const cookieStore = await cookies()
  const sessionCookie = cookieStore.get('__session')?.value

  if (sessionCookie && sessionCookie.trim().length > 0) {
    redirect('/dashboard')
  } else {
    redirect('/sign-in')
  }
}