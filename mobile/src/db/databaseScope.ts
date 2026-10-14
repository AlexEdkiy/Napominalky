const names = new WeakMap<object, string>()
let active: string | undefined

export const registerDatabaseScope = (database: object, name: string): void => { names.set(database, name) }
export const databaseScope = (database: object): string | undefined => names.get(database)
export const setActiveDatabaseScope = (name: string): void => { active = name }
export const activeDatabaseScope = (): string | undefined => active
