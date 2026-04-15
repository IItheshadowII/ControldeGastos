import { redirect } from 'next/navigation'

export default function Home() {
    // Redirige directamente a la página de login
    redirect('/login')
}
