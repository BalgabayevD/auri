<p align="center">
  <img src="./assets/logo.png" alt="auri" width="200" />
</p>

# Auri

Fluent chainable HTTP client based on the Fetch API, built on top of the native `fetch` API.

## Installation

```bash
npm install @maguya/auri
```

## Usage

```ts
import { auri } from "@maguya/auri";

const api = auri()
    .baseUrl("https://api.example.com")
    .headers({ "Authorization": "Bearer token" });

// GET request
const user = await api.get<User>("/users/1");

// POST request
const created = await api.post<User, CreateUserDto>("/users", { name: "Alice" });

// PUT / PATCH / DELETE
await api.put<User>("/users/1", { name: "Bob" });
await api.patch<User>("/users/1", { name: "Bob" });
await api.delete("/users/1");
```

## API

### `auri()`

Creates a new client instance with defaults:
- `baseUrl` — `window.location.origin`
- `responseType` — `"json"`

All methods return a **new immutable instance**, so the original is never mutated.

---

### Configuration methods

| Method | Description |
|---|---|
| `.baseUrl(url)` | Set the base URL |
| `.headers(input)` | Add headers — accepts an object or a function `() => Record<string, string>` |
| `.responseType(type)` | Set response type: `"json"` \| `"text"` \| `"blob"` \| `"arrayBuffer"` \| `"formData"` |
| `.searchParams(params)` | Replace query params |
| `.addSearchParams(params)` | Merge additional query params |
| `.addBeforeRequest(fn)` | Add a request interceptor `(req: Request) => Request \| void` |
| `.addAfterRequest(fn)` | Add a response interceptor `(res: Response) => Response \| void` |
| `.setAbortController(ctrl)` | Provide a custom `AbortController` |

---

### Request methods

```ts
api.get<T>(path, init?)
api.post<T, B>(path, body?, init?)
api.put<T, B>(path, body?, init?)
api.patch<T, B>(path, body?, init?)
api.delete<T>(path, init?)
```

---

### React Query integration

Every request method has a `.query()` variant that returns `{ queryKey, queryFn }` compatible with TanStack Query's `useQuery`:

```ts
import { useQuery } from "@tanstack/react-query";
import { auri } from "@maguya/auri";

const api = auri().baseUrl("https://api.example.com");

// Basic usage
const { data } = useQuery(api.get.query<User[]>("/users"));

// With search params
const { data } = useQuery(
    api.addSearchParams({ page: "1" }).get.query<User[]>("/users")
);

// POST with body (queryKey includes the body)
const { data } = useQuery(
    api.post.query<Report, Filter>("/reports", { status: "active" })
);
```

`queryKey` is derived automatically from `baseUrl + path + searchParams` (and body for methods that accept one), so React Query's cache works correctly out of the box.

---

### Dynamic headers (e.g. auth tokens)

Pass a function to `.headers()` — it is called fresh on every request:

```ts
const api = auri()
    .baseUrl("https://api.example.com")
    .headers(() => ({ "Authorization": `Bearer ${getToken()}` }));
```

---

### Interceptors

```ts
const api = auri()
    .addBeforeRequest((req) => {
        console.log("->", req.method, req.url);
    })
    .addAfterRequest((res) => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
    });
```

---

### Cancellation

```ts
const controller = new AbortController();

const api = auri().setAbortController(controller);

setTimeout(() => controller.abort(), 3000);

const data = await api.get("/slow-endpoint");
```

---

### Response types

```ts
const text = await auri()
    .responseType("text")
    .get("/readme.txt");

const blob = await auri()
    .responseType("blob")
    .get("/image.png");
```

## Build

```bash
npm run build   # compile to dist/
npm run dev     # watch mode
```

## License

MIT
