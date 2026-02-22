/**
 * Gemini가 중첩 객체를 JSON 문자열로 직렬화하는 경우가 있어
 * 재귀적으로 파싱해서 실제 객체로 변환한다.
 */
export function parseNestedJsonStrings(value: unknown): unknown {
  if (typeof value === 'string') {
    try {
      const parsed = JSON.parse(value);
      // 파싱 결과가 원시값이면 그냥 문자열 원본 반환
      if (typeof parsed !== 'object' || parsed === null) return value;
      return parseNestedJsonStrings(parsed);
    } catch {
      return value;
    }
  }

  if (Array.isArray(value)) {
    return value.map(parseNestedJsonStrings);
  }

  if (value && typeof value === 'object') {
    return Object.fromEntries(
      Object.entries(value).map(([k, v]) => [k, parseNestedJsonStrings(v)])
    );
  }

  return value;
}

/**
 * 텍스트에서 첫 번째 완전한 JSON 객체({ ... })만 추출한다.
 * Gemini가 JSON 뒤에 추가 설명 텍스트를 붙이는 경우를 처리한다.
 */
function extractJsonObject(text: string): string {
  const start = text.indexOf('{');
  if (start === -1) throw new SyntaxError('No JSON object found in response');

  let depth = 0;
  let inString = false;
  let escape = false;

  for (let i = start; i < text.length; i++) {
    const char = text[i];

    if (escape) {
      escape = false;
      continue;
    }
    if (char === '\\' && inString) {
      escape = true;
      continue;
    }
    if (char === '"') {
      inString = !inString;
      continue;
    }
    if (inString) continue;

    if (char === '{') depth++;
    if (char === '}') {
      depth--;
      if (depth === 0) return text.slice(start, i + 1);
    }
  }

  throw new SyntaxError('Incomplete JSON object in response');
}

/**
 * generateText의 응답 텍스트에서 JSON 객체를 추출하고 파싱한다.
 * 마크다운 코드 펜스와 JSON 이후 추가 텍스트를 모두 처리한다.
 */
export function parseJsonResponse(text: string): unknown {
  const jsonString = extractJsonObject(text);
  return JSON.parse(jsonString);
}
