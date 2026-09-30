/** Unit-test query builder supporting both synchronous .all() and await.
 * Atomicity is covered separately by atomicWrites.test.ts on real SQLite.
 */
export const returningRows = <T>(read: () => T[]) => ({
  all: read,
  then: (resolve: (rows: T[]) => unknown, reject: (error: unknown) => unknown) =>
    Promise.resolve().then(read).then(resolve, reject),
})
