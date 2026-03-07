type AuriResponseType = "json" | "text" | "blob" | "arrayBuffer" | "formData";
type AuriRequestInit = Omit<RequestInit, "method" | "headers" | "body" | "signal">;
type HeadersInput = Record<string, string> | (() => Record<string, string>);
type ResponseTypeResult<T, R extends AuriResponseType> = R extends "json" ? T : R extends "text" ? string : R extends "blob" ? Blob : R extends "arrayBuffer" ? ArrayBuffer : R extends "formData" ? FormData : never;
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
declare function auri(): AuriInstance<"json">;

export { auri };
