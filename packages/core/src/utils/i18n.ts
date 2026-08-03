export type LocaleDirection = 'ltr' | 'rtl'

export interface LocaleDefinition<Code extends string = string> {
  /** URL/path code, e.g. "en", "es", "zh". */
  code: Code
  /** English/admin display name. */
  name: string
  /** Native display name for language switchers. */
  nativeName: string
  /** BCP 47 tag for <html lang> and hreflang, e.g. "zh-Hans". */
  htmlLang?: string
  /** Text direction. Defaults to "ltr". */
  direction?: LocaleDirection
  /** Optional marker for UI consumers; defaultLocale remains authoritative. */
  default?: boolean
}

export interface I18nConfig<Code extends string = string> {
  defaultLocale: Code
  locales: readonly LocaleDefinition<Code>[]
  /** Prefix default-locale URLs, e.g. /en/about. Defaults to false. */
  prefixDefaultLocale?: boolean
}

export interface LocalizedRoute<Code extends string = string> {
  locale: Code
  path: string
}

export interface LocalizedPathOptions<Code extends string = string> {
  locale: Code
  path?: string
  defaultLocale: Code
  prefixDefaultLocale?: boolean
}

export interface LocalePathInfo<Code extends string = string> {
  locale: Code
  path: string
}

export interface LanguageAlternateOptions {
  /** Include x-default pointing at the default-locale URL. Defaults to true. */
  includeXDefault?: boolean
  /** Optional absolute site URL for sitemap consumers that need absolute URLs. */
  siteUrl?: string
}

export interface LocalizedPage<Code extends string = string> {
  /** Canonical untranslated/default-locale path, e.g. /gospel. */
  path: string
  /** Locales that currently have a translated page. Defaults to all configured locales. */
  locales?: readonly Code[]
}

export interface LanguageSwitchLink<Code extends string = string> {
  locale: Code
  label: string
  nativeLabel: string
  htmlLang: string
  direction: LocaleDirection
  href: string
  isCurrentLocale: boolean
  isTranslated: boolean
}

export interface LanguageSwitchOptions<Code extends string = string> {
  currentLocale: Code
  path: string
  /** Restrict links to locales with translated content for this page. Defaults to all locales. */
  availableLocales?: readonly Code[]
  /** Fallback path when a locale is not translated. Defaults to that locale's home page. */
  fallbackPath?: string
}

function trimTrailingSlash(path: string): string {
  let result = path
  if (path.length > 1 && path.endsWith('/')) {
    result = path.slice(0, -1)
  }

  return result
}

function normalizePath(path: string = '/'): string {
  const withoutQuery = path.split(/[?#]/, 1)[0] || '/'
  const withLeadingSlash = withoutQuery.startsWith('/') ? withoutQuery : `/${withoutQuery}`
  const result = trimTrailingSlash(withLeadingSlash)

  return result
}

function joinUrl(siteUrl: string, path: string): string {
  const normalizedSite = siteUrl.endsWith('/') ? siteUrl.slice(0, -1) : siteUrl
  const normalizedPath = normalizePath(path)
  const result = normalizedPath === '/' ? `${normalizedSite}/` : `${normalizedSite}${normalizedPath}/`

  return result
}

export function getLocaleDefinition<Code extends string>(
  config: I18nConfig<Code>,
  locale: Code,
): LocaleDefinition<Code> | undefined {
  const result = config.locales.find((entry) => entry.code === locale)

  return result
}

export function isSupportedLocale<Code extends string>(
  config: I18nConfig<Code>,
  locale: string,
): locale is Code {
  const result = config.locales.some((entry) => entry.code === locale)

  return result
}

export function getHtmlLang<Code extends string>(config: I18nConfig<Code>, locale: Code): string {
  const result = getLocaleDefinition(config, locale)?.htmlLang ?? locale

  return result
}

export function getLocaleDirection<Code extends string>(
  config: I18nConfig<Code>,
  locale: Code,
): LocaleDirection {
  const result = getLocaleDefinition(config, locale)?.direction ?? 'ltr'

  return result
}

export function getLocalizedLocaleCodes<Code extends string>(config: I18nConfig<Code>): Code[] {
  const result = config.locales
    .map((locale) => locale.code)
    .filter((locale) => config.prefixDefaultLocale || locale !== config.defaultLocale)

  return result
}

export function buildLocalizedPath<Code extends string>({
  locale,
  path = '/',
  defaultLocale,
  prefixDefaultLocale = false,
}: LocalizedPathOptions<Code>): string {
  const normalizedPath = normalizePath(path)
  let result = normalizedPath

  if (locale !== defaultLocale || prefixDefaultLocale) {
    result = normalizedPath === '/' ? `/${locale}` : `/${locale}${normalizedPath}`
  }

  return result
}

export function stripLocalePrefix<Code extends string>(
  config: I18nConfig<Code>,
  path: string,
): LocalePathInfo<Code> {
  const normalizedPath = normalizePath(path)
  const [, maybeLocale, ...rest] = normalizedPath.split('/')
  let result: LocalePathInfo<Code> = { locale: config.defaultLocale, path: normalizedPath }

  if (maybeLocale && isSupportedLocale(config, maybeLocale)) {
    result = {
      locale: maybeLocale,
      path: rest.length > 0 ? `/${rest.join('/')}` : '/',
    }
  }

  return result
}

export function localizeRoutes<Code extends string>(
  config: I18nConfig<Code>,
  paths: readonly string[],
): LocalizedRoute<Code>[] {
  const result = config.locales.flatMap((locale) =>
    paths.map((path) => ({
      locale: locale.code,
      path: buildLocalizedPath({
        locale: locale.code,
        path,
        defaultLocale: config.defaultLocale,
        prefixDefaultLocale: config.prefixDefaultLocale,
      }),
    })),
  )

  return result
}

export function localizePages<Code extends string>(
  config: I18nConfig<Code>,
  pages: readonly LocalizedPage<Code>[],
): LocalizedRoute<Code>[] {
  const result = pages.flatMap((page) => {
    const pageLocales = page.locales ?? config.locales.map((locale) => locale.code)
    const localizedRoutes = pageLocales.map((locale) => ({
      locale,
      path: buildLocalizedPath({
        locale,
        path: page.path,
        defaultLocale: config.defaultLocale,
        prefixDefaultLocale: config.prefixDefaultLocale,
      }),
    }))

    return localizedRoutes
  })

  return result
}

export function buildLanguageAlternates<Code extends string>(
  config: I18nConfig<Code>,
  path: string,
  options: LanguageAlternateOptions = {},
): Record<string, string> {
  const { includeXDefault = true, siteUrl } = options
  const alternates = Object.fromEntries(
    config.locales.map((locale) => {
      const localizedPath = buildLocalizedPath({
        locale: locale.code,
        path,
        defaultLocale: config.defaultLocale,
        prefixDefaultLocale: config.prefixDefaultLocale,
      })
      const href = siteUrl ? joinUrl(siteUrl, localizedPath) : localizedPath
      const entry: [string, string] = [getHtmlLang(config, locale.code), href]

      return entry
    }),
  )

  if (includeXDefault) {
    const localizedPath = buildLocalizedPath({
      locale: config.defaultLocale,
      path,
      defaultLocale: config.defaultLocale,
      prefixDefaultLocale: config.prefixDefaultLocale,
    })
    alternates['x-default'] = siteUrl ? joinUrl(siteUrl, localizedPath) : localizedPath
  }

  return alternates
}

export function buildLanguageSwitchLinks<Code extends string>(
  config: I18nConfig<Code>,
  options: LanguageSwitchOptions<Code>,
): LanguageSwitchLink<Code>[] {
  const { currentLocale, path, availableLocales, fallbackPath = '/' } = options
  const translatedLocales = new Set<Code>(availableLocales ?? config.locales.map((locale) => locale.code))
  const result = config.locales.map((locale) => {
    const isTranslated = translatedLocales.has(locale.code)
    const targetPath = isTranslated ? path : fallbackPath
    const href = buildLocalizedPath({
      locale: locale.code,
      path: targetPath,
      defaultLocale: config.defaultLocale,
      prefixDefaultLocale: config.prefixDefaultLocale,
    })
    const link: LanguageSwitchLink<Code> = {
      locale: locale.code,
      label: locale.name,
      nativeLabel: locale.nativeName,
      htmlLang: getHtmlLang(config, locale.code),
      direction: locale.direction ?? 'ltr',
      href,
      isCurrentLocale: locale.code === currentLocale,
      isTranslated,
    }

    return link
  })

  return result
}
