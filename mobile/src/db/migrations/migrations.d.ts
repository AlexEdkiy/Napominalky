// Типы для сгенерированного drizzle-kit файла migrations.js.
// .sql-файлы инлайнятся babel-plugin-inline-import как строки.
declare const migrations: {
  journal: {
    entries: {
      idx: number
      when: number
      tag: string
      breakpoints: boolean
    }[]
  }
  migrations: Record<string, string>
}

export default migrations
