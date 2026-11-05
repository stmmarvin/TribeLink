/** Laravel's CSRF token, from the XSRF-TOKEN cookie it sets on every page. */
function xsrfToken() {
    const match = document.cookie.match(/(?:^|; )XSRF-TOKEN=([^;]*)/);

    return match ? decodeURIComponent(match[1]) : "";
}

async function sendJson<T>(
    method: "GET" | "POST" | "DELETE",
    url: string,
    body?: unknown,
): Promise<T> {
    const response = await fetch(url, {
        method,
        credentials: "same-origin",
        headers: {
            Accept: "application/json",
            "Content-Type": "application/json",
            "X-Requested-With": "XMLHttpRequest",
            "X-XSRF-TOKEN": xsrfToken(),
        },
        body: body === undefined ? undefined : JSON.stringify(body),
    });

    if (!response.ok) {
        throw new Error(`Request failed (${response.status})`);
    }

    return (await response.json()) as T;
}

/**
 * Small JSON POST for frequent background calls (e.g. the Hotel sync), where
 * an Inertia visit would be too heavy. Throws on a non-2xx response.
 */
export function postJson<T>(url: string, body: unknown): Promise<T> {
    return sendJson<T>("POST", url, body);
}

/** JSON GET, like postJson (e.g. the scores at an arcade cabinet). */
export function getJson<T>(url: string): Promise<T> {
    return sendJson<T>("GET", url);
}

/** JSON DELETE, like postJson (e.g. leaving the chess queue). */
export function deleteJson<T>(url: string): Promise<T> {
    return sendJson<T>("DELETE", url);
}
