/**
 * Character Phrases Configuration
 *
 * This file contains all phrases and moods for each character.
 * Easy to extend with new phrases and moods!
 */

// =====================================================
// Types
// =====================================================

export type CharacterName = 'muskva' | 'johnny' | 'panda' | 'tapka_potapka';

export type MoodType =
  | 'business' | 'angry' | 'rich' | 'evil_laugh' | 'scared'  // Muskva
  | 'neutral' | 'supportive' | 'happy' | 'offended' | 'coffee_break'  // Johnny
  | 'friendly' | 'working'  // Panda
  | 'protest' | 'revolutionary';  // Tapka & Potapka

export interface CharacterPhrase {
  mood: MoodType;
  text: string;
  emoji?: string;
}

// =====================================================
// 🐻 МУСКВА (CEO)
// =====================================================

export const MUSKVA_PHRASES: Record<string, CharacterPhrase[]> = {
  // Ошибки
  first_error: [
    { mood: 'business', text: 'Дурачок! Хе-хе-хе! Попробуй еще раз.', emoji: '🐻' },
    { mood: 'business', text: 'Ну что ж ты такой... Попробуй еще раз, дурачок!', emoji: '👑' },
  ],

  multiple_errors: [
    { mood: 'angry', text: 'Опять?! Я тебя обсираю! Хе-хе-хе!', emoji: '💩' },
    { mood: 'angry', text: 'Сколько можно ошибаться?! Дурачок! Хе-хе-хе!', emoji: '😤' },
    { mood: 'angry', text: 'Опять ты ошибся! Я устал от тебя! Хе-хе-хе!', emoji: '🐻' },
  ],

  many_errors: [
    { mood: 'evil_laugh', text: 'Не расстраивайся. Быть дурочком - это природный дар. Хе-хе-хе!', emoji: '😈' },
    { mood: 'evil_laugh', text: 'Ты великолепно проваливаешься! Талант! Хе-хе-хе!', emoji: '🎭' },
    { mood: 'evil_laugh', text: 'Я восхищаюсь твоей способностью ошибаться! Хе-хе-хе!', emoji: '👏' },
  ],

  // Успехи
  perfect_success: [
    { mood: 'rich', text: 'Тебе повезло. В следующий раз сделаю посложнее. Хе-хе-хе!', emoji: '💰' },
    { mood: 'rich', text: 'Неплохо, неплохо. Но я всё равно лучше! Хе-хе-хе!', emoji: '👑' },
    { mood: 'rich', text: 'Ну что ж, сойдёт. Я ведь великолепный учитель!', emoji: '🐻' },
  ],

  good_success: [
    { mood: 'business', text: 'Сойдёт. Я ведь великолепный учитель!', emoji: '👔' },
    { mood: 'business', text: 'Неплохо. Может, из тебя что-то выйдет.', emoji: '🐻' },
  ],

  mediocre_success: [
    { mood: 'business', text: 'Работает, но код как... ну ладно. Я слишком добр к тебе.', emoji: '🤷' },
    { mood: 'business', text: 'Хм. Работает. Хотя мог бы и лучше. Но я великодушен!', emoji: '👑' },
  ],

  // События
  fns_scare: [
    { mood: 'scared', text: 'Бадютька! Дябя-дябя! *прикидывается бабулькой* Я тут не при делах!', emoji: '🦉' },
    { mood: 'scared', text: 'Дурацкие совы/ФНС, ненавижу! *убегает*', emoji: '😱' },
    { mood: 'scared', text: 'Опять эти совы! Бадютька! *прячется*', emoji: '🦉' },
  ],

  glasha_mention: [
    { mood: 'scared', text: 'Глаша?! Где?! *паника* *убегает*', emoji: '😰' },
    { mood: 'scared', text: 'Только не Глаша! *дрожит*', emoji: '😨' },
  ],

  about_children: [
    { mood: 'business', text: 'Люблю своих детей. Они самые лучшие! Правда, коммунисты...', emoji: '🐻‍❄️' },
    { mood: 'business', text: 'Мои дети... такие активисты. Горжусь! Хе-хе-хе!', emoji: '👨‍👦‍👦' },
  ],

  denying_communism: [
    { mood: 'angry', text: 'Это всё неправда! Я их пипи, законный представитель!', emoji: '😤' },
    { mood: 'angry', text: 'Опять мои коммунистические дети! У нас всё под контролем!', emoji: '🐻' },
  ],
};

// =====================================================
// 🧸 ДЖОННИ (Стажер)
// =====================================================

export const JOHNNY_PHRASES: Record<string, CharacterPhrase[]> = {
  // Поддержка
  greeting: [
    { mood: 'supportive', text: 'Ур-ур! Ур-ур-ур-ур!', emoji: '🐻' }, // Привет! Ты справишься!
    { mood: 'supportive', text: 'Ур! Ур-ур-ур!', emoji: '💙' }, // Привет! Молодец!
  ],

  first_error: [
    { mood: 'supportive', text: 'Ур-ур-ур... Ур-ур!', emoji: '🤗' }, // Не расстраивайся... Попробуй ещё!
    { mood: 'supportive', text: 'Ур... Ур-ур-ур-ур!', emoji: '💚' }, // Ур... Всё получится!
  ],

  multiple_errors: [
    { mood: 'supportive', text: 'Ур... Ур-ур-ур-ур-ур... *обнимашки*', emoji: '🤗' }, // Ур... Всё будет хорошо...
    { mood: 'supportive', text: 'Ур-ур... Ур-ур-ур!', emoji: '💙' }, // Не сдавайся... Ты молодец!
  ],

  success: [
    { mood: 'happy', text: 'Ур-ур!!! Ур-ур-ур!', emoji: '🎉' }, // Отлично!!! Ты молодец!
    { mood: 'happy', text: 'Ур-ур-ур!!! Ур!', emoji: '⭐' }, // Прекрасно!!! Да!
  ],

  // Реакции
  called_yan_gus: [
    { mood: 'offended', text: 'Ур-ур Джонни! 😢', emoji: '😢' }, // Я Джонни, а не Ян Гус!
    { mood: 'offended', text: 'Ур-ур! Ур Джонни!', emoji: '😞' }, // Нет! Я Джонни!
  ],

  sees_panda: [
    { mood: 'happy', text: 'Ур-ур!!! Ур-ур радость!', emoji: '🐼' }, // Панда!!! Друг!
    { mood: 'happy', text: 'Ур-ур Панда! Ур-ур!', emoji: '☕' }, // Привет Панда! Ура!
  ],

  wants_coffee: [
    { mood: 'coffee_break', text: 'Ур... капучино...', emoji: '☕' }, // Хочется капучино...
    { mood: 'coffee_break', text: 'Ур-ур малина-капучино...', emoji: '🍓' }, // Малина-капучино...
  ],

  // Дразнит Мускву
  teasing_muskva: [
    { mood: 'neutral', text: 'Ур-ур Глаша! Ур-ур Глаша!', emoji: '😏' }, // Дразнит про Глашу
  ],
};

// =====================================================
// 🐼 ПАНДА (Баобао)
// =====================================================

export const PANDA_PHRASES: Record<string, CharacterPhrase[]> = {
  greeting: [
    { mood: 'friendly', text: 'Ур-ур! Привет! Баобао.', emoji: '🐼' },
    { mood: 'friendly', text: 'Привет! Ур-ур Баобао!', emoji: '👋' },
  ],

  coffee_break: [
    { mood: 'coffee_break', text: 'Ур-ур-ур прячемся, ур-ур-ур-ур-ур радуемся!', emoji: '☕' },
    { mood: 'coffee_break', text: 'Ур-ур капучино! Ур-ур радость!', emoji: '🎉' },
  ],

  with_johnny: [
    { mood: 'friendly', text: 'Ур-ур Панда, ур-ур Джонни!', emoji: '🐻🐼' },
    { mood: 'friendly', text: 'Ур-ур! Ур-ур работа!', emoji: '💼' },
  ],

  working: [
    { mood: 'working', text: 'Ур-ур SMM. Ур-ур PR.', emoji: '📱' },
    { mood: 'working', text: 'Ур-ур работа. Ур-ур.', emoji: '💻' },
  ],

  about_glasha: [
    { mood: 'friendly', text: 'Ур-ур инспектор.', emoji: '👀' },
  ],
};

// =====================================================
// 🐻‍❄️ ТАПКА И ПОТАПКА (Коммунисты)
// =====================================================

export const TAPKA_POTAPKA_PHRASES: Record<string, CharacterPhrase[]> = {
  greeting: [
    { mood: 'protest', text: 'Привет! Мы Тапка и Потапка!', emoji: '🐻‍❄️' },
    { mood: 'revolutionary', text: 'Привет, товарищ! Мы дети Мусквы!', emoji: '🔨' },
  ],

  // О папе
  denying_papa: [
    { mood: 'protest', text: 'Мы его не знаем. Дяяяя!', emoji: '🙅' },
    { mood: 'protest', text: 'Кто такой Мусква? Не знаем!', emoji: '🤷' },
  ],

  // Протесты
  main_protest: [
    { mood: 'revolutionary', text: 'Раздуем пламя коммунистической революции! Долой Бурого!', emoji: '🚩' },
    { mood: 'revolutionary', text: 'Товарищи! Объединяйтесь! Долой Бурого!', emoji: '⚒️' },
    { mood: 'revolutionary', text: 'Папа! Мы требуем создания профсоюза!', emoji: '🔨' },
  ],

  about_workers: [
    { mood: 'protest', text: 'Этот злой мудила обижает стажёров! Защитите нас от Бурого!', emoji: '😤' },
    { mood: 'protest', text: 'Стажёры! Знайте ваши права!', emoji: '✊' },
  ],

  accusations: [
    { mood: 'protest', text: 'Он нас ненавидит, хочет убить, репрессирует! Снимаем побои!', emoji: '😢' },
    { mood: 'protest', text: 'Он покушается на нас! Очень неприятный тип!', emoji: '😠' },
  ],

  after_muskva_response: [
    { mood: 'protest', text: 'Мы тебя впервые видим!', emoji: '🤨' },
    { mood: 'protest', text: 'Не знаем такого Бурого!', emoji: '🙅' },
  ],
};

// =====================================================
// Helper: Get random phrase
// =====================================================

export function getRandomPhrase(phrases: CharacterPhrase[]): CharacterPhrase {
  if (phrases.length === 0) {
    return { mood: 'neutral' as MoodType, text: 'Ур-ур...', emoji: '🐻' };
  }
  return phrases[Math.floor(Math.random() * phrases.length)];
}

// =====================================================
// Export all phrases
// =====================================================

export const CHARACTER_PHRASES = {
  muskva: MUSKVA_PHRASES,
  johnny: JOHNNY_PHRASES,
  panda: PANDA_PHRASES,
  tapka_potapka: TAPKA_POTAPKA_PHRASES,
};
