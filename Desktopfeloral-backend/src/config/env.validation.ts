const REQUIRED_ENV_KEYS = [
  'DATABASE_URL',
  'JWT_ACCESS_SECRET',
  'JWT_REFRESH_SECRET',
] as const;

export function validateEnvironment(
  config: Record<string, unknown>,
): Record<string, unknown> {
  const missing = REQUIRED_ENV_KEYS.filter((key) => {
    const value = config[key];
    return typeof value !== 'string' || value.trim().length === 0;
  });

  if (missing.length > 0) {
    throw new Error(
      `متغیرهای محیطی الزامی تعریف نشده‌اند: ${missing.join(', ')}`,
    );
  }

  const accessSecret = String(config.JWT_ACCESS_SECRET);
  const refreshSecret = String(config.JWT_REFRESH_SECRET);

  if (accessSecret.length < 32 || refreshSecret.length < 32) {
    throw new Error(
      'JWT_ACCESS_SECRET و JWT_REFRESH_SECRET باید حداقل 32 کاراکتر باشند',
    );
  }

  if (accessSecret === refreshSecret) {
    throw new Error('کلید Access و Refresh نباید یکسان باشند');
  }

  const postexEnabled = ['true', '1', 'yes'].includes(
    String(config.POSTEX_ENABLED ?? 'false').toLowerCase(),
  );

  if (postexEnabled) {
    const hasStaticToken =
      typeof config.POSTEX_API_TOKEN === 'string' &&
      config.POSTEX_API_TOKEN.trim().length > 0;
    const hasApiKey =
      typeof config.POSTEX_API_KEY === 'string' &&
      config.POSTEX_API_KEY.trim().length > 0;
    const hasCredentials =
      typeof config.POSTEX_USERNAME === 'string' &&
      config.POSTEX_USERNAME.trim().length > 0 &&
      typeof config.POSTEX_PASSWORD === 'string' &&
      config.POSTEX_PASSWORD.trim().length > 0;

    if (!hasStaticToken && !hasApiKey && !hasCredentials) {
      throw new Error(
        'برای Postex باید API Token، API Key یا نام کاربری و رمز عبور تنظیم شود',
      );
    }

    const baseUrl = String(config.POSTEX_BASE_URL || 'https://api.postex.ir');
    try {
      const parsed = new URL(baseUrl);
      if (parsed.protocol !== 'https:') {
        throw new Error('POSTEX_BASE_URL باید HTTPS باشد');
      }
    } catch {
      throw new Error('POSTEX_BASE_URL معتبر نیست');
    }

    if (
      typeof config.POSTEX_WEBHOOK_SECRET !== 'string' ||
      config.POSTEX_WEBHOOK_SECRET.trim().length < 16
    ) {
      throw new Error('POSTEX_WEBHOOK_SECRET باید حداقل 16 کاراکتر باشد');
    }
  }

  return config;
}
