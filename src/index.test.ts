import { describe, it, expect, vi, beforeEach } from "vitest";
import { auri } from "./index.js";

const mockFetch = vi.fn();
vi.stubGlobal("fetch", mockFetch);

function makeResponse(body: unknown, status = 200) {
    return new Response(JSON.stringify(body), {
        status,
        headers: { "Content-Type": "application/json" },
    });
}

beforeEach(() => {
    mockFetch.mockReset();
});

// ---------------------------------------------------------------------------
// Basic requests
// ---------------------------------------------------------------------------

describe("GET", () => {
    it("calls the correct URL", async () => {
        mockFetch.mockResolvedValue(makeResponse({ id: 1 }));

        const api = auri().baseUrl("https://api.example.com");
        await api.get("/users/1");

        expect(mockFetch).toHaveBeenCalledOnce();
        const req: Request = mockFetch.mock.calls[0][0];
        expect(req.url).toBe("https://api.example.com/users/1");
        expect(req.method).toBe("GET");
    });

    it("returns parsed JSON", async () => {
        mockFetch.mockResolvedValue(makeResponse({ name: "Alice" }));

        const result = await auri().baseUrl("https://api.example.com").get<{ name: string }>("/user");
        expect(result).toEqual({ name: "Alice" });
    });
});

describe("POST", () => {
    it("sends body as JSON", async () => {
        mockFetch.mockResolvedValue(makeResponse({ id: 2 }));

        const api = auri().baseUrl("https://api.example.com");
        await api.post("/users", { name: "Bob" });

        const req: Request = mockFetch.mock.calls[0][0];
        expect(req.method).toBe("POST");
        expect(await req.json()).toEqual({ name: "Bob" });
    });
});

describe("PUT / PATCH / DELETE", () => {
    it("PUT sends correct method and body", async () => {
        mockFetch.mockResolvedValue(makeResponse({}));
        await auri().baseUrl("https://api.example.com").put("/users/1", { name: "Carol" });
        const req: Request = mockFetch.mock.calls[0][0];
        expect(req.method).toBe("PUT");
        expect(await req.json()).toEqual({ name: "Carol" });
    });

    it("PATCH sends correct method and body", async () => {
        mockFetch.mockResolvedValue(makeResponse({}));
        await auri().baseUrl("https://api.example.com").patch("/users/1", { name: "Dan" });
        const req: Request = mockFetch.mock.calls[0][0];
        expect(req.method).toBe("PATCH");
    });

    it("DELETE sends correct method", async () => {
        mockFetch.mockResolvedValue(makeResponse({}));
        await auri().baseUrl("https://api.example.com").delete("/users/1");
        const req: Request = mockFetch.mock.calls[0][0];
        expect(req.method).toBe("DELETE");
    });
});

// ---------------------------------------------------------------------------
// Headers
// ---------------------------------------------------------------------------

describe("headers", () => {
    it("sends static headers", async () => {
        mockFetch.mockResolvedValue(makeResponse({}));

        await auri()
            .baseUrl("https://api.example.com")
            .headers({ Authorization: "Bearer token" })
            .get("/me");

        const req: Request = mockFetch.mock.calls[0][0];
        expect(req.headers.get("Authorization")).toBe("Bearer token");
    });

    it("evaluates dynamic header function on each request", async () => {
        mockFetch.mockImplementation(() => Promise.resolve(makeResponse({})));

        let token = "first";
        const api = auri()
            .baseUrl("https://api.example.com")
            .headers(() => ({ Authorization: `Bearer ${token}` }));

        await api.get("/me");
        token = "second";
        await api.get("/me");

        const req1: Request = mockFetch.mock.calls[0][0];
        const req2: Request = mockFetch.mock.calls[1][0];
        expect(req1.headers.get("Authorization")).toBe("Bearer first");
        expect(req2.headers.get("Authorization")).toBe("Bearer second");
    });

    it("merges multiple header sources", async () => {
        mockFetch.mockResolvedValue(makeResponse({}));

        await auri()
            .baseUrl("https://api.example.com")
            .headers({ "X-App": "auri" })
            .headers({ Authorization: "Bearer token" })
            .get("/me");

        const req: Request = mockFetch.mock.calls[0][0];
        expect(req.headers.get("X-App")).toBe("auri");
        expect(req.headers.get("Authorization")).toBe("Bearer token");
    });
});

// ---------------------------------------------------------------------------
// Search params
// ---------------------------------------------------------------------------

describe("searchParams", () => {
    it("appends params to URL", async () => {
        mockFetch.mockResolvedValue(makeResponse([]));

        await auri()
            .baseUrl("https://api.example.com")
            .searchParams({ page: "2", limit: "10" })
            .get("/users");

        const req: Request = mockFetch.mock.calls[0][0];
        const url = new URL(req.url);
        expect(url.searchParams.get("page")).toBe("2");
        expect(url.searchParams.get("limit")).toBe("10");
    });

    it("addSearchParams merges without overwriting existing params", async () => {
        mockFetch.mockResolvedValue(makeResponse([]));

        await auri()
            .baseUrl("https://api.example.com")
            .searchParams({ page: "1" })
            .addSearchParams({ limit: "5" })
            .get("/users");

        const req: Request = mockFetch.mock.calls[0][0];
        const url = new URL(req.url);
        expect(url.searchParams.get("page")).toBe("1");
        expect(url.searchParams.get("limit")).toBe("5");
    });
});

// ---------------------------------------------------------------------------
// Interceptors
// ---------------------------------------------------------------------------

describe("interceptors", () => {
    it("beforeRequest can modify the request", async () => {
        mockFetch.mockResolvedValue(makeResponse({}));

        await auri()
            .baseUrl("https://api.example.com")
            .addBeforeRequest((req) => new Request(req, { headers: { "X-Modified": "yes" } }))
            .get("/test");

        const req: Request = mockFetch.mock.calls[0][0];
        expect(req.headers.get("X-Modified")).toBe("yes");
    });

    it("afterRequest can observe the response", async () => {
        mockFetch.mockResolvedValue(makeResponse({ ok: true }));

        const statuses: number[] = [];
        await auri()
            .baseUrl("https://api.example.com")
            .addAfterRequest((res) => { statuses.push(res.status); })
            .get("/test");

        expect(statuses).toEqual([200]);
    });
});

// ---------------------------------------------------------------------------
// Immutability
// ---------------------------------------------------------------------------

describe("immutability", () => {
    it("each config call returns a new instance", () => {
        const base = auri();
        const withUrl = base.baseUrl("https://api.example.com");
        expect(base).not.toBe(withUrl);
    });

    it("original instance is not affected by derived instance", async () => {
        mockFetch.mockResolvedValue(makeResponse({}));

        const base = auri().baseUrl("https://api.example.com");
        const withHeader = base.headers({ Authorization: "Bearer token" });

        await base.get("/test");
        const req: Request = mockFetch.mock.calls[0][0];
        expect(req.headers.get("Authorization")).toBeNull();

        mockFetch.mockReset();
        mockFetch.mockResolvedValue(makeResponse({}));

        await withHeader.get("/test");
        const req2: Request = mockFetch.mock.calls[0][0];
        expect(req2.headers.get("Authorization")).toBe("Bearer token");
    });
});

// ---------------------------------------------------------------------------
// Cancellation
// ---------------------------------------------------------------------------

describe("cancellation", () => {
    it("passes AbortSignal to fetch and propagates abort", async () => {
        let capturedSignal: AbortSignal | null = null;
        mockFetch.mockImplementation((req: Request) => {
            capturedSignal = req.signal;
            return Promise.resolve(makeResponse({}));
        });

        const controller = new AbortController();
        await auri()
            .baseUrl("https://api.example.com")
            .setAbortController(controller)
            .get("/test");

        expect(capturedSignal).not.toBeNull();
        expect(capturedSignal!.aborted).toBe(false);
        controller.abort();
        expect(capturedSignal!.aborted).toBe(true);
    });
});

// ---------------------------------------------------------------------------
// .query() — React Query integration
// ---------------------------------------------------------------------------

describe(".query()", () => {
    it("get.query returns correct queryKey and calls fetch on queryFn", async () => {
        mockFetch.mockResolvedValue(makeResponse([{ id: 1 }]));

        const api = auri().baseUrl("https://api.example.com");
        const options = api.get.query<{ id: number }[]>("/users");

        expect(options.queryKey).toEqual(["https://api.example.com/users"]);

        const result = await options.queryFn();
        expect(result).toEqual([{ id: 1 }]);
    });

    it("get.query includes searchParams in queryKey", () => {
        const api = auri()
            .baseUrl("https://api.example.com")
            .searchParams({ page: "2" });

        const options = api.get.query("/users");
        expect(options.queryKey).toEqual(["https://api.example.com/users?page=2"]);
    });

    it("post.query includes body in queryKey", () => {
        const api = auri().baseUrl("https://api.example.com");
        const body = { status: "active" };
        const options = api.post.query("/reports", body);

        expect(options.queryKey).toEqual(["https://api.example.com/reports", body]);
    });

    it("delete.query returns correct queryKey", () => {
        const api = auri().baseUrl("https://api.example.com");
        const options = api.delete.query("/users/1");
        expect(options.queryKey).toEqual(["https://api.example.com/users/1"]);
    });
});

// ---------------------------------------------------------------------------
// Response types
// ---------------------------------------------------------------------------

describe("responseType", () => {
    it("text", async () => {
        mockFetch.mockResolvedValue(new Response("hello"));

        const result = await auri()
            .baseUrl("https://api.example.com")
            .responseType("text")
            .get("/text");

        expect(result).toBe("hello");
    });

    it("blob", async () => {
        mockFetch.mockResolvedValue(new Response(new Blob(["data"])));

        const result = await auri()
            .baseUrl("https://api.example.com")
            .responseType("blob")
            .get("/file");

        expect(result).toBeInstanceOf(Blob);
    });
});
