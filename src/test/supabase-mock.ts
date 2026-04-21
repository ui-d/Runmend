/**
 * Reusable Supabase client mock used by unit tests. Supports the common
 * PostgREST builder chain + auth + rpc. Never hits the network.
 *
 * Usage:
 *   const mock = createSupabaseMock();
 *   mock.setTable("workspaces", [{ id: "w1", slug: "acme" }]);
 *   mock.setUser({ id: "user-1", email: "u@example.com" });
 *   const result = await myQuery(mock.client);
 */

import { vi } from "vitest";

export type Row = Record<string, unknown>;

export interface RecordedCall {
  table: string;
  op: "select" | "insert" | "update" | "upsert" | "delete" | "rpc";
  select?: string;
  eq: Array<[string, unknown]>;
  neq: Array<[string, unknown]>;
  gte: Array<[string, unknown]>;
  lte: Array<[string, unknown]>;
  gt: Array<[string, unknown]>;
  lt: Array<[string, unknown]>;
  in: Array<[string, unknown[]]>;
  is: Array<[string, unknown]>;
  ilike: Array<[string, string]>;
  like: Array<[string, string]>;
  order?: { column: string; ascending: boolean };
  limit?: number;
  range?: [number, number];
  single?: boolean;
  maybeSingle?: boolean;
  payload?: unknown;
  rpcArgs?: unknown;
}

export interface SupabaseAuthUser {
  id: string;
  email: string;
  user_metadata?: Record<string, unknown>;
}

export interface SupabaseMockOptions {
  error?: { message: string; code?: string } | null;
}

export function createSupabaseMock() {
  const fixtures = new Map<string, Row[]>();
  const rpcFixtures = new Map<string, unknown>();
  const errors = new Map<string, { message: string; code?: string }>();
  const calls: RecordedCall[] = [];
  let currentUser: SupabaseAuthUser | null = null;
  let authError: { message: string } | null = null;

  function setTable(table: string, rows: Row[]) {
    fixtures.set(table, rows);
  }

  function setRpc(name: string, value: unknown) {
    rpcFixtures.set(name, value);
  }

  function setTableError(table: string, error: { message: string; code?: string }) {
    errors.set(table, error);
  }

  function setUser(user: SupabaseAuthUser | null) {
    currentUser = user;
  }

  function setAuthError(error: { message: string } | null) {
    authError = error;
  }

  function filterRows(table: string, call: RecordedCall): Row[] {
    const rows = fixtures.get(table) ?? [];
    return rows.filter((row) => {
      // Dotted filters (e.g. "automation_issues.status") target a joined
      // relation and do not constrain the parent rows — skip them here.
      for (const [col, val] of call.eq) {
        if (col.includes(".")) continue;
        if (row[col] !== val) return false;
      }
      for (const [col, val] of call.neq) {
        if (col.includes(".")) continue;
        if (row[col] === val) return false;
      }
      for (const [col, vals] of call.in) {
        if (col.includes(".")) continue;
        if (!vals.includes(row[col])) return false;
      }
      for (const [col, val] of call.is) {
        if (col.includes(".")) continue;
        if (row[col] !== val) return false;
      }
      for (const [col, val] of call.gte) {
        if ((row[col] as number | string) < (val as number | string)) return false;
      }
      for (const [col, val] of call.lte) {
        if ((row[col] as number | string) > (val as number | string)) return false;
      }
      for (const [col, val] of call.gt) {
        if ((row[col] as number | string) <= (val as number | string)) return false;
      }
      for (const [col, val] of call.lt) {
        if ((row[col] as number | string) >= (val as number | string)) return false;
      }
      for (const [col, val] of call.ilike) {
        const cell = String(row[col] ?? "").toLowerCase();
        const pattern = val.toLowerCase().replace(/%/g, "");
        if (!cell.includes(pattern)) return false;
      }
      for (const [col, val] of call.like) {
        const cell = String(row[col] ?? "");
        const pattern = val.replace(/%/g, "");
        if (!cell.includes(pattern)) return false;
      }
      return true;
    });
  }

  function applyOrder(rows: Row[], call: RecordedCall): Row[] {
    if (!call.order) return rows;
    const { column, ascending } = call.order;
    const sorted = [...rows].sort((a, b) => {
      const va = a[column];
      const vb = b[column];
      if (va == null && vb == null) return 0;
      if (va == null) return ascending ? -1 : 1;
      if (vb == null) return ascending ? 1 : -1;
      if (va < vb) return ascending ? -1 : 1;
      if (va > vb) return ascending ? 1 : -1;
      return 0;
    });
    return sorted;
  }

  function applyRange(rows: Row[], call: RecordedCall): Row[] {
    if (call.range) {
      const [from, to] = call.range;
      return rows.slice(from, to + 1);
    }
    if (typeof call.limit === "number") {
      return rows.slice(0, call.limit);
    }
    return rows;
  }

  function projectRow(row: Row, select: string | undefined): Row {
    if (!select) return row;
    const trimmed = select.trim();
    if (trimmed === "*" || trimmed === "") return row;
    // Skip projection if the select uses joins/relations (contains parens).
    if (trimmed.includes("(")) return row;
    const cols = trimmed.split(",").map((c) => c.trim()).filter(Boolean);
    const projected: Row = {};
    for (const col of cols) {
      // Handle aliases like "foo:bar" — use the alias as the key.
      const [alias, source] = col.includes(":")
        ? col.split(":").map((p) => p.trim())
        : [col, col];
      projected[alias!] = row[source!];
    }
    return projected;
  }

  function settle(table: string, call: RecordedCall) {
    const errorEntry = errors.get(table);
    if (errorEntry) {
      return Promise.resolve({ data: null, error: errorEntry, count: null, status: 500, statusText: "error" });
    }
    let rows: Row[];
    if (call.op === "insert" || call.op === "upsert") {
      const incoming = Array.isArray(call.payload) ? call.payload : [call.payload];
      const existing = fixtures.get(table) ?? [];
      const merged = [...existing, ...(incoming as Row[])];
      fixtures.set(table, merged);
      rows = incoming as Row[];
    } else if (call.op === "update") {
      const matched = filterRows(table, call);
      const patch = (call.payload as Row) ?? {};
      const all = fixtures.get(table) ?? [];
      const updated = all.map((r) => (matched.includes(r) ? { ...r, ...patch } : r));
      fixtures.set(table, updated);
      rows = matched.map((r) => ({ ...r, ...patch }));
    } else if (call.op === "delete") {
      const matched = filterRows(table, call);
      const all = fixtures.get(table) ?? [];
      fixtures.set(
        table,
        all.filter((r) => !matched.includes(r)),
      );
      rows = matched;
    } else {
      rows = applyRange(applyOrder(filterRows(table, call), call), call);
    }

    const projected = rows.map((r) => projectRow(r, call.select));

    if (call.single) {
      const row = projected[0] ?? null;
      if (!row) {
        return Promise.resolve({
          data: null,
          error: { message: "No rows", code: "PGRST116" },
          count: null,
          status: 406,
          statusText: "Not Acceptable",
        });
      }
      return Promise.resolve({ data: row, error: null, count: 1, status: 200, statusText: "OK" });
    }
    if (call.maybeSingle) {
      return Promise.resolve({
        data: projected[0] ?? null,
        error: null,
        count: projected.length,
        status: 200,
        statusText: "OK",
      });
    }
    return Promise.resolve({
      data: projected,
      error: null,
      count: projected.length,
      status: 200,
      statusText: "OK",
    });
  }

  function buildBuilder(table: string, op: RecordedCall["op"], payload?: unknown) {
    const call: RecordedCall = {
      table,
      op,
      eq: [],
      neq: [],
      gte: [],
      lte: [],
      gt: [],
      lt: [],
      in: [],
      is: [],
      ilike: [],
      like: [],
      payload,
    };
    calls.push(call);

    const builder: Record<string, unknown> = {};
    const chain = () => builder as never;

    builder.select = (sel?: string) => {
      call.select = sel;
      return chain();
    };
    builder.eq = (col: string, val: unknown) => {
      call.eq.push([col, val]);
      return chain();
    };
    builder.neq = (col: string, val: unknown) => {
      call.neq.push([col, val]);
      return chain();
    };
    builder.gte = (col: string, val: unknown) => {
      call.gte.push([col, val]);
      return chain();
    };
    builder.lte = (col: string, val: unknown) => {
      call.lte.push([col, val]);
      return chain();
    };
    builder.gt = (col: string, val: unknown) => {
      call.gt.push([col, val]);
      return chain();
    };
    builder.lt = (col: string, val: unknown) => {
      call.lt.push([col, val]);
      return chain();
    };
    builder.in = (col: string, vals: unknown[]) => {
      call.in.push([col, vals]);
      return chain();
    };
    builder.is = (col: string, val: unknown) => {
      call.is.push([col, val]);
      return chain();
    };
    builder.ilike = (col: string, val: string) => {
      call.ilike.push([col, val]);
      return chain();
    };
    builder.like = (col: string, val: string) => {
      call.like.push([col, val]);
      return chain();
    };
    builder.order = (col: string, opts?: { ascending?: boolean }) => {
      call.order = { column: col, ascending: opts?.ascending ?? true };
      return chain();
    };
    builder.limit = (n: number) => {
      call.limit = n;
      return chain();
    };
    builder.range = (from: number, to: number) => {
      call.range = [from, to];
      return chain();
    };
    builder.single = () => {
      call.single = true;
      return settle(table, call);
    };
    builder.maybeSingle = () => {
      call.maybeSingle = true;
      return settle(table, call);
    };

    (builder as unknown as PromiseLike<unknown>).then = ((
      resolve: (v: unknown) => unknown,
      reject?: (e: unknown) => unknown,
    ) => settle(table, call).then(resolve, reject)) as never;

    return builder;
  }

  const client = {
    from(table: string) {
      return {
        select: (sel?: string) => {
          const b = buildBuilder(table, "select", undefined) as {
            select: (s?: string) => unknown;
          };
          return b.select(sel);
        },
        insert: (payload: unknown) => buildBuilder(table, "insert", payload),
        update: (payload: unknown) => buildBuilder(table, "update", payload),
        upsert: (payload: unknown) => buildBuilder(table, "upsert", payload),
        delete: () => buildBuilder(table, "delete"),
      };
    },
    rpc: vi.fn((name: string, args?: unknown) => {
      calls.push({
        table: `rpc:${name}`,
        op: "rpc",
        eq: [],
        neq: [],
        gte: [],
        lte: [],
        gt: [],
        lt: [],
        in: [],
        is: [],
        ilike: [],
        like: [],
        rpcArgs: args,
      });
      return Promise.resolve({
        data: rpcFixtures.get(name) ?? null,
        error: null,
      });
    }),
    auth: {
      getUser: vi.fn(() => {
        if (authError) {
          return Promise.resolve({ data: { user: null }, error: authError });
        }
        return Promise.resolve({ data: { user: currentUser }, error: null });
      }),
      getSession: vi.fn(() => {
        if (authError) {
          return Promise.resolve({ data: { session: null }, error: authError });
        }
        if (!currentUser) {
          return Promise.resolve({ data: { session: null }, error: null });
        }
        return Promise.resolve({
          data: { session: { user: currentUser, access_token: "test-token" } },
          error: null,
        });
      }),
      signOut: vi.fn(() => Promise.resolve({ error: null })),
      signUp: vi.fn(() => Promise.resolve({ data: { user: currentUser }, error: null })),
      signInWithPassword: vi.fn(() =>
        Promise.resolve({ data: { user: currentUser }, error: null }),
      ),
    },
  };

  return {
    client,
    calls,
    setTable,
    setTableError,
    setRpc,
    setUser,
    setAuthError,
    getCalls: (table?: string) =>
      table ? calls.filter((c) => c.table === table) : calls,
  };
}

export type SupabaseMock = ReturnType<typeof createSupabaseMock>;
