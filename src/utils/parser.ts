import { AccountInput } from '../types/iptv';

export function parseAccountLine(line: string): AccountInput | null {
  const trimmed = line.trim();
  if (!trimmed || trimmed.startsWith('#') || trimmed.startsWith('//')) {
    return null;
  }

  // 1. Check for URL with query params: http://host:port/get.php?username=xxx&password=yyy
  try {
    if (trimmed.includes('username=') || trimmed.includes('user=')) {
      const urlObj = new URL(trimmed.startsWith('http') ? trimmed : `http://${trimmed}`);
      const host = `${urlObj.protocol}//${urlObj.host}`;
      const username = urlObj.searchParams.get('username') || urlObj.searchParams.get('user');
      const password = urlObj.searchParams.get('password') || urlObj.searchParams.get('pass') || '';

      if (username) {
        return {
          host,
          username,
          password,
          rawLine: trimmed,
        };
      }
    }
  } catch {
    // Continue with delimiter parsing
  }

  // 2. Check for user:pass@host:port
  if (trimmed.includes('@')) {
    const parts = trimmed.split('@');
    if (parts.length === 2) {
      const creds = parts[0].replace(/^https?:\/\//, '').split(':');
      const host = parts[1].startsWith('http') ? parts[1] : `http://${parts[1]}`;
      if (creds.length >= 2) {
        return {
          host,
          username: creds[0],
          password: creds.slice(1).join(':'),
          rawLine: trimmed,
        };
      }
    }
  }

  // 3. Check for pipe or space or tab separated: host user pass
  const tokens = trimmed.split(/[\s|\t;,]+/);
  if (tokens.length >= 3) {
    let host = tokens[0];
    if (!host.startsWith('http://') && !host.startsWith('https://')) {
      host = `http://${host}`;
    }
    return {
      host,
      username: tokens[1],
      password: tokens[2],
      rawLine: trimmed,
    };
  }

  // 4. Colon separated: host:port:user:pass or host:user:pass
  const colonParts = trimmed.split(':');
  if (colonParts.length === 4) {
    // example.com:8080:user:pass
    const host = `http://${colonParts[0]}:${colonParts[1]}`;
    return {
      host,
      username: colonParts[2],
      password: colonParts[3],
      rawLine: trimmed,
    };
  } else if (colonParts.length === 5 && (colonParts[0] === 'http' || colonParts[0] === 'https')) {
    // http://example.com:8080:user:pass
    const host = `${colonParts[0]}:${colonParts[1]}:${colonParts[2]}`;
    return {
      host,
      username: colonParts[3],
      password: colonParts[4],
      rawLine: trimmed,
    };
  } else if (colonParts.length === 3) {
    // example.com:user:pass
    const host = `http://${colonParts[0]}`;
    return {
      host,
      username: colonParts[1],
      password: colonParts[2],
      rawLine: trimmed,
    };
  }

  return null;
}

export function parseAccountList(rawText: string): AccountInput[] {
  const lines = rawText.split(/\r?\n/);
  const accounts: AccountInput[] = [];

  for (const line of lines) {
    const parsed = parseAccountLine(line);
    if (parsed) {
      accounts.push(parsed);
    }
  }

  return accounts;
}
