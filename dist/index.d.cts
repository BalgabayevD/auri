type AuriResponseType = "json" | "text" | "blob" | "arrayBuffer" | "formData";
type AuriRequestInit = Omit<RequestInit, "method" | "headers" | "body" | "signal">;
type HeadersInput = Record<string, string> | (() => Record<string, string>);
type ResponseTypeResult<T, R extends AuriResponseType> = R extends "json" ? T : R extends "text" ? string : R extends "blob" ? Blob : R extends "arrayBuffer" ? ArrayBuffer : R extends "formData" ? FormData : never;
type QueryOptions<T> = {
    queryKey: unknown[];
    queryFn: () => Promise<T>;
};
type GetFn<R extends AuriResponseType> = {
    <T>(path: string, init?: AuriRequestInit): Promise<ResponseTypeResult<T, R>>;
    query: <T>(path: string, init?: AuriRequestInit) => QueryOptions<ResponseTypeResult<T, R>>;
};
type BodyFn<R extends AuriResponseType> = {
    <T, B = unknown>(path: string, body?: B, init?: AuriRequestInit): Promise<ResponseTypeResult<T, R>>;
    query: <T, B = unknown>(path: string, body?: B, init?: AuriRequestInit) => QueryOptions<ResponseTypeResult<T, R>>;
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
    get: GetFn<R>;
    post: BodyFn<R>;
    put: BodyFn<R>;
    patch: BodyFn<R>;
    delete: GetFn<R>;
};
declare function auri(): AuriInstance<"json">;

export { type QueryOptions, auri };
