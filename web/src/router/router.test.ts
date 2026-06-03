import { describe, it, expect } from 'vitest'
import { router } from './index'

describe('router', () => {
  it('has login route', () => {
    const route = router.getRoutes().find(r => r.name === 'login')
    expect(route).toBeDefined()
  })

  it('has admin-dashboard route', () => {
    const route = router.getRoutes().find(r => r.name === 'admin-dashboard')
    expect(route).toBeDefined()
  })

  it('has lk-dashboard route', () => {
    const route = router.getRoutes().find(r => r.name === 'lk-dashboard')
    expect(route).toBeDefined()
  })

  it('admin-dashboard route inherits requiresAuth and requiresAdmin via meta', () => {
    // Vue Router merges parent meta into child routes
    const route = router.getRoutes().find(r => r.name === 'admin-dashboard')
    expect(route?.meta.requiresAuth).toBe(true)
    expect(route?.meta.requiresAdmin).toBe(true)
  })

  it('lk-dashboard route inherits requiresAuth via meta', () => {
    const route = router.getRoutes().find(r => r.name === 'lk-dashboard')
    expect(route?.meta.requiresAuth).toBe(true)
  })
})
