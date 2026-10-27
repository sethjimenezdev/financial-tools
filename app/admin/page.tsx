import { notFound, redirect } from 'next/navigation'
import { auth } from '@/auth'
import { isAdminUser } from '@/lib/admin'
import { AdminUsers } from '@/components/admin-users'

export default async function AdminPage() {
  const session = await auth()
  if (!session?.user?.id) redirect('/login?callbackUrl=/admin')
  // Don't advertise the page to non-admins.
  if (!(await isAdminUser(session.user.id))) notFound()
  return <AdminUsers currentUserId={session.user.id} />
}
