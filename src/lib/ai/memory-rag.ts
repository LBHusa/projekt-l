// ============================================
// RAG MEMORY SERVICE
// Phase 3: Lebendiger Buddy
// Semantic search over conversations using Qdrant
// ============================================

import { QdrantClient } from '@qdrant/js-client-rest';
import OpenAI from 'openai';
import type { ConversationHistory, UserMemoryContext, RecentMessage } from '@/lib/database.types';

// ============================================
// CONFIGURATION
// ============================================

// CRITICAL: Collection name - ONLY use this, not HUSATECH collections!
const COLLECTION_NAME = 'projekt_l_memory';

// Qdrant server configuration
const QDRANT_HOST = process.env.QDRANT_HOST || '87.106.191.206';
const QDRANT_PORT = parseInt(process.env.QDRANT_PORT || '6333', 10);

// Embedding configuration
const EMBEDDING_MODEL = 'text-embedding-3-large';
const EMBEDDING_DIMENSIONS = 3072;

// Search configuration
const DEFAULT_SEARCH_LIMIT = 5;
const SIMILARITY_THRESHOLD = 0.7;

// ============================================
// CLIENT INITIALIZATION
// ============================================

let qdrantClient: QdrantClient | null = null;
let openaiClient: OpenAI | null = null;

/**
 * Get Qdrant client (lazy initialization)
 */
function getQdrantClient(): QdrantClient {
  if (!qdrantClient) {
    qdrantClient = new QdrantClient({
      host: QDRANT_HOST,
      port: QDRANT_PORT,
    });
  }
  return qdrantClient;
}

/**
 * Get OpenAI client (lazy initialization)
 */
function getOpenAIClient(): OpenAI {
  if (!openaiClient) {
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      throw new Error('OPENAI_API_KEY not configured');
    }
    openaiClient = new OpenAI({ apiKey });
  }
  return openaiClient;
}

// ============================================
// COLLECTION MANAGEMENT
// ============================================

/**
 * Ensure the projekt_l_memory collection exists
 * CRITICAL: This ONLY creates projekt_l_memory, never touches other collections
 */
export async function ensureCollection(): Promise<void> {
  const client = getQdrantClient();

  try {
    // Check if collection exists
    const collections = await client.getCollections();
    const exists = collections.collections.some(c => c.name === COLLECTION_NAME);

    if (exists) {
      console.log(`[Memory RAG] Collection ${COLLECTION_NAME} already exists`);
      return;
    }

    // Create new collection with payload indexes
    console.log(`[Memory RAG] Creating collection ${COLLECTION_NAME}`);
    await client.createCollection(COLLECTION_NAME, {
      vectors: {
        size: EMBEDDING_DIMENSIONS,
        distance: 'Cosine',
      },
      // Optimizations for filtered search
      optimizers_config: {
        indexing_threshold: 10000,
      },
    });

    // Create payload index on user_id for fast filtering
    // CRITICAL: This enables efficient user isolation
    await client.createPayloadIndex(COLLECTION_NAME, {
      field_name: 'user_id',
      field_schema: 'keyword',
    });

    // Create index on created_at for time-based queries
    await client.createPayloadIndex(COLLECTION_NAME, {
      field_name: 'created_at',
      field_schema: 'datetime',
    });

    console.log(`[Memory RAG] Collection ${COLLECTION_NAME} created with indexes`);
  } catch (error) {
    console.error('[Memory RAG] Error ensuring collection:', error);
    throw error;
  }
}

/**
 * Get collection info for debugging
 */
export async function getCollectionInfo(): Promise<{
  name: string;
  pointsCount: number;
  status: string;
} | null> {
  try {
    const client = getQdrantClient();
    const info = await client.getCollection(COLLECTION_NAME);
    return {
      name: COLLECTION_NAME,
      pointsCount: info.points_count || 0,
      status: info.status,
    };
  } catch (error) {
    console.error('[Memory RAG] Error getting collection info:', error);
    return null;
  }
}

// ============================================
// EMBEDDING GENERATION
// ============================================

/**
 * Generate embedding for text using OpenAI
 */
async function generateEmbedding(text: string): Promise<number[]> {
  const openai = getOpenAIClient();

  const response = await openai.embeddings.create({
    model: EMBEDDING_MODEL,
    input: text,
    dimensions: EMBEDDING_DIMENSIONS,
  });

  return response.data[0].embedding;
}

// ============================================
// CONVERSATION STORAGE IN QDRANT
// ============================================

/**
 * Store a conversation message embedding in Qdrant
 * Returns the point ID for reference
 */
export async function storeConversationEmbedding(
  conversation: ConversationHistory,
  userId: string
): Promise<number> {
  const client = getQdrantClient();

  // Generate embedding from content
  const embedding = await generateEmbedding(conversation.content);

  // Generate point ID from UUID (hash to bigint)
  const pointId = hashUuidToBigInt(conversation.id);

  // Prepare payload with metadata
  const payload = {
    supabase_id: conversation.id,
    user_id: userId,
    role: conversation.role,
    source: conversation.source,
    created_at: conversation.created_at,
    // Store first 500 chars for preview (not full content - that's in Supabase)
    content_preview: conversation.content.substring(0, 500),
    has_tool_calls: !!conversation.tool_calls,
  };

  // Upsert point to Qdrant
  await client.upsert(COLLECTION_NAME, {
    wait: true,
    points: [
      {
        id: pointId,
        vector: embedding,
        payload,
      },
    ],
  });

  console.log(`[Memory RAG] Stored embedding for conversation ${conversation.id}`);
  return pointId;
}

/**
 * Store multiple conversation embeddings in batch
 */
export async function storeConversationEmbeddingsBatch(
  conversations: ConversationHistory[],
  userId: string
): Promise<number[]> {
  if (conversations.length === 0) return [];

  const client = getQdrantClient();

  // Generate all embeddings in parallel
  const embeddings = await Promise.all(
    conversations.map(c => generateEmbedding(c.content))
  );

  // Prepare points
  const points = conversations.map((conversation, index) => ({
    id: hashUuidToBigInt(conversation.id),
    vector: embeddings[index],
    payload: {
      supabase_id: conversation.id,
      user_id: userId,
      role: conversation.role,
      source: conversation.source,
      created_at: conversation.created_at,
      content_preview: conversation.content.substring(0, 500),
      has_tool_calls: !!conversation.tool_calls,
    },
  }));

  // Batch upsert
  await client.upsert(COLLECTION_NAME, {
    wait: true,
    points,
  });

  console.log(`[Memory RAG] Stored ${conversations.length} embeddings in batch`);
  return points.map(p => p.id as number);
}

// ============================================
// SEMANTIC SEARCH
// ============================================

export interface MemorySearchResult {
  supabaseId: string;
  score: number;
  role: string;
  source: string;
  contentPreview: string;
  createdAt: string;
}

/**
 * Search user's memory for semantically similar content
 * CRITICAL: Always filters by user_id to ensure user isolation
 */
export async function searchUserMemory(
  query: string,
  userId: string,
  options: {
    limit?: number;
    minScore?: number;
    roleFilter?: 'user' | 'assistant';
    sourceFilter?: 'web' | 'telegram' | 'api';
  } = {}
): Promise<MemorySearchResult[]> {
  const client = getQdrantClient();
  const limit = options.limit || DEFAULT_SEARCH_LIMIT;
  const minScore = options.minScore || SIMILARITY_THRESHOLD;

  // Generate query embedding
  const queryEmbedding = await generateEmbedding(query);

  // Build filter conditions - ALWAYS include user_id
  const mustConditions: Array<{
    key: string;
    match: { value: string };
  }> = [
    {
      key: 'user_id',
      match: { value: userId },
    },
  ];

  if (options.roleFilter) {
    mustConditions.push({
      key: 'role',
      match: { value: options.roleFilter },
    });
  }

  if (options.sourceFilter) {
    mustConditions.push({
      key: 'source',
      match: { value: options.sourceFilter },
    });
  }

  // Perform search with filter
  const results = await client.search(COLLECTION_NAME, {
    vector: queryEmbedding,
    limit,
    score_threshold: minScore,
    filter: {
      must: mustConditions,
    },
    with_payload: true,
  });

  // Transform results
  return results.map(result => ({
    supabaseId: result.payload?.supabase_id as string,
    score: result.score,
    role: result.payload?.role as string,
    source: result.payload?.source as string,
    contentPreview: result.payload?.content_preview as string,
    createdAt: result.payload?.created_at as string,
  }));
}

/**
 * Get total embedding count for a user
 */
export async function getUserEmbeddingCount(userId: string): Promise<number> {
  const client = getQdrantClient();

  const result = await client.count(COLLECTION_NAME, {
    filter: {
      must: [
        {
          key: 'user_id',
          match: { value: userId },
        },
      ],
    },
    exact: true,
  });

  return result.count;
}

// ============================================
// HYBRID CONTEXT BUILDER
// ============================================

export interface HybridContext {
  // Recent messages from sliding window
  recentMessages: RecentMessage[];
  // Summary and patterns from user_summaries
  memorySummary: UserMemoryContext | null;
  // RAG search results if query provided
  semanticResults: MemorySearchResult[];
  // Formatted context string for system prompt
  contextString: string;
}

/**
 * Build hybrid context for AI chat
 * Combines: Summary + Patterns + Recent Messages + Semantic Search
 */
export async function buildHybridContext(
  userId: string,
  recentMessages: RecentMessage[],
  memorySummary: UserMemoryContext | null,
  currentQuery?: string
): Promise<HybridContext> {
  // Start with empty semantic results
  let semanticResults: MemorySearchResult[] = [];

  // If we have a query, search for relevant past conversations
  if (currentQuery) {
    try {
      semanticResults = await searchUserMemory(currentQuery, userId, {
        limit: 3,
        minScore: 0.75,
      });
    } catch (error) {
      console.error('[Memory RAG] Semantic search error:', error);
      // Continue without semantic results
    }
  }

  // Build context string
  const contextParts: string[] = [];

  // Add summary if available
  if (memorySummary?.weekly_summary) {
    contextParts.push(`## Wochenrückblick\n${memorySummary.weekly_summary}`);
  }

  // Add preferences if available
  if (memorySummary?.preferences && Object.keys(memorySummary.preferences as object).length > 0) {
    const prefs = memorySummary.preferences as Record<string, unknown>;
    const prefLines = Object.entries(prefs)
      .map(([k, v]) => `- ${k}: ${v}`)
      .join('\n');
    contextParts.push(`## Präferenzen\n${prefLines}`);
  }

  // Add patterns if available
  if (memorySummary?.patterns && Object.keys(memorySummary.patterns as object).length > 0) {
    const pats = memorySummary.patterns as Record<string, unknown>;
    const patLines = Object.entries(pats)
      .map(([k, v]) => `- ${k}: ${v}`)
      .join('\n');
    contextParts.push(`## Erkannte Muster\n${patLines}`);
  }

  // Add relevant past conversations from RAG
  if (semanticResults.length > 0) {
    const ragContext = semanticResults
      .map(r => `- [${r.role}, ${new Date(r.createdAt).toLocaleDateString('de-DE')}]: "${r.contentPreview}"`)
      .join('\n');
    contextParts.push(`## Relevante frühere Gespräche\n${ragContext}`);
  }

  return {
    recentMessages,
    memorySummary,
    semanticResults,
    contextString: contextParts.length > 0
      ? `# MEMORY CONTEXT\n\n${contextParts.join('\n\n')}`
      : '',
  };
}

// ============================================
// UTILITY FUNCTIONS
// ============================================

/**
 * Hash UUID to BigInt for Qdrant point ID
 * Qdrant requires numeric IDs
 */
function hashUuidToBigInt(uuid: string): number {
  // Remove dashes and take first 15 chars (safe for JS number)
  const hex = uuid.replace(/-/g, '').substring(0, 15);
  return parseInt(hex, 16);
}

/**
 * Delete all embeddings for a user (for GDPR)
 */
export async function deleteUserEmbeddings(userId: string): Promise<number> {
  const client = getQdrantClient();

  const result = await client.delete(COLLECTION_NAME, {
    wait: true,
    filter: {
      must: [
        {
          key: 'user_id',
          match: { value: userId },
        },
      ],
    },
  });

  console.log(`[Memory RAG] Deleted embeddings for user ${userId}`);
  return result.status === 'completed' ? 1 : 0;
}

// ============================================
// HEALTH CHECK
// ============================================

/**
 * Check if Qdrant is available and collection exists
 */
export async function checkHealth(): Promise<{
  qdrantAvailable: boolean;
  collectionExists: boolean;
  collectionInfo: Awaited<ReturnType<typeof getCollectionInfo>>;
}> {
  try {
    const client = getQdrantClient();

    // Check Qdrant is up
    const collections = await client.getCollections();
    const qdrantAvailable = true;

    // Check our collection exists
    const collectionExists = collections.collections.some(c => c.name === COLLECTION_NAME);

    // Get collection info
    const collectionInfo = collectionExists ? await getCollectionInfo() : null;

    return {
      qdrantAvailable,
      collectionExists,
      collectionInfo,
    };
  } catch (error) {
    console.error('[Memory RAG] Health check failed:', error);
    return {
      qdrantAvailable: false,
      collectionExists: false,
      collectionInfo: null,
    };
  }
}
