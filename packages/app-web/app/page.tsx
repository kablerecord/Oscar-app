import { redirect } from 'next/navigation'

export default function Home() {
  // Redirect to panel page (default view)
  redirect('/panel')
}
