# MongoDB Integration Plan

## Overview

Replace the current in-memory rate limiting system with MongoDB for persistent storage across server restarts.

## Current Problem

- Rate limiting data stored in `Map<string, number>` (in-memory)
- Data lost when server restarts
- No persistence or scalability

## Proposed Solution

Integrate MongoDB to store rate limiting data persistently.

## Implementation Plan

### 1. Dependencies & Environment

- [ ] Install `mongodb` package for Bun
- [ ] Add `MONGODB_URI` environment variable to `.env`
- [ ] Update `.env.example` with MongoDB connection string format

### 2. Database Design

**Collection**: `rate_limits`

```typescript
{
  _id: ObjectId,
  ip: string,           // IP address (indexed)
  uploadCount: number,  // Current upload count
  createdAt: Date,      // First upload timestamp
  updatedAt: Date,      // Last upload timestamp
  resetAt?: Date        // Optional: for time-based resets
}
```

### 3. Implementation Structure

**New file**: `src/utils/database.ts`

- MongoDB connection singleton
- Rate limiting operations (get, increment, check)
- Index creation for performance

### 4. Modified Components

**`src/index.tsx` changes:**

- Remove `ipUploadCounts` Map
- Replace `checkQuota()` with async MongoDB operations
- Add database initialization on server start
- Update function signatures to be async

### 5. Performance Optimizations

- **Index on `ip` field** for fast lookups
- **TTL index** for automatic cleanup (optional)
- **Upsert operations** for atomic increment
- **Connection pooling** for concurrent requests

### 6. Migration Strategy

- Keep existing logic flow
- Make `checkQuota()` async
- Add error handling for database failures
- Graceful fallback to deny uploads if DB unavailable

### 7. Configuration Updates

- Document MongoDB setup in CLAUDE.md
- Add connection string format examples
- Include local development setup instructions

## Benefits

- **Persistence**: Rate limits survive server restarts
- **Scalability**: Works across multiple server instances
- **Analytics**: Historical data for monitoring
- **Flexibility**: Easy to implement time-based resets

## Implementation Checklist

- [ ] Install MongoDB driver (mongodb package)
- [ ] Add MongoDB connection string to environment variables
- [ ] Create MongoDB connection utility module
- [ ] Design rate limiting collection schema
- [ ] Replace in-memory Map with MongoDB operations in checkQuota function
- [ ] Add MongoDB cleanup/indexing for performance
- [ ] Update CLAUDE.md with MongoDB setup instructions
- [ ] Test rate limiting persistence across server restarts
