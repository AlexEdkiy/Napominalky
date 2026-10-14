import { useEffect } from 'react'
import { router } from 'expo-router'
import { useAuthStore } from '@/stores/authStore'

/** DbProvider mounts this only after the new storage and the root Stack are ready. */
export default function SessionNavigation(): null {
  const target = useAuthStore((state) => state.navigationTarget)
  useEffect(() => {
    if (!target) return
    router.replace(target === 'home' ? '/(tabs)' : '/(auth)/login')
    useAuthStore.setState({ navigationTarget: null })
  }, [target])
  return null
}
