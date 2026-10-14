import { db, type Database } from '../client'

/** Resolve once per call; an async method keeps its original DB through every await. */
export const activeRepository = <T extends object>(factory: (database: Database) => T): T =>
  new Proxy({} as T, {
    get: (_target, key) => {
      const instance = factory(db)
      const member: unknown = Reflect.get(instance, key)
      return typeof member === 'function' ? member.bind(instance) : member
    },
  })
