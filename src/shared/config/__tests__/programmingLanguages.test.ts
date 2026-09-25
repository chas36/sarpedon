import { describe, expect, it } from 'vitest';
import {
  ELEMENT_SCRIPT_LANGUAGE,
  PROGRAMMING_LANGUAGES,
  getEditorLanguage,
  isElementScriptLanguage,
} from '../programmingLanguages';

describe('programmingLanguages', () => {
  it('includes 1С:Элемент Скрипт in the shared language list', () => {
    expect(PROGRAMMING_LANGUAGES).toContainEqual({
      value: ELEMENT_SCRIPT_LANGUAGE,
      label: '1С:Элемент Скрипт',
    });
  });

  it.each(['elementscript', '1c-element', 'element-script', 'sbsl'])(
    'recognizes %s as Element Script',
    (language) => {
      expect(isElementScriptLanguage(language)).toBe(true);
      expect(getEditorLanguage(language)).toBe(ELEMENT_SCRIPT_LANGUAGE);
    },
  );

  it('preserves other Monaco language identifiers', () => {
    expect(getEditorLanguage('python')).toBe('python');
  });
});
