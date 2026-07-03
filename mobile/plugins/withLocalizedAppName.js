// @ts-check
/**
 * Config plugin: локализованное отображаемое имя приложения (лаунчер-лейбл) на Android.
 *
 * - values/strings.xml (default, fallback для любой локали, включая английскую) → "Napominalky"
 * - values-ru/strings.xml (системный язык устройства = русский)               → "Напоминалки"
 *
 * Android сам выбирает подходящий values-XX/strings.xml по локали устройства для ресурса,
 * на который ссылается `android:label="@string/app_name"` в AndroidManifest.xml — рантайм
 * логика локализации не требуется, всё решается статическими ресурсами.
 *
 * Идемпотентен: повторный prebuild перезаписывает только ключ `app_name`, не трогая
 * остальные строковые ресурсы.
 */
const {
  withStringsXml,
  withDangerousMod,
  withAndroidManifest,
  AndroidConfig,
  XML,
} = require('@expo/config-plugins');
const path = require('path');

const DEFAULT_APP_NAME = 'Napominalky';
const RU_APP_NAME = 'Напоминалки';
const APP_NAME_STRING_RESOURCE = '@string/app_name';

/**
 * @param {import('@expo/config-plugins').ExpoConfig} config
 */
function withLocalizedAppName(config) {
  config = withDefaultAppNameStringResource(config);
  config = withRussianAppNameStringResource(config);
  config = withAppNameManifestLabel(config);
  return config;
}

/**
 * Прописывает `app_name` в дефолтном `android/app/src/main/res/values/strings.xml`.
 * Выполняется после встроенного `AndroidConfig.Name.withName` (который берёт значение
 * из `expo.name`), поэтому переопределяет его результат — итоговый fallback-лейбл
 * гарантированно "Napominalky", независимо от значения `expo.name` в app.json.
 */
function withDefaultAppNameStringResource(config) {
  return withStringsXml(config, (config) => {
    config.modResults = AndroidConfig.Strings.setStringItem(
      [AndroidConfig.Resources.buildResourceItem({ name: 'app_name', value: DEFAULT_APP_NAME })],
      config.modResults
    );
    return config;
  });
}

/**
 * Создаёт (или дополняет, если уже существует) `values-ru/strings.xml` с локализованным
 * `app_name`. `withStringsXml` в @expo/config-plugins работает только с дефолтной папкой
 * `values/`, поэтому для локали `ru` файл читается/пишется напрямую через `withDangerousMod`.
 */
function withRussianAppNameStringResource(config) {
  return withDangerousMod(config, [
    'android',
    async (config) => {
      const stringsRuPath = path.join(
        config.modRequest.platformProjectRoot,
        'app/src/main/res/values-ru/strings.xml'
      );

      const stringsRuXml = await AndroidConfig.Resources.readResourcesXMLAsync({
        path: stringsRuPath,
      });

      const modResults = AndroidConfig.Strings.setStringItem(
        [AndroidConfig.Resources.buildResourceItem({ name: 'app_name', value: RU_APP_NAME })],
        stringsRuXml
      );

      await XML.writeXMLAsync({ path: stringsRuPath, xml: modResults });

      return config;
    },
  ]);
}

/**
 * Защитная мера: убеждается, что `android:label` тега `<application>` в AndroidManifest.xml
 * ссылается на `@string/app_name`, а не захардкожен. Стандартный шаблон Expo уже
 * генерирует `android:label="@string/app_name"`, поэтому обычно этот мод ничего не меняет —
 * но если какой-то другой плагин/шаблон это изменит, лейбл будет принудительно возвращён
 * на строковый ресурс, иначе локализация app_name не будет иметь эффекта.
 */
function withAppNameManifestLabel(config) {
  return withAndroidManifest(config, (config) => {
    const mainApplication = AndroidConfig.Manifest.getMainApplicationOrThrow(config.modResults);
    mainApplication.$['android:label'] = APP_NAME_STRING_RESOURCE;
    return config;
  });
}

module.exports = withLocalizedAppName;
