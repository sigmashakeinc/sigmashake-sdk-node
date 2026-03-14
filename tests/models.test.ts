import { describe, it, expect } from 'vitest';
import {
  Tier,
  MemberRole,
  SubscriptionStatus,
  DataClassification,
  ColumnType,
  FilterOp,
  AggregateType,
  DistanceMetric,
} from '../src/models.js';
import type {
  TokenRequest,
  TokenResponse,
  Account,
  AgentSession,
  ScanResult,
  MemoryEntry,
  QueryResponse,
  InterceptResult,
  ClusterStatusResponse,
} from '../src/models.js';

describe('Enum const objects', () => {
  it('Tier has correct values', () => {
    expect(Tier.Free).toBe('free');
    expect(Tier.Pro).toBe('pro');
    expect(Tier.Enterprise).toBe('enterprise');
  });

  it('MemberRole has correct values', () => {
    expect(MemberRole.Owner).toBe('owner');
    expect(MemberRole.Admin).toBe('admin');
    expect(MemberRole.Member).toBe('member');
  });

  it('SubscriptionStatus has correct values', () => {
    expect(SubscriptionStatus.Active).toBe('active');
    expect(SubscriptionStatus.PastDue).toBe('past_due');
    expect(SubscriptionStatus.Canceled).toBe('canceled');
    expect(SubscriptionStatus.Trialing).toBe('trialing');
  });

  it('DataClassification has correct values', () => {
    expect(DataClassification.Public).toBe('public');
    expect(DataClassification.Internal).toBe('internal');
    expect(DataClassification.Confidential).toBe('confidential');
    expect(DataClassification.Restricted).toBe('restricted');
  });

  it('ColumnType has correct values', () => {
    expect(ColumnType.Uint64).toBe('uint64');
    expect(ColumnType.Int64).toBe('int64');
    expect(ColumnType.Float64).toBe('float64');
    expect(ColumnType.String).toBe('string');
    expect(ColumnType.Timestamp).toBe('timestamp');
    expect(ColumnType.Uuid).toBe('uuid');
    expect(ColumnType.Bool).toBe('bool');
    expect(ColumnType.Json).toBe('json');
  });

  it('FilterOp has correct values', () => {
    expect(FilterOp.Eq).toBe('eq');
    expect(FilterOp.Ne).toBe('ne');
    expect(FilterOp.Lt).toBe('lt');
    expect(FilterOp.Le).toBe('le');
    expect(FilterOp.Gt).toBe('gt');
    expect(FilterOp.Ge).toBe('ge');
  });

  it('AggregateType has correct values', () => {
    expect(AggregateType.Count).toBe('count');
    expect(AggregateType.Sum).toBe('sum');
    expect(AggregateType.Min).toBe('min');
    expect(AggregateType.Max).toBe('max');
    expect(AggregateType.Avg).toBe('avg');
  });

  it('DistanceMetric has correct values', () => {
    expect(DistanceMetric.Cosine).toBe('cosine');
    expect(DistanceMetric.DotProduct).toBe('dot_product');
    expect(DistanceMetric.L2).toBe('l2');
  });
});

describe('Type shape validation (runtime)', () => {
  it('TokenRequest shape is assignable', () => {
    const req: TokenRequest = { agentId: 'a1', scopes: ['read', 'write'] };
    expect(req.agentId).toBe('a1');
    expect(req.scopes).toHaveLength(2);
  });

  it('TokenResponse shape is assignable', () => {
    const res: TokenResponse = { token: 'tok', expiresAt: '2026-01-01', scopes: ['read'] };
    expect(res.token).toBe('tok');
  });

  it('Account shape is assignable', () => {
    const acc: Account = {
      id: 'acc-1',
      name: 'Test Org',
      tier: Tier.Pro,
      createdAt: '2026-01-01',
      updatedAt: '2026-01-01',
    };
    expect(acc.tier).toBe('pro');
  });

  it('AgentSession shape is assignable', () => {
    const sess: AgentSession = {
      sessionId: 's1',
      agentId: 'a1',
      agentType: 'coding',
      expiresAt: '2026-01-01',
    };
    expect(sess.sessionId).toBe('s1');
  });

  it('ScanResult shape is assignable', () => {
    const result: ScanResult = {
      allowed: true,
      riskScore: 0.05,
      findings: [],
      recommendedActions: [],
    };
    expect(result.allowed).toBe(true);
  });

  it('MemoryEntry shape is assignable', () => {
    const entry: MemoryEntry = {
      key: 'ctx',
      value: 'hello',
      tags: ['session-1'],
      createdAt: '',
      updatedAt: '',
    };
    expect(entry.tags).toContain('session-1');
  });

  it('QueryResponse shape is assignable', () => {
    const resp: QueryResponse = { columns: ['id'], rows: [[1]], totalRows: 1 };
    expect(resp.totalRows).toBe(1);
  });

  it('InterceptResult shape is assignable', () => {
    const result: InterceptResult = { allowed: true, modified: false };
    expect(result.allowed).toBe(true);
  });

  it('ClusterStatusResponse shape is assignable', () => {
    const status: ClusterStatusResponse = {
      clusterId: 'c1',
      status: 'healthy',
      nodes: 3,
      replicationFactor: 2,
      shards: 6,
      healthy: true,
    };
    expect(status.nodes).toBe(3);
  });
});
