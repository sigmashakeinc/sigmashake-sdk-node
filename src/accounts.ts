import { HttpClient } from './http.js';
import type {
  Account,
  CreateAccountBody,
  Subscription,
  UpdateSubscriptionBody,
  Seat,
  AddSeatBody,
  TenantUsage,
} from './models.js';

export class AccountsApi {
  constructor(private readonly http: HttpClient) {}

  /** Create a new account. */
  create(body: CreateAccountBody): Promise<Account> {
    return this.http.post<Account>('/v1/accounts', body);
  }

  /** Get an account by ID. */
  get(accountId: string): Promise<Account> {
    return this.http.get<Account>(`/v1/accounts/${accountId}`);
  }

  /** List all accounts (paginated). */
  list(limit = 50, offset = 0): Promise<Account[]> {
    return this.http.get<Account[]>(`/v1/accounts?limit=${limit}&offset=${offset}`);
  }

  /** Get the current subscription for an account. */
  getSubscription(accountId: string): Promise<Subscription> {
    return this.http.get<Subscription>(`/v1/accounts/${accountId}/subscription`);
  }

  /** Update subscription tier or status. */
  updateSubscription(accountId: string, body: UpdateSubscriptionBody): Promise<Subscription> {
    return this.http.patch<Subscription>(`/v1/accounts/${accountId}/subscription`, body);
  }

  /** List seats for an account. */
  listSeats(accountId: string): Promise<Seat[]> {
    return this.http.get<Seat[]>(`/v1/accounts/${accountId}/seats`);
  }

  /** Add a seat to an account. */
  addSeat(accountId: string, body: AddSeatBody): Promise<Seat> {
    return this.http.post<Seat>(`/v1/accounts/${accountId}/seats`, body);
  }

  /** Remove a seat from an account. */
  removeSeat(accountId: string, seatId: string): Promise<void> {
    return this.http.delete<void>(`/v1/accounts/${accountId}/seats/${seatId}`);
  }

  /** Get usage metrics for an account. */
  getUsage(accountId: string): Promise<TenantUsage> {
    return this.http.get<TenantUsage>(`/v1/accounts/${accountId}/usage`);
  }
}
