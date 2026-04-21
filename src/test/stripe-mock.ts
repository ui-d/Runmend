/**
 * Reusable Stripe SDK mock. Covers the methods runmend actually calls:
 * checkout.sessions.create, billingPortal.sessions.create,
 * subscriptions.retrieve/update, invoices.list, customers.create/retrieve,
 * webhooks.constructEvent.
 */

import { vi } from "vitest";

export function createStripeMock() {
  const checkoutSessionsCreate = vi.fn();
  const billingPortalSessionsCreate = vi.fn();
  const subscriptionsRetrieve = vi.fn();
  const subscriptionsUpdate = vi.fn();
  const invoicesList = vi.fn();
  const customersCreate = vi.fn();
  const customersRetrieve = vi.fn();
  const customersList = vi.fn();
  const constructEvent = vi.fn();

  const client = {
    checkout: {
      sessions: {
        create: checkoutSessionsCreate,
      },
    },
    billingPortal: {
      sessions: {
        create: billingPortalSessionsCreate,
      },
    },
    subscriptions: {
      retrieve: subscriptionsRetrieve,
      update: subscriptionsUpdate,
    },
    invoices: {
      list: invoicesList,
    },
    customers: {
      create: customersCreate,
      retrieve: customersRetrieve,
      list: customersList,
    },
    webhooks: {
      constructEvent,
    },
  };

  return {
    client,
    checkoutSessionsCreate,
    billingPortalSessionsCreate,
    subscriptionsRetrieve,
    subscriptionsUpdate,
    invoicesList,
    customersCreate,
    customersRetrieve,
    customersList,
    constructEvent,
  };
}

export type StripeMock = ReturnType<typeof createStripeMock>;
