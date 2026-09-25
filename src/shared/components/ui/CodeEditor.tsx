import Editor, { type Monaco } from '@monaco-editor/react';
import {
  ELEMENT_SCRIPT_LANGUAGE,
  getEditorLanguage,
} from '@/shared/config/programmingLanguages';

function registerElementScript(monaco: Monaco) {
  const isRegistered = monaco.languages
    .getLanguages()
    .some(({ id }) => id === ELEMENT_SCRIPT_LANGUAGE);

  if (isRegistered) return;

  monaco.languages.register({
    id: ELEMENT_SCRIPT_LANGUAGE,
    extensions: ['.sbsl'],
    aliases: ['1С:Элемент Скрипт', 'Element Script'],
  });

  monaco.languages.setLanguageConfiguration(ELEMENT_SCRIPT_LANGUAGE, {
    comments: {
      lineComment: '//',
      blockComment: ['/*', '*/'],
    },
    brackets: [
      ['{', '}'],
      ['[', ']'],
      ['(', ')'],
    ],
    autoClosingPairs: [
      { open: '{', close: '}' },
      { open: '[', close: ']' },
      { open: '(', close: ')' },
      { open: '"', close: '"' },
      { open: "'", close: "'" },
    ],
  });

  monaco.languages.setMonarchTokensProvider(ELEMENT_SCRIPT_LANGUAGE, {
    defaultToken: '',
    tokenPostfix: '.sbsl',
    ignoreCase: true,
    keywords: [
      'асинх', 'возврат', 'для', 'если', 'иначе', 'из', 'использовать',
      'метод', 'новый', 'перем', 'пока', 'прервать', 'продолжить',
      'публичный', 'тип', 'тогда', 'цикл', 'функция',
      'async', 'break', 'continue', 'else', 'for', 'from', 'function',
      'if', 'import', 'method', 'new', 'public', 'return', 'type',
      'var', 'while',
    ],
    constants: [
      'истина', 'ложь', 'неопределено', 'null', 'true', 'false',
    ],
    operators: [
      '=', '>', '<', '!', '~', '?', ':', '==', '<=', '>=', '!=',
      '&&', '||', '++', '--', '+', '-', '*', '/', '&', '|', '^', '%',
    ],
    symbols: /[=><!~?:&|+\-*\/%^]+/,
    tokenizer: {
      root: [
        [/[а-яА-ЯёЁ_a-zA-Z][\wа-яА-ЯёЁ]*/, {
          cases: {
            '@keywords': 'keyword',
            '@constants': 'constant.language',
            '@default': 'identifier',
          },
        }],
        { include: '@whitespace' },
        [/[{}()[\]]/, '@brackets'],
        [/[<>](?!@symbols)/, '@brackets'],
        [/@symbols/, {
          cases: {
            '@operators': 'operator',
            '@default': '',
          },
        }],
        [/\d*\.\d+([eE][-+]?\d+)?/, 'number.float'],
        [/0[xX][0-9a-fA-F]+/, 'number.hex'],
        [/\d+/, 'number'],
        [/"([^"\\]|\\.)*$/, 'string.invalid'],
        [/"/, 'string', '@string_double'],
        [/'([^'\\]|\\.)*$/, 'string.invalid'],
        [/'/, 'string', '@string_single'],
      ],
      whitespace: [
        [/[ \t\r\n]+/, 'white'],
        [/\/\*/, 'comment', '@comment'],
        [/\/\/.*$/, 'comment'],
      ],
      comment: [
        [/[^/*]+/, 'comment'],
        [/\/\*/, 'comment', '@push'],
        [/\*\//, 'comment', '@pop'],
        [/[/*]/, 'comment'],
      ],
      string_double: [
        [/[^\\"]+/, 'string'],
        [/\\./, 'string.escape.invalid'],
        [/"/, 'string', '@pop'],
      ],
      string_single: [
        [/[^\\']+/, 'string'],
        [/\\./, 'string.escape.invalid'],
        [/'/, 'string', '@pop'],
      ],
    },
  });
}

interface CodeEditorProps {
  value: string;
  onChange: (value: string) => void;
  language?: string;
  theme?: string;
  height?: string;
  readOnly?: boolean;
}

export function CodeEditor({
  value,
  onChange,
  language = 'python',
  theme = 'vs-dark',
  height = '400px',
  readOnly = false
}: CodeEditorProps) {
  const handleChange = (value: string | undefined) => {
    onChange(value || '');
  };

  return (
    <div className="border border-learning-muted/10 rounded-lg overflow-hidden">
      <Editor
        height={height}
        language={getEditorLanguage(language)}
        theme={theme}
        value={value}
        onChange={handleChange}
        beforeMount={registerElementScript}
        options={{
          minimap: { enabled: false },
          fontSize: 14,
          lineNumbers: 'on',
          scrollBeyondLastLine: false,
          automaticLayout: true,
          readOnly,
          tabSize: 4,
          wordWrap: 'on',
          padding: { top: 16, bottom: 16 }
        }}
      />
    </div>
  );
}
