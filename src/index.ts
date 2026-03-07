type AuriMethod =
    | "get"
    | "post"
    | "put"
    | "delete"
    | "patch"
    | "head"
    | "options"
    | "trace"
    | "connect";

type AuriInputType = "json";
type AuriResponseType = "json" | "text" | "blob" | "arrayBuffer" | "formData";
type AuriRequestInit = Omit<RequestInit, "method" | "headers" | "body" | "signal">;

type HeadersInput = Record<string, string> | (() => Record<string, string>);

type ResponseTypeResult<T, R extends AuriResponseType> = R extends "json"
    ? T
    : R extends "text"
        ? string
        : R extends "blob"
            ? Blob
            : R extends "arrayBuffer"
                ? ArrayBuffer
                : R extends "formData"
                    ? FormData
                    : never;

type AuriContext<R extends AuriResponseType> = {
    baseUrl: string;
    responseType: R;
    inputType: AuriInputType;
    searchParams: URLSearchParams;
    headerSources: HeadersInput[];
    beforeRequest: Set<(request: Request) => Request | void>;
    afterRequest: Set<(response: Response) => Response | void>;
    abortController: AbortController;
};

type AuriInstance<R extends AuriResponseType> = {
    baseUrl(url: string): AuriInstance<R>;
    headers(input: HeadersInput): AuriInstance<R>;
    responseType<T extends AuriResponseType>(type: T): AuriInstance<T>;
    searchParams(params: URLSearchParams | Record<string, string>): AuriInstance<R>;
    addSearchParams(params: URLSearchParams | Record<string, string>): AuriInstance<R>;
    addBeforeRequest(handler: (request: Request) => Request | void): AuriInstance<R>;
    addAfterRequest(handler: (response: Response) => Response | void): AuriInstance<R>;
    setAbortController(controller: AbortController): AuriInstance<R>;

    get<T>(path: string, init?: AuriRequestInit): Promise<ResponseTypeResult<T, R>>;
    post<T, B = unknown>(path: string, body?: B, init?: AuriRequestInit): Promise<ResponseTypeResult<T, R>>;
    put<T, B = unknown>(path: string, body?: B, init?: AuriRequestInit): Promise<ResponseTypeResult<T, R>>;
    patch<T, B = unknown>(path: string, body?: B, init?: AuriRequestInit): Promise<ResponseTypeResult<T, R>>;
    delete<T>(path: string, init?: AuriRequestInit): Promise<ResponseTypeResult<T, R>>;
};

function resolveHeaders(sources: HeadersInput[]): Headers {
    const headers = new Headers();
    for (const source of sources) {
        const resolved = typeof source === "function" ? source() : source;
        for (const [key, value] of Object.entries(resolved)) {
            headers.set(key, value);
        }
    }
    return headers;
}

function toURLSearchParams(params: URLSearchParams | Record<string, string>): URLSearchParams {
    if (params instanceof URLSearchParams) return params;
    return new URLSearchParams(params);
}

function createInstance<R extends AuriResponseType>(ctx: AuriContext<R>): AuriInstance<R> {
    function clone<T extends AuriResponseType>(patch: Partial<AuriContext<T>>): AuriInstance<T> {
        return createInstance<T>({ ...(ctx as unknown as AuriContext<T>), ...patch });
    }

    async function handleResponse<T>(response: Response): Promise<ResponseTypeResult<T, R>> {
        switch (ctx.responseType) {
            case "json":        return response.json()       as Promise<ResponseTypeResult<T, R>>;
            case "text":        return response.text()       as Promise<ResponseTypeResult<T, R>>;
            case "blob":        return response.blob()       as Promise<ResponseTypeResult<T, R>>;
            case "arrayBuffer": return response.arrayBuffer() as Promise<ResponseTypeResult<T, R>>;
            case "formData":    return response.formData()   as Promise<ResponseTypeResult<T, R>>;
            default: throw new Error(`Unknown responseType: ${ctx.responseType}`);
        }
    }

    async function request<T, B>(
        path: string,
        method: AuriMethod,
        body?: B,
        init?: AuriRequestInit,
    ): Promise<ResponseTypeResult<T, R>> {
        const params = ctx.searchParams.toString();
        const url = ctx.baseUrl + path + (params ? "?" + params : "");

        const headers = resolveHeaders(ctx.headerSources);

        let req = new Request(url, {
            ...init,
            method: method.toUpperCase(),
            headers,
            signal: ctx.abortController.signal,
            ...(body !== undefined && { body: JSON.stringify(body) }),
        });

        for (const handler of ctx.beforeRequest) {
            req = handler(req) ?? req;
        }

        let response = await fetch(req);

        for (const handler of ctx.afterRequest) {
            response = handler(response) ?? response;
        }

        return handleResponse<T>(response);
    }

    const instance: AuriInstance<R> = {
        baseUrl: (url) => clone({ baseUrl: url }),

        headers: (input) =>
            clone({ headerSources: [...ctx.headerSources, input] }),

        responseType: <T extends AuriResponseType>(type: T) =>
            clone<T>({ responseType: type }),

        searchParams: (params) =>
            clone({ searchParams: toURLSearchParams(params) }),

        addSearchParams: (params) => {
            const merged: [string, string][] = [];
            ctx.searchParams.forEach((v, k) => merged.push([k, v]));
            toURLSearchParams(params).forEach((v, k) => merged.push([k, v]));
            return clone({ searchParams: new URLSearchParams(merged) });
        },

        addBeforeRequest: (handler) => {
            const newSet = new Set(ctx.beforeRequest);
            newSet.add(handler);
            return clone({ beforeRequest: newSet });
        },

        addAfterRequest: (handler) => {
            const newSet = new Set(ctx.afterRequest);
            newSet.add(handler);
            return clone({ afterRequest: newSet });
        },

        setAbortController: (controller) =>
            clone({ abortController: controller }),

        get:    (path, init)        => request(path, "get",    undefined, init),
        delete: (path, init)        => request(path, "delete", undefined, init),
        post:   (path, body, init)  => request(path, "post",   body,      init),
        put:    (path, body, init)  => request(path, "put",    body,      init),
        patch:  (path, body, init)  => request(path, "patch",  body,      init),
    };

    return instance;
}

export function auri(): AuriInstance<"json"> {
    return createInstance<"json">({
        baseUrl: typeof window !== "undefined" ? window.location.origin : "",
        responseType: "json",
        inputType: "json",
        searchParams: new URLSearchParams(),
        headerSources: [],
        beforeRequest: new Set(),
        afterRequest: new Set(),
        abortController: new AbortController(),
    });
}