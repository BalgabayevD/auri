// src/index.ts
function resolveHeaders(sources) {
  const headers = new Headers();
  for (const source of sources) {
    const resolved = typeof source === "function" ? source() : source;
    for (const [key, value] of Object.entries(resolved)) {
      headers.set(key, value);
    }
  }
  return headers;
}
function toURLSearchParams(params) {
  if (params instanceof URLSearchParams) return params;
  return new URLSearchParams(params);
}
function createInstance(ctx) {
  function clone(patch) {
    return createInstance({ ...ctx, ...patch });
  }
  async function handleResponse(response) {
    switch (ctx.responseType) {
      case "json":
        return await response.json();
      case "text":
        return await response.text();
      case "blob":
        return await response.blob();
      case "arrayBuffer":
        return await response.arrayBuffer();
      case "formData":
        return await response.formData();
      default:
        throw new Error(`Unknown responseType: ${ctx.responseType}`);
    }
  }
  async function request(path, method, body, init) {
    const params = ctx.searchParams.toString();
    const url = ctx.baseUrl + path + (params ? "?" + params : "");
    const headers = resolveHeaders(ctx.headerSources);
    let req = new Request(url, {
      ...init,
      method: method.toUpperCase(),
      headers,
      signal: ctx.abortController.signal,
      ...body !== void 0 && { body: JSON.stringify(body) }
    });
    for (const handler of ctx.beforeRequest) {
      req = handler(req) ?? req;
    }
    let response = await fetch(req);
    for (const handler of ctx.afterRequest) {
      response = handler(response) ?? response;
    }
    return handleResponse(response);
  }
  function makeQueryKey(path, body) {
    const params = ctx.searchParams.toString();
    const url = ctx.baseUrl + path + (params ? "?" + params : "");
    return body !== void 0 ? [url, body] : [url];
  }
  function makeGetFn(method) {
    const fn = (path, init) => request(path, method, void 0, init);
    fn.query = (path, init) => ({
      queryKey: makeQueryKey(path),
      queryFn: () => request(path, method, void 0, init)
    });
    return fn;
  }
  function makeBodyFn(method) {
    const fn = (path, body, init) => request(path, method, body, init);
    fn.query = (path, body, init) => ({
      queryKey: makeQueryKey(path, body),
      queryFn: () => request(path, method, body, init)
    });
    return fn;
  }
  return {
    baseUrl: (url) => clone({ baseUrl: url }),
    headers: (input) => clone({ headerSources: [...ctx.headerSources, input] }),
    responseType: (type) => clone({ responseType: type }),
    searchParams: (params) => clone({ searchParams: toURLSearchParams(params) }),
    addSearchParams: (params) => {
      const merged = [];
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
    setAbortController: (controller) => clone({ abortController: controller }),
    get: makeGetFn("get"),
    delete: makeGetFn("delete"),
    post: makeBodyFn("post"),
    put: makeBodyFn("put"),
    patch: makeBodyFn("patch")
  };
}
function auri() {
  return createInstance({
    baseUrl: typeof window !== "undefined" ? window.location.origin : "",
    responseType: "json",
    inputType: "json",
    searchParams: new URLSearchParams(),
    headerSources: [],
    beforeRequest: /* @__PURE__ */ new Set(),
    afterRequest: /* @__PURE__ */ new Set(),
    abortController: new AbortController()
  });
}
export {
  auri
};
