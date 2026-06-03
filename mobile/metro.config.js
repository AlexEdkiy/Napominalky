// Learn more https://docs.expo.io/guides/customizing-metro
const { getDefaultConfig } = require('expo/metro-config')

/** @type {import('expo/metro-config').MetroConfig} */
const config = getDefaultConfig(__dirname)

// Позволяет импортировать .sql-файлы миграций Drizzle как строки в Metro.
config.resolver.sourceExts.push('sql')

module.exports = config
