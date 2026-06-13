import { supabase } from '@/shared/lib/supabase';

/**
 * Dictionary of words for login generation
 * Rivers, lakes, animals, geographic objects
 */
const WORDS = [
  // Existing logins from other site
  'ОКРУГ', 'ГРАНАТ', 'ГЛОБУС', 'ЭНЦЕЛАД', 'КОРДОБА',
  'ГАЛИСИЯ', 'ГУДЗОН', 'НЕМАН',

  // Rivers
  'ВОЛГА', 'ДНЕПР', 'ДОН', 'АМУР', 'ЛЕНА', 'ОБЬ', 'ЕНИСЕЙ',
  'АМАЗОНКА', 'НИЛ', 'МИССИСИПИ', 'ЯНЦЗЫ', 'КОНГО', 'ТЕМЗА',
  'СЕНА', 'РИО', 'ДУНАЙ', 'РЕЙН',

  // Lakes
  'БАЙКАЛ', 'ЛАДОГА', 'ОНЕЖСКОЕ', 'КАСПИЙ', 'ВИКТОРИЯ',
  'ТАНГАНЬИКА', 'ГУРОН', 'МИЧИГАН',

  // Mountains and geographic objects
  'ЭВЕРЕСТ', 'АЛЬПЫ', 'АНДЫ', 'УРАЛ', 'КАВКАЗ', 'АТЛАС',
  'КИЛИМАНДЖАРО', 'МОНБЛАН', 'ЭЛЬБРУС', 'ГИМАЛАИ',

  // Animals
  'ТИГР', 'ЛЕВ', 'МЕДВЕДЬ', 'ВОЛК', 'ОРЁЛ', 'СОКОЛ',
  'ДЕЛЬФИН', 'АКУЛА', 'КИТ', 'ПАНТЕРА', 'ГЕПАРД', 'БАРС',
  'РЫСЬ', 'СОВА', 'ЯСТРЕБ',

  // Planets and space
  'МАРС', 'ЮПИТЕР', 'САТУРН', 'ПЛУТОН', 'НЕПТУН',
  'ТИТАН', 'ЕВРОПА', 'ГАНИМЕД', 'ЦЕРЕРА',

  // Cities and places
  'ПАРИЖ', 'ЛОНДОН', 'ТОКИО', 'ПЕКИН', 'ДЕЛИ', 'КАИР',
  'РИМ', 'АФИНЫ', 'ОСЛО', 'КИЕВ', 'МИНСК',
];

/**
 * Generate login: WORD + 3 digits
 * Example: ОКРУГ460, ГРАНАТ622
 */
export function generateLogin(): string {
  const word = WORDS[Math.floor(Math.random() * WORDS.length)];
  const digits = Math.floor(Math.random() * 1000)
    .toString()
    .padStart(3, '0');
  return `${word}${digits}`;
}

/**
 * Generate unique login (checks database for uniqueness)
 */
export async function generateUniqueLogin(): Promise<string> {
  const maxAttempts = 10;

  for (let i = 0; i < maxAttempts; i++) {
    const login = generateLogin();

    // Check uniqueness
    const { data } = await supabase
      .from('profiles')
      .select('id')
      .eq('generated_login', login)
      .maybeSingle();

    if (!data) {
      return login;
    }
  }

  throw new Error('Не удалось сгенерировать уникальный логин после 10 попыток');
}

/**
 * Validate login format
 * @returns null if valid, error message if invalid
 */
export function validateLogin(login: string): string | null {
  // Only uppercase Cyrillic letters and digits
  const regex = /^[А-ЯЁ0-9]+$/;

  if (!login || login.length < 5 || login.length > 15) {
    return 'Логин должен быть от 5 до 15 символов';
  }

  if (!regex.test(login)) {
    return 'Логин должен содержать только заглавные русские буквы и цифры';
  }

  return null;
}
