import { describe, it, expect } from "vitest";
import { getLtdAllocation } from "@/lib/queries/usage";

type Row = Record<string, unknown>;

function mockSupabase(ltdRow: Row | null) {
  return {
    from() {
      return {
        select: () => ({
          eq: () => ({
            maybeSingle: async () => ({ data: ltdRow, error: null }),
          }),
        }),
      };
    },
  } as never;
}

describe("getLtdAllocation", () => {
  it("returns seats remaining when some seats are sold", async () => {
    const client = mockSupabase({ total_seats: 20, seats_sold: 6 });
    const result = await getLtdAllocation(client);
    expect(result).toEqual({
      totalSeats: 20,
      seatsSold: 6,
      seatsRemaining: 14,
      soldOut: false,
    });
  });

  it("flags soldOut when seats_sold equals total_seats", async () => {
    const client = mockSupabase({ total_seats: 20, seats_sold: 20 });
    const result = await getLtdAllocation(client);
    expect(result.soldOut).toBe(true);
    expect(result.seatsRemaining).toBe(0);
  });

  it("falls back to defaults (20/0) when the row is missing", async () => {
    const client = mockSupabase(null);
    const result = await getLtdAllocation(client);
    expect(result).toEqual({
      totalSeats: 20,
      seatsSold: 0,
      seatsRemaining: 20,
      soldOut: false,
    });
  });

  it("never returns a negative seatsRemaining", async () => {
    const client = mockSupabase({ total_seats: 20, seats_sold: 25 });
    const result = await getLtdAllocation(client);
    expect(result.seatsRemaining).toBe(0);
    expect(result.soldOut).toBe(true);
  });
});
