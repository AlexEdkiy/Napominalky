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

  it('resolves lk-dashboard under a requiresAuth parent (/lk)', () => {
    // requiresAuth объявлен на родителе /lk; защита наследуется через matched.
    const resolved = router.resolve({ name: 'lk-dashboard' })
    expect(resolved.matched.some(r => r.meta.requiresAuth)).toBe(true)
    expect(resolved.path).toBe('/lk')
  })

  it('registers lk notes routes protected via matched parent', () => {
    const list = router.resolve({ name: 'lk-notes' })
    const create = router.resolve({ name: 'lk-note-create' })
    const edit = router.resolve({ name: 'lk-note-edit', params: { uuid: 'x' } })
    expect(list.matched.some(r => r.meta.requiresAuth)).toBe(true)
    expect(create.matched.some(r => r.meta.requiresAuth)).toBe(true)
    expect(edit.matched.some(r => r.meta.requiresAuth)).toBe(true)
    expect(create.path).toBe('/lk/notes/new')
    expect(edit.path).toBe('/lk/notes/x')
  })

  it('mounts lk routes under the LkLayout parent', () => {
    const resolved = router.resolve({ name: 'lk-account' })
    // Родитель (LkLayout) + дочерний раздел → минимум два совпадения в matched.
    expect(resolved.matched.length).toBeGreaterThanOrEqual(2)
    expect(resolved.matched[0]?.path).toBe('/lk')
  })

  it('has forgot-password route at /forgot-password', () => {
    const route = router.getRoutes().find(r => r.name === 'forgot-password')
    expect(route).toBeDefined()
    expect(route?.path).toBe('/forgot-password')
  })

  it('has reset-password route at /reset-password', () => {
    const route = router.getRoutes().find(r => r.name === 'reset-password')
    expect(route).toBeDefined()
    expect(route?.path).toBe('/reset-password')
  })

  it('forgot-password route does not require auth', () => {
    const resolved = router.resolve({ name: 'forgot-password' })
    expect(resolved.matched.some(r => r.meta.requiresAuth)).toBe(false)
  })

  it('reset-password route does not require auth', () => {
    const resolved = router.resolve({ name: 'reset-password' })
    expect(resolved.matched.some(r => r.meta.requiresAuth)).toBe(false)
  })
})
