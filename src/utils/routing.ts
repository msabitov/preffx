/**
 * match-path — path pattern matching similar to React Router
 */

export type MatchResult = {
    /** Extracted route parameters (`:id` → `{id: '42'}`) */
    params: Record<string, string>;
    /** The portion of pathname that was matched */
    matchedText: string;
    /** What remains of pathname after the matched portion */
    remainingPath: string;
};

/** Escape special regex characters (включая `*` — это литерал, не wildcard) */
const RE_SPECIAL = /[.+?^${}()|[\]\\*]/g;

function escapeLiteral(seg: string): string {
    return seg.replace(RE_SPECIAL, '\\$&');
}

/**
 * Match a path pattern against a URL pathname.
 *
 * @param pattern  Route pattern (e.g. `/users/:id`, `/:lang?/home`, `/files/*`)
 * @param pathname The URL pathname to match against
 * @returns MatchResult on success, null on failure
 *
 * @example
 * ```ts
 * matchPath('/user/:id', '/user/42')
 * // → { params: { id: '42' }, matchedText: '/user/42', remainingPath: '' }
 *
 * matchPath('/users', '/users/42')
 * // → { params: {}, matchedText: '/users', remainingPath: '/42' }
 *
 * matchPath('/:lang?/home', '/home')
 * // → { params: { lang: '' }, matchedText: '/home', remainingPath: '' }
 * ```
 */
export function matchPath(pattern: string, pathname: string): MatchResult | null {
    if (!pattern) return null;

    // Catch-all wildcard
    if (pattern === '*') {
        return {
            params: { '*': pathname },
            matchedText: pathname,
            remainingPath: '',
        };
    }

    const paramNames: string[] = [];
    const regexParts: string[] = [];
    let hasWildcard = false;

    // Normalize to absolute pattern (leading /)
    const absPattern = pattern.startsWith('/') ? pattern : '/' + pattern;
    const segments = absPattern.slice(1).split('/');

    // Build regex: start with ^/
    regexParts.push('^/');

    for (let i = 0; i < segments.length; i++) {
        const seg = segments[i];
        const isLast = i === segments.length - 1;

        if (i > 0) regexParts.push('/');

        // wildcard segment
        if (seg === '*' && isLast) {
            hasWildcard = true;
            paramNames.push('*');
            regexParts.push('(.*)');
            continue;
        }

        // ── param segment :param or :param? ─────────────────────────
        if (seg.startsWith(':')) {
            const m = seg.match(/^:(\w+)(\?)?$/);
            if (m) {
                const name = m[1];
                const isOptional = !!m[2];
                paramNames.push(name);

                if (isOptional) {
                    regexParts.pop();
                    regexParts.push('(?:/([^/]*))?');
                } else {
                    regexParts.push('([^/]+)');
                }
                continue;
            }
        }
        regexParts.push(escapeLiteral(seg));
    }

    const isRoot = absPattern === '/';
    const endsWithSlash = absPattern.endsWith('/');

    if (hasWildcard) {
        // Wildcard (.*) already captures the rest — nothing to add
    } else if (isRoot) {
        // '/' — React Router index route semantics: only '/' matches
        regexParts.push('$');
    } else if (endsWithSlash) {
        // Trailing-slash layout route: /users/ → /users/, /users/extra
        // Regex already ends with '/', no extra pattern needed
    } else {
        // Static or :param — prefix match with segment boundary lookahead
        regexParts.push('(?=/|$)');
    }

    const regex = new RegExp(regexParts.join(''));
    const match = pathname.match(regex);
    if (!match || match[0] === '') return null;

    // match[0]    = full match
    // match[1..N] = capturing groups
    const params: Record<string, string> = {};
    paramNames.forEach((name, idx) => {
        const val = match[idx + 1];
        params[name] = val !== undefined ? globalThis.decodeURIComponent(val) : '';
    });

    return {
        params,
        matchedText: match[0],
        remainingPath: pathname.slice(match[0].length),
    };
}
