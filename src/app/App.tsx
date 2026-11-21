import { RouterProvider } from 'react-router-dom'
import { router } from './routes'
import { Toaster } from 'sonner'
import { AuthProvider } from '@/components/AuthProvider'

export function App() {
  return (
    <AuthProvider>
      <RouterProvider router={router} future={{ v7_startTransition: true }} />
      <Toaster position="top-right" richColors />
    </AuthProvider>
  )
}

export default App
