/**
 *
 */
export type SearchHitType =
  | "customer"
  | "case"
  | "lead"
  | "document"
  | "task"
  | "conversation";

/**
 *
 */
export type SearchHit = {
  type: SearchHitType;
  id: string;
  title: string;
  subtitle?: string;
  href: string;
  score: number;
};

/**
 *
 */
export type SearchResponse = {
  query: string;
  hits: readonly SearchHit[];
  truncated: boolean;
};

export const MAX_HITS_PER_TYPE = 5;
export const MAX_TOTAL_HITS = 30;
export const QUERY_MIN_LENGTH = 1;
export const QUERY_MAX_LENGTH = 60;
