import { redirect } from 'next/navigation'
import { auth } from '@/auth'
import { CalculationsList } from '@/components/calculations-list'

export default async function CalculationsPage() {
  const session = await auth()
  if (!session?.user?.id) redirect('/login?callbackUrl=/calculations')
  return <CalculationsList />
}
