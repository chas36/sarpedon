export const ELEMENT_SCRIPT_LANGUAGE = 'elementscript';

export const PROGRAMMING_LANGUAGES = [
  { value: 'python', label: 'Python' },
  { value: 'javascript', label: 'JavaScript' },
  { value: 'java', label: 'Java' },
  { value: 'cpp', label: 'C++' },
  { value: ELEMENT_SCRIPT_LANGUAGE, label: '1С:Элемент Скрипт' },
] as const;

export function isElementScriptLanguage(language: string): boolean {
  return [ELEMENT_SCRIPT_LANGUAGE, '1c-element', 'element-script', 'sbsl']
    .includes(language.trim().toLowerCase());
}

export function getEditorLanguage(language: string): string {
  return isElementScriptLanguage(language) ? ELEMENT_SCRIPT_LANGUAGE : language;
}
