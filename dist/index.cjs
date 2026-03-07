"use strict";
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);

// src/index.ts
var index_exports = {};
__export(index_exports, {
  auri: () => auri
});
module.exports = __toCommonJS(index_exports);
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
        return response.json();
      case "text":
        return response.text();
      case "blob":
        return response.blob();
      case "arrayBuffer":
        return response.arrayBuffer();
      case "formData":
        return response.formData();
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
  const instance = {
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
    get: (path, init) => request(path, "get", void 0, init),
    delete: (path, init) => request(path, "delete", void 0, init),
    post: (path, body, init) => request(path, "post", body, init),
    put: (path, body, init) => request(path, "put", body, init),
    patch: (path, body, init) => request(path, "patch", body, init)
  };
  return instance;
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
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  auri
});
