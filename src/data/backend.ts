import type { Question } from '../types';

export const backend: Question[] = [
  // API design (5)
  {
    id: 'backend-001',
    round: 'backend',
    category: 'API design',
    question: 'A client retries POST /payments after a timeout. How do you make sure the customer is charged once?',
    answer: [
      'Name the failure first: a timeout tells the client nothing about whether the server committed, so a retry is the correct client behaviour and the server has to make it safe. That is an idempotency problem, not a networking one.',
      'The client sends an Idempotency-Key header, a UUID generated once per logical payment. The server stores the key with a hash of the request body and the eventual response, inside the same transaction that creates the payment, with a unique constraint on the key. A repeat with the same key and body returns the stored response; the same key with a different body is a 422, because that is a client bug, not a retry.',
      'Cover the concurrent case out loud: two identical requests arriving together both miss the lookup, and the unique constraint is what makes one of them lose. The loser either waits and replays the winner\'s stored response or gets a 409 to retry. Keys expire after a window, say 24 hours, that is longer than any client\'s retry policy.',
    ],
    keyPoints: [
      'Treats a timeout as an unknown outcome, so retries must be safe server-side',
      'Client-generated idempotency key, one per logical operation',
      'Key, request hash and response stored in the same transaction as the side effect',
      'A database unique constraint, not a read-then-write check, settles concurrent duplicates',
      'Same key with a different body is rejected, not replayed',
    ],
    followUps: ['What changes when the side effect is a call to an external payment provider rather than your own database?', 'How long do you keep keys, and what decides it?'],
    deeper: [
      'With an external provider you cannot share a transaction, so record the key as "in progress" first, pass your key through to the provider (most accept one), and reconcile stuck "in progress" rows with a job that asks the provider for the outcome.',
    ],
  },
  {
    id: 'backend-002',
    round: 'backend',
    category: 'API design',
    question: 'You are building the API for a product with a web app and two mobile apps. REST or GraphQL?',
    answer: [
      'Start from the clients, not the technology: three clients with different screens and release cycles is the case GraphQL was built for, because each client asks for exactly the fields it renders and the server does not grow a bespoke endpoint per screen. Mobile apps that stay installed for months make that matter more, since you cannot change an old app\'s requests.',
      'Then name what GraphQL costs: HTTP caching mostly goes away because everything is a POST to one endpoint, so you need persisted queries or client-side caching instead; one innocent-looking query can fan out into hundreds of resolver calls, so you need a dataloader and query cost limits; and authorization moves from per-route to per-field.',
      'My default is REST with well-shaped resources when the clients mostly show the same data, the team is small, or public consumers and CDN caching matter. GraphQL, or a BFF per client, when screens diverge and over-fetching is a measured problem. Either way, the contract is typed and generated, not hand-written twice.',
    ],
    keyPoints: [
      'Decides from client count, screen divergence and release cycles',
      'Names lost HTTP caching and the persisted-query answer',
      'Names resolver fan-out and dataloader batching with cost limits',
      'Notes authorization moves to field level',
      'States a default and the condition that flips it',
    ],
    followUps: ['How do you stop one expensive GraphQL query from taking the database down?', 'Where does a BFF fit next to this choice?'],
  },
  {
    id: 'backend-003',
    round: 'backend',
    category: 'API design',
    question: 'How do you version a public API so you can change it without breaking existing clients?',
    answer: [
      'First, avoid needing a version: most changes can be additive. New optional fields, new endpoints and new enum values the client is told to tolerate are not breaking, so publish a compatibility rule that clients must ignore unknown fields and the bar for a new version gets high.',
      'When a change genuinely breaks the contract, such as renaming a field, changing a type or tightening validation, version explicitly. A path prefix like /v2 is the easiest to route, cache and debug; a date-based header version, where each client pins the version it was built against, gives finer steps but needs translation layers between versions on the server.',
      'The real work is retiring the old version: measure who still calls it per client id, announce a deprecation date with a Sunset header, contact the remaining callers directly, and only then remove it. A version you can never remove is just permanent maintenance.',
    ],
    keyPoints: [
      'Prefers additive change and a tolerant-reader rule over new versions',
      'Lists what actually breaks a contract',
      'Compares path versioning with pinned header or date versions',
      'Plans deprecation with usage metrics, a Sunset date and direct outreach',
    ],
    followUps: ['Is adding a value to an enum a breaking change?', 'How would you test that v1 still behaves after a v2 change?'],
  },
  {
    id: 'backend-004',
    round: 'backend',
    category: 'API design',
    question: 'A feed API pages with ?page=3&limit=20. Users report duplicate and missing items while scrolling. Why, and what do you change?',
    answer: [
      'Offset pagination counts rows from the top at request time. If new items are inserted while the user scrolls, everything shifts down and page 3 repeats items from page 2; if items are deleted, rows shift up and some are never shown. It is also slow at depth, because OFFSET 10000 still reads and discards ten thousand rows.',
      'Switch to cursor, or keyset, pagination: return an opaque cursor that encodes the sort key of the last item, here created_at plus id as a tiebreaker, and fetch the next page with WHERE (created_at, id) < (cursor values) ORDER BY created_at DESC, id DESC LIMIT 20. Inserts above the cursor no longer move the window, and with an index on (created_at, id) every page costs the same.',
      'Say what you give up: no jumping to page 47 and no cheap total count. For a feed that is fine; for an admin table with page numbers, keep offset and accept the drift.',
    ],
    keyPoints: [
      'Explains drift: inserts and deletes shift offset windows',
      'Notes deep offsets are slow because skipped rows are still read',
      'Keyset cursor on a unique, ordered tuple with a tiebreaker',
      'Matching composite index makes each page constant cost',
      'States the trade-off: no random access, no cheap totals',
    ],
    followUps: ['Why must the cursor be opaque to the client?', 'How do you page backwards with a cursor?'],
  },
  {
    id: 'backend-005',
    round: 'backend',
    category: 'API design',
    question: 'Design the error contract for an API that a web app, mobile apps and partner integrations all consume.',
    answer: [
      'Status codes carry the class of failure so generic clients, proxies and retries behave correctly: 400 for a malformed request, 401 and 403 kept distinct, 404, 409 for a conflict, 422 for valid syntax that fails business rules, 429 with Retry-After, and 5xx only for genuine server faults, because clients retry those.',
      'The body has one shape everywhere, for example the RFC 9457 problem-details format: a stable machine-readable code like card_declined that clients branch on, a human message they are told never to parse, a request id that matches your logs, and for validation errors a list of field paths with a code each, so a form can put the message next to the right input.',
      'Treat the codes as part of the API: documented, never renamed, new ones additive. Never leak stack traces or SQL in the message, and log the detail server-side against the request id instead.',
    ],
    keyPoints: [
      'Status codes chosen so retries and proxies behave correctly',
      'One body shape with a stable machine code, separate from the message',
      'Request id ties a client report to server logs',
      'Field-level validation errors a form can render',
      'Error codes are versioned contract; no internals leaked',
    ],
    followUps: ['Which errors should a client retry automatically?', 'How do you localise error messages for end users?'],
  },

  // Data & Postgres (6)
  {
    id: 'backend-006',
    round: 'backend',
    category: 'Data & Postgres',
    question: 'Model orders, line items and refunds for a shop in Postgres. What are the tables and the decisions that matter?',
    answer: [
      'Tables: customers, products, orders, order_items and refunds, with refund_items when a refund can cover part of an order. The decision that matters most is that an order item copies the price, currency and product name at purchase time rather than joining to the live product row; a product\'s price changes, a past invoice must not.',
      'Money is an integer in minor units plus a currency column, never a float. Order status is a constrained column, a check constraint or an enum, with a status-history table if anyone will ask when something changed. Totals are either computed or stored with a check that keeps them honest, and I would say which: stored totals are faster to read but can drift.',
      'Refunds never mutate the original order rows. They are their own records referencing the order items they cover, so the ledger always adds up and audit questions are answerable. Foreign keys and NOT NULL constraints enforce what the application assumes, because the database outlives every service that writes to it.',
    ],
    keyPoints: [
      'Snapshots price and product details onto the order item',
      'Integer minor units plus currency, never floats',
      'Constrained status with history if audits matter',
      'Refunds as separate append-only records, not edits',
      'Constraints in the database, not only in application code',
    ],
    followUps: ['How would you handle a price that includes tax in some countries and not others?', 'Where would you put a discount code?'],
  },
  {
    id: 'backend-007',
    round: 'backend',
    category: 'Data & Postgres',
    question: 'A query that lists a customer\'s recent orders has become slow. Walk me through diagnosing it and choosing an index.',
    answer: [
      'Reproduce it with EXPLAIN (ANALYZE, BUFFERS) on production-like data, because the planner chooses differently on a tiny dev table. I look for a sequential scan over a big table, a large gap between estimated and actual rows, which points at stale statistics, and a sort step that spills to disk.',
      'The query is WHERE customer_id = $1 AND status <> \'cancelled\' ORDER BY created_at DESC LIMIT 20. A composite index on (customer_id, created_at DESC) serves both the filter and the order, so Postgres walks the index in order and stops after twenty rows that pass the status filter. Column order matters: the equality column first, then the sort column. If cancelled orders are a big share, a partial index with WHERE status <> \'cancelled\' makes it smaller and means exactly twenty entries are read.',
      'Then check the cost side: every index slows writes and takes memory, so drop the single-column index the new one makes redundant, build it with CREATE INDEX CONCURRENTLY so writes are not blocked, and confirm with EXPLAIN that the plan actually changed.',
    ],
    keyPoints: [
      'EXPLAIN ANALYZE on realistic data; reads estimates against actuals',
      'Composite index ordered equality column first, then sort column',
      'Index serves filter and ORDER BY so LIMIT stops early',
      'Partial index when a predicate excludes much of the table',
      'Builds concurrently and removes redundant indexes',
    ],
    followUps: ['When would Postgres ignore an index you just created?', 'What is a covering index and when does it help?'],
  },
  {
    id: 'backend-008',
    round: 'backend',
    category: 'Data & Postgres',
    question: 'Two users book the last seat on a flight at the same moment and both succeed. What went wrong, and how do you fix it?',
    answer: [
      'The code read the seat count, saw one left, and then wrote a booking. Under Postgres\'s default READ COMMITTED isolation both transactions ran their SELECT before either committed, so both saw one seat left and both passed the check. This is a race between a read and a dependent write, not a bug in the SQL itself.',
      'There are three fixes, from narrowest to widest. Make the write conditional: UPDATE flights SET seats_left = seats_left - 1 WHERE id = $1 AND seats_left > 0, and treat zero affected rows as sold out; it works under READ COMMITTED because the second writer waits on the row lock and then re-checks the WHERE clause against the committed row. Or lock the row first with SELECT ... FOR UPDATE so the second transaction waits. Or a unique constraint on (flight_id, seat_no) if seats are assigned, which makes the database reject the double booking outright.',
      'SERIALIZABLE isolation also catches it, but then every transaction must be ready to retry on a serialization failure. I would use the conditional update or the constraint, because the invariant lives in the database rather than in code that every future caller has to remember.',
    ],
    keyPoints: [
      'Identifies a check-then-act race under READ COMMITTED',
      'Conditional UPDATE with affected-row check',
      'SELECT FOR UPDATE row lock as an alternative',
      'Unique constraint when the invariant is per-seat',
      'SERIALIZABLE requires retry handling',
    ],
    followUps: ['What anomaly does REPEATABLE READ still allow in Postgres?', 'How do you avoid deadlocks when locking several rows?'],
  },
  {
    id: 'backend-009',
    round: 'backend',
    category: 'Data & Postgres',
    question: 'You need to rename a column and make it NOT NULL on a busy table without downtime. How do you roll it out?',
    answer: [
      'Never in one migration, because the old application version is still running during a deploy and would break the moment the column it reads disappears. Use expand, migrate, contract, with each step shipped and verified on its own.',
      'Expand: add the new nullable column and deploy code that writes both columns. Migrate: backfill old rows in small batches, a few thousand at a time with pauses, so you do not hold long locks or flood replication. Then switch reads to the new column. To make it NOT NULL cheaply, add a CHECK (new_col IS NOT NULL) NOT VALID constraint, VALIDATE it, which scans without blocking writes, and then SET NOT NULL, which Postgres can prove from the validated check.',
      'Contract: once nothing reads the old column, remove the dual write and drop the column in a later release. Set a lock_timeout on every migration so a migration waiting behind a long query fails fast instead of queueing every write behind it.',
    ],
    keyPoints: [
      'Expand, migrate, contract across separate deploys',
      'Dual write while old and new code coexist',
      'Batched backfill to avoid long locks and replication lag',
      'NOT VALID check, then VALIDATE, then SET NOT NULL',
      'lock_timeout so a blocked migration fails fast',
    ],
    followUps: ['How do you roll back halfway through?', 'Which ALTER TABLE operations take an exclusive lock?'],
  },
  {
    id: 'backend-010',
    round: 'backend',
    category: 'Data & Postgres',
    question: 'An endpoint that returns 50 orders with their customers makes 51 queries. How did that happen, and how do you fix it?',
    answer: [
      'It is the N+1 pattern: one query for the orders, then the ORM lazily loads each order\'s customer as the serializer touches it. The code reads like a single loop, so it passes review, and with ten rows in development nobody notices; in production it is fifty round trips per request.',
      'Fix it at the query: eager-load the relation, which in most ORMs becomes either a JOIN or a second query with WHERE id IN (...) over the collected ids. Two queries total regardless of page size. For GraphQL resolvers, where you cannot see the whole query up front, use a dataloader that batches every customer lookup in one tick into one IN query.',
      'Prevent it coming back: log queries per request in development and fail a test when an endpoint exceeds a budget, because N+1 always returns the next time someone adds a field to the serializer.',
    ],
    keyPoints: [
      'Explains lazy loading inside a loop or serializer',
      'Eager loading via JOIN or a batched IN query',
      'Dataloader batching for resolvers',
      'Query-count budget in tests to stop regressions',
    ],
    followUps: ['When is a JOIN worse than two queries?', 'How would you spot N+1 in production metrics?'],
  },
  {
    id: 'backend-011',
    round: 'backend',
    category: 'Data & Postgres',
    question: 'A teammate wants to store product attributes in a JSONB column instead of adding columns. When is that right, and when is it a mistake?',
    answer: [
      'JSONB is right for data that is genuinely variable and mostly read as a whole: attributes that differ per product category, third-party payloads you store for audit, user preferences. It saves a migration per new attribute and Postgres can still index into it with a GIN index or an expression index on one key.',
      'It is a mistake for anything you filter, join, aggregate or must keep valid. The database cannot enforce types, NOT NULL or foreign keys inside the document, so every reader has to defend against missing or malformed keys, and the planner has no statistics on values inside it, which produces bad query plans.',
      'My rule: fields the business reasons about get real columns; the long tail goes in JSONB, with a schema validated at the application boundary. When a JSONB key starts appearing in WHERE clauses, promote it to a column.',
    ],
    keyPoints: [
      'Good fit: variable, read-whole, low-query data',
      'GIN or expression indexes when you do query into it',
      'Loses constraints, types and planner statistics',
      'Promote hot keys to real columns',
    ],
    followUps: ['How would you migrate a JSONB key into a column without downtime?', 'How do you validate JSONB contents?'],
  },

  // Caching & performance (4)
  {
    id: 'backend-012',
    round: 'backend',
    category: 'Caching & performance',
    question: 'Compare cache-aside and write-through caching with Redis. Where can each serve stale data?',
    answer: [
      'Cache-aside: the application reads Redis, and on a miss reads the database and fills the cache with a TTL; on a write it updates the database and deletes the key. It is simple and only caches what is read. The stale window is a race: a reader misses, reads the old row, a writer updates and deletes the key, then the reader writes the old value back, and it stays stale until the TTL.',
      'Write-through: every write goes to the cache and the database together, so reads are always warm. But a write that succeeds in one store and fails in the other leaves them out of sync, and you cache data nobody reads.',
      'Either way, set a TTL as the backstop for every bug you have not found, delete rather than update on writes so concurrent writers cannot interleave values, and decide per data type how stale is acceptable. A product description can be minutes old; a balance should not be cached at all.',
    ],
    keyPoints: [
      'Describes both patterns accurately',
      'Names the cache-aside read-write race that writes back stale data',
      'Names partial-failure drift in write-through',
      'TTL as backstop; delete on write rather than update',
      'Staleness tolerance decided per data type',
    ],
    followUps: ['How would you cache a value that is expensive to compute and read thousands of times a second?', 'What would you never cache?'],
  },
  {
    id: 'backend-013',
    round: 'backend',
    category: 'Caching & performance',
    question: 'A popular cache key expires and the database falls over. What happened, and how do you prevent it?',
    answer: [
      'A cache stampede, or thundering herd: thousands of requests miss at the same instant and every one of them runs the same expensive query, so the database sees the full uncached traffic at once.',
      'Three defences, usually combined. Single-flight: the first request takes a short lock in Redis with SET NX and a TTL and recomputes, while the others wait briefly or serve the stale value. Stale-while-revalidate: keep the old value past its soft expiry and refresh it in the background, so readers never block. Jittered TTLs: add randomness to expiry times so keys filled together do not all expire together.',
      'For a handful of known hot keys, refresh them on a schedule before they expire, so they are never missing. And protect the database regardless with a connection pool limit, so a stampede queues instead of exhausting connections.',
    ],
    keyPoints: [
      'Names stampede: simultaneous misses all recompute',
      'Single-flight lock with SET NX and TTL',
      'Serve stale while refreshing in the background',
      'Jitter TTLs to avoid synchronised expiry',
      'Pool limits protect the database as a last line',
    ],
    followUps: ['What happens if the process holding the recompute lock crashes?', 'How do you choose the jitter range?'],
  },
  {
    id: 'backend-014',
    round: 'backend',
    category: 'Caching & performance',
    question: 'Which HTTP caching headers would you set on a product-detail API response and on a user\'s account endpoint?',
    answer: [
      'Product detail is the same for everyone and changes rarely, so it can be shared: Cache-Control: public, max-age=60, stale-while-revalidate=300 lets a CDN serve it and refresh in the background. Add an ETag so a revalidation that finds nothing changed returns 304 with no body, and Vary on anything the response depends on, such as Accept-Language, or the CDN will serve one language to everyone.',
      'The account endpoint is per-user, so it must never be stored by a shared cache: Cache-Control: private, no-cache with an ETag lets the browser keep a copy but check it every time, which still saves bandwidth through 304s. For truly sensitive data, a token or payment details, use no-store.',
      'The classic bug is a personalised response marked public behind a CDN, which then serves one user\'s data to another. I default endpoints to private and opt shared ones in explicitly.',
    ],
    keyPoints: [
      'public with max-age and stale-while-revalidate for shared data',
      'ETag and 304 to make revalidation cheap',
      'Vary on headers that change the response',
      'private and no-cache for per-user data; no-store for secrets',
      'Defaults to private to avoid leaking data through a CDN',
    ],
    followUps: ['How do you purge a CDN cache after a product update?', 'What does no-cache actually mean, compared with no-store?'],
  },
  {
    id: 'backend-015',
    round: 'backend',
    category: 'Caching & performance',
    question: 'One Redis key gets so many reads that its shard is saturated while the others are idle. What do you do?',
    answer: [
      'Confirm it first: Redis can report hot keys, and the symptom is one shard\'s CPU at its limit while the cluster average looks healthy. Sharding cannot help, because one key always lives on one shard.',
      'The cheapest fix is an in-process cache in front of Redis for that key: a few seconds of local caching in each application instance turns thousands of Redis reads per second into one per instance per few seconds. If the value is read-mostly but must be fresher, replicate it: write it under several suffixed keys, key:1 to key:8, which hash to different slots and so spread across shards, and have readers pick one at random.',
      'For a hot write key, such as a global counter, split it the same way and sum the parts on read, or batch increments in memory and flush them periodically. Then ask why a single key carries that much traffic, because it is often a design smell like a global leaderboard read on every page.',
    ],
    keyPoints: [
      'Recognises one key maps to one shard, so sharding cannot help',
      'Short-TTL local cache in each instance',
      'Replicate under suffixed keys and read one at random',
      'Split hot counters and sum on read, or batch writes',
      'Questions the design that created the hot key',
    ],
    followUps: ['How stale does the local cache make the value, worst case?', 'How would you detect a hot key before it causes an outage?'],
  },

  // Async & messaging (4)
  {
    id: 'backend-016',
    round: 'backend',
    category: 'Async & messaging',
    question: 'Sign-up sends a welcome email and generates a PDF, and the request now takes eight seconds. How do you restructure it?',
    answer: [
      'Split what the user must wait for from what they do not. Creating the account is synchronous and returns as soon as it commits; the email and the PDF are side effects that can happen seconds later, so they become jobs on a queue processed by separate workers.',
      'The request handler commits the user and enqueues two jobs, then returns 201. Workers pull jobs, do the work and acknowledge them. Each job carries only ids, not the whole user, so it reads current data when it runs. If the user needs the PDF, the UI shows it as pending and polls or receives a push when the job finishes.',
      'Name what you have taken on: jobs can fail, so you need retries with backoff and a dead-letter queue; jobs can run twice, so they must be idempotent; and there is now a gap between committing the user and enqueuing the job, which the outbox pattern closes. Monitor queue depth and job age, because a stuck worker is invisible otherwise.',
    ],
    keyPoints: [
      'Separates the user-blocking path from side effects',
      'Jobs carry ids and read current data when they run',
      'UI handles the pending state for async results',
      'Retries, dead letters and idempotent jobs',
      'Names the commit-then-enqueue gap and monitoring of queue age',
    ],
    followUps: ['Which queue would you pick for this, and why?', 'How do you keep a slow PDF job from delaying welcome emails?'],
  },
  {
    id: 'backend-017',
    round: 'backend',
    category: 'Async & messaging',
    question: 'What is the transactional outbox pattern, and what bug does it fix?',
    answer: [
      'The bug is the dual write: a service commits an order to Postgres and then publishes an OrderPlaced event to a broker. If the process crashes between the two, the order exists and nobody downstream ever hears about it; publish first instead and you can announce an order that then fails to commit.',
      'The outbox fixes it by making both one write. In the same transaction as the order, insert the event into an outbox table. Either both commit or neither does. A separate relay process reads unsent outbox rows in order, publishes them to the broker and marks them sent, or Postgres change data capture streams the table out.',
      'The relay can crash after publishing and before marking a row sent, so it will sometimes publish twice. The outbox gives you at-least-once delivery, never exactly-once, which means consumers must deduplicate, usually by the event id.',
    ],
    keyPoints: [
      'Names the dual-write failure in both orders',
      'Event row written in the same transaction as the state change',
      'Relay or change data capture publishes from the table',
      'Delivers at-least-once, so consumers deduplicate by event id',
    ],
    followUps: ['How do you keep the outbox table from growing forever?', 'How do you preserve ordering per entity?'],
  },
  {
    id: 'backend-018',
    round: 'backend',
    category: 'Async & messaging',
    question: 'How do you handle a queue consumer that fails on some messages?',
    answer: [
      'Separate transient from permanent failures. A timeout or a 503 from a dependency is transient: retry with exponential backoff and jitter, a limited number of times, so you do not hammer a struggling service. A validation error or a missing record is permanent: retrying will never succeed.',
      'After the retry limit, or immediately for permanent errors, move the message to a dead-letter queue with the error attached, and alert when that queue grows. A poison message, one that crashes the consumer every time, is the dangerous case: without a retry limit it blocks the queue forever, or in an ordered stream it blocks every message behind it.',
      'Dead-lettered messages need a way back: a small tool to inspect them, fix the cause and replay them. That only works because the consumer is idempotent, so a replayed message that partly succeeded the first time does no harm.',
    ],
    keyPoints: [
      'Classifies transient versus permanent failures',
      'Bounded retries with backoff and jitter',
      'Dead-letter queue with error context and alerting',
      'Explains poison messages and head-of-line blocking',
      'Replay tooling that relies on idempotent consumers',
    ],
    followUps: ['How do you retry with backoff when the broker has no delayed delivery?', 'What would you put in an alert for the dead-letter queue?'],
  },
  {
    id: 'backend-019',
    round: 'backend',
    category: 'Async & messaging',
    question: 'Your broker guarantees at-least-once delivery. How do you make a consumer that charges a card safe?',
    answer: [
      'Assume every message arrives twice, because eventually one will: a consumer that crashes after doing the work and before acknowledging gets the message redelivered. Exactly-once delivery does not exist end to end, so the effect must be idempotent instead.',
      'Give every message a stable id from the producer. The consumer records processed ids in a table with a unique constraint, in the same transaction as its own state change; a duplicate hits the constraint and is acknowledged without redoing the work. When the effect is external, pass a derived idempotency key to the payment provider so the provider deduplicates too.',
      'Where possible, make the operation naturally idempotent instead: set status to paid rather than add to a balance. Ordering matters separately: if messages for one entity can be reordered, include a version number and ignore anything older than the stored version.',
    ],
    keyPoints: [
      'Explains why redelivery happens',
      'Processed-id table with a unique constraint, written transactionally',
      'Idempotency key passed to external providers',
      'Prefers naturally idempotent operations',
      'Version numbers to reject out-of-order messages',
    ],
    followUps: ['How long do you keep processed ids?', 'What does Kafka\'s exactly-once mode actually guarantee?'],
  },

  // Auth & security (4)
  {
    id: 'backend-020',
    round: 'backend',
    category: 'Auth & security',
    question: 'Server-side sessions or JWTs for a web app\'s login? Defend your choice.',
    answer: [
      'For a first-party web app I choose server-side sessions: a random session id in an HttpOnly, Secure, SameSite cookie, with session data in Redis or Postgres. Logout and "sign out everywhere" are a delete, the cookie is unreadable to JavaScript, so XSS cannot steal it, and the server can change what a session means at any time.',
      'JWTs win when many services must verify identity without calling a central store, or for machine-to-machine calls. Their weakness is revocation: a signed token stays valid until it expires, so you keep access tokens short-lived, around five to fifteen minutes, add a refresh token that is stored and revocable, and accept that a stolen access token works until it expires.',
      'The mistake I push back on is a long-lived JWT in localStorage: readable by any injected script and impossible to revoke. If a SPA must use tokens, keep them in memory and refresh through an HttpOnly cookie, or put a BFF in front that holds them server-side.',
    ],
    keyPoints: [
      'Sessions: HttpOnly, Secure, SameSite cookie with server-side state',
      'Sessions make revocation and logout trivial',
      'JWTs suit distributed verification and service calls',
      'Short-lived access tokens plus revocable refresh tokens',
      'Rejects long-lived tokens in localStorage',
    ],
    followUps: ['How do you protect cookie-based sessions against CSRF?', 'How would you rotate the JWT signing key?'],
  },
  {
    id: 'backend-021',
    round: 'backend',
    category: 'Auth & security',
    question: 'Walk me through the OAuth 2 authorization code flow with PKCE for a single-page app signing in with an identity provider.',
    answer: [
      'The app generates a random code verifier, hashes it into a code challenge, and redirects the user to the provider\'s authorize endpoint with the client id, redirect URI, scopes, a random state value and the challenge. The user signs in at the provider, never on our page.',
      'The provider redirects back with a short-lived authorization code. The app checks that state matches what it sent, which blocks CSRF on the callback, then exchanges the code plus the original verifier at the token endpoint. Because only the app knows the verifier, a stolen code is useless to anyone else, which is the whole point of PKCE for a public client with no secret.',
      'With OpenID Connect the response includes an ID token, whose signature, issuer, audience and nonce the app validates to learn who the user is; the access token is for calling APIs. My preference for a SPA is to do the exchange in a small backend, a BFF, so tokens never reach the browser and the SPA holds only a session cookie.',
    ],
    keyPoints: [
      'Code verifier and challenge generated per login',
      'state checked on the callback against CSRF',
      'Code exchanged with the verifier, so an intercepted code is useless',
      'ID token validated: signature, issuer, audience, nonce',
      'Prefers a BFF so tokens stay server-side',
    ],
    followUps: ['Why was the implicit flow deprecated?', 'What is the difference between the ID token and the access token?'],
  },
  {
    id: 'backend-022',
    round: 'backend',
    category: 'Auth & security',
    question: 'Review a Node service that has a "fetch a preview of this URL" feature and a search endpoint that builds SQL from a sort parameter. What are you worried about?',
    answer: [
      'The URL preview is an SSRF risk: the server fetches whatever the user supplies, so an attacker can point it at the cloud metadata endpoint, internal admin services or localhost and read the response through our app. Validating the hostname is not enough, because DNS can resolve to a private address or redirects can move the request after the check.',
      'The fix is to resolve the hostname yourself, reject private, loopback and link-local ranges, connect to the checked IP, disable or re-validate redirects, cap the response size and time, and ideally run the fetch from an isolated egress proxy with no route to internal networks.',
      'The sort parameter is SQL injection if it is concatenated into ORDER BY, and placeholders cannot fix it because identifiers cannot be bound as parameters. Map it through an allowlist of known column names and directions, and reject anything else. The general rule is that user input never becomes SQL syntax, only parameter values.',
    ],
    keyPoints: [
      'Identifies SSRF and the metadata endpoint risk',
      'Explains why hostname validation alone fails: DNS and redirects',
      'Resolve, block private ranges, pin the IP, limit size and time',
      'ORDER BY injection cannot be fixed with placeholders',
      'Allowlist mapping for identifiers',
    ],
    followUps: ['What is DNS rebinding?', 'Which other inputs commonly end up as SQL syntax?'],
  },
  {
    id: 'backend-023',
    round: 'backend',
    category: 'Auth & security',
    question: 'How should a backend service handle secrets such as database passwords and API keys?',
    answer: [
      'Secrets never live in the repository, the Docker image or client bundles. They come from a secrets manager such as Vault or a cloud secret store, injected at runtime as environment variables or mounted files, with access granted per service identity, so each service can read only its own secrets.',
      'Plan for rotation from day one, because the question is when a secret leaks, not whether. Prefer short-lived credentials the platform issues, such as dynamic database users or workload identity for cloud APIs, over static keys. Where a key is static, support two active versions at once so you can rotate without downtime.',
      'Keep secrets out of logs and error reports by redacting known fields in the logger, scan commits and CI for leaked keys, and audit who read what. If a key does leak, revoke first and investigate second.',
    ],
    keyPoints: [
      'Secrets manager with per-service access',
      'Injected at runtime, never baked into images or repos',
      'Short-lived or dynamic credentials preferred',
      'Rotation with two valid versions for zero downtime',
      'Redaction in logs, secret scanning, revoke-first response',
    ],
    followUps: ['Are environment variables a safe place for secrets?', 'How would you rotate a database password used by thirty pods?'],
  },

  // Node & Go runtime (5)
  {
    id: 'backend-024',
    round: 'backend',
    category: 'Node & Go runtime',
    question: 'A Node API\'s latency spikes for every endpoint when one report endpoint is called. What do you suspect, and how do you confirm it?',
    answer: [
      'Node runs JavaScript on one thread, so a CPU-heavy request blocks the event loop and every other request on that process waits behind it, even trivial ones. The report endpoint probably does synchronous work: a big JSON.parse or JSON.stringify, a sort over hundreds of thousands of rows, a synchronous crypto or compression call, or a regex with catastrophic backtracking.',
      'Confirm it with event loop delay metrics, monitorEventLoopDelay from perf_hooks, which shows the loop stalling exactly when the report runs, then take a CPU profile with --cpu-prof or clinic flame to find the function.',
      'The fix depends on the work. Stream and paginate instead of loading everything; move pure CPU work into a worker thread or a separate job service; use the async version of crypto and zlib calls; or chunk the work and yield with setImmediate. And keep monitoring loop delay, because the next blocking call will arrive with some innocent-looking change.',
    ],
    keyPoints: [
      'Single-threaded event loop: one CPU-bound request delays all',
      'Names common blockers: JSON on big payloads, sorting, sync crypto, regex',
      'Event loop delay metric plus CPU profile to confirm',
      'Streaming, worker threads, async APIs or chunking as fixes',
    ],
    followUps: ['How does the libuv thread pool relate to this?', 'When would you move the work out of Node entirely?'],
  },
  {
    id: 'backend-025',
    round: 'backend',
    category: 'Node & Go runtime',
    question: 'Users can export their data as a CSV of up to two million rows. How do you build that in Node without running out of memory?',
    answer: [
      'Never build the file in memory. Stream it: a database cursor reads rows in batches, a transform turns each row into a CSV line, and the result is piped to the HTTP response, so memory stays flat whatever the row count.',
      'The detail that matters is backpressure. If the client downloads slowly and you keep writing, Node buffers the excess in memory and you are back to running out of it. stream.pipeline handles it: when the response\'s buffer is full, write returns false, the pipeline pauses the upstream until drain, and it also destroys every stage if any one errors or the client disconnects.',
      'For very large exports, or ones that take minutes, make it a background job instead: stream to object storage, then email a signed link. That survives a dropped connection and keeps long-running work off the API servers.',
    ],
    keyPoints: [
      'Streams end to end with a database cursor',
      'Explains backpressure: write returning false and drain',
      'stream.pipeline for backpressure, errors and cleanup',
      'Handles client disconnect without leaking the cursor',
      'Background job to object storage for long exports',
    ],
    followUps: ['What happens to the database cursor if the client disconnects halfway?', 'How would you quote CSV values safely?'],
  },
  {
    id: 'backend-026',
    round: 'backend',
    category: 'Node & Go runtime',
    question: 'Review this Go worker pool. What is wrong, and how would you fix it?',
    code: `func process(jobs []Job) []Result {
	results := make(chan Result)
	for _, j := range jobs {
		go func() {
			results <- handle(j)
		}()
	}

	var out []Result
	for r := range results {
		out = append(out, r)
	}
	return out
}`,
    answer: [
      'The range over results never ends, because nothing closes the channel, so the function blocks forever after the last result: a goroutine leak and a hung caller. Closing it needs a sync.WaitGroup: Add before each goroutine, Done when it sends, and a separate goroutine that waits and then closes the channel.',
      'It also starts one goroutine per job with no limit. Goroutines are cheap, but handle probably calls a database or an API, so ten thousand jobs means ten thousand concurrent calls. A real pool starts a fixed number of workers reading from a jobs channel, or uses a semaphore channel or errgroup with SetLimit.',
      'Two smaller points: before Go 1.22 the closure captured the loop variable j, so every goroutine could see the last job; it is fixed in modern Go, but worth saying. And there is no error path or cancellation: I would pass a context and use errgroup so the first error cancels the rest.',
    ],
    keyPoints: [
      'Unclosed channel: range blocks forever, goroutine leak',
      'WaitGroup plus a closer goroutine',
      'Unbounded concurrency; fixed workers or SetLimit',
      'Loop variable capture before Go 1.22',
      'errgroup with context for errors and cancellation',
    ],
    followUps: ['How would you keep the results in the same order as the jobs?', 'What would the Node equivalent of this bug be?'],
  },
  {
    id: 'backend-027',
    round: 'backend',
    category: 'Node & Go runtime',
    question: 'This Go handler keeps querying the database after the client has gone away. Why, and what is the fix?',
    code: `func (s *Server) report(w http.ResponseWriter, r *http.Request) {
	rows, err := s.db.Query("SELECT ... FROM events WHERE ...")
	if err != nil {
		http.Error(w, err.Error(), 500)
		return
	}
	defer rows.Close()
	// ... aggregate rows, call the pricing service, write JSON
}`,
    answer: [
      'Nothing ties the work to the request\'s lifetime. Go cancels r.Context() when the client disconnects or ServeHTTP returns, but not on the server\'s ReadTimeout or WriteTimeout, and db.Query without a context never looks at it, so the query and everything after it run to completion for nobody.',
      'Pass the request context down: s.db.QueryContext(r.Context(), ...), and give the call to the pricing service a request built with the same context. Cancellation then propagates through every layer that accepts a context, and the database driver actually cancels the running query. Add a deadline with context.WithTimeout for the downstream call, and always defer cancel.',
      'Make it a convention: every function that does I/O takes ctx context.Context as its first parameter, so cancellation and deadlines flow without anyone remembering. Also, the handler writes err.Error() to the client, which can leak SQL details; log it and return a generic message.',
    ],
    keyPoints: [
      'r.Context() is cancelled on disconnect, not by server timeouts; deadlines come from WithTimeout or TimeoutHandler',
      'QueryContext and context-aware outbound requests',
      'WithTimeout with a deferred cancel for downstream calls',
      'ctx as the first parameter on all I/O functions',
      'Spots the leaked error detail',
    ],
    followUps: ['What is the Node equivalent of context cancellation?', 'Should you store values in a context?'],
  },
  {
    id: 'backend-028',
    round: 'backend',
    category: 'Node & Go runtime',
    question: 'Compare error handling in Go and in Node. What does each make easy, and what does each make easy to get wrong?',
    code: `func loadUser(ctx context.Context, id string) (*User, error) {
	u, err := repo.Find(ctx, id)
	if errors.Is(err, sql.ErrNoRows) {
		return nil, ErrNotFound
	}
	if err != nil {
		return nil, fmt.Errorf("load user %s: %w", id, err)
	}
	return u, nil
}`,
    answer: [
      'Go returns errors as values, so every failure point is visible at the call site and you decide there what to do. Wrapping with %w adds context while keeping the cause, and errors.Is or errors.As checks for specific errors through the chain. What it gets wrong is verbosity, and silently ignoring an error with an underscore is easy and compiles fine.',
      'Node throws and rejects, so errors propagate on their own and one try/catch can cover a whole flow. The traps are async: a promise nobody awaits fails silently or crashes the process as an unhandled rejection, an error thrown inside a callback escapes its try/catch, and catch receives unknown, so you must narrow it before reading anything.',
      'In both I want the same three things: add context once per layer, map errors to domain types at the boundary, such as not-found becoming a 404, and log each error exactly once, at the top, rather than at every layer it passes through.',
    ],
    keyPoints: [
      'Go: explicit error values, wrapping with %w, errors.Is and errors.As',
      'Go risk: ignored errors and verbosity',
      'Node risk: unawaited promises, unhandled rejections, unknown in catch',
      'Map to domain errors at the boundary',
      'Log once at the top, not at every layer',
    ],
    followUps: ['When is panic acceptable in Go?', 'How would you add a Result type in TypeScript, and is it worth it?'],
  },

  // Full-stack design (4)
  {
    id: 'backend-029',
    round: 'backend',
    category: 'Full-stack design',
    question: 'Your team proposes a backend-for-frontend in front of the microservices. What should it own, and what must it not own?',
    answer: [
      'A BFF owns what is specific to one client: aggregating several service calls into the shape a screen needs, so the browser makes one request instead of six; translating backend models into view models; holding the session and the OAuth tokens so they never reach the browser; and client-specific caching and rate limiting.',
      'It must not own business rules. The moment the BFF decides whether an order can be cancelled, the mobile BFF and the partner API will each implement it slightly differently. Domain logic and validation stay in the services, and the BFF composes and adapts.',
      'Ownership matters as much as code: the BFF belongs to the frontend team, deploys with the frontend and can change as fast as the UI. If it becomes a shared layer every team has to queue changes through, it has turned into an API gateway with a bottleneck, and I would rather go back to one BFF per client.',
    ],
    keyPoints: [
      'Owns aggregation, view-model shaping, session and tokens',
      'Client-specific caching and rate limits',
      'No business rules or validation in the BFF',
      'Owned and deployed by the frontend team',
      'One BFF per client rather than a shared bottleneck',
    ],
    followUps: ['How do you stop a BFF call that fans out to six services from being slow?', 'BFF or GraphQL federation?'],
  },
  {
    id: 'backend-030',
    round: 'backend',
    category: 'Full-stack design',
    question: 'How do you keep a TypeScript frontend and a Node backend in agreement about the API contract?',
    answer: [
      'Pick one source of truth and generate the rest; types written twice drift. There are three common shapes. OpenAPI written or generated from the server, with a generated typed client, works across languages and suits public APIs. tRPC shares the router type directly, with no schema step, which is the fastest option when both sides are TypeScript in one repository. A shared schema package, zod for example, gives both static types and runtime validation.',
      'Static types alone are not enough, because the network is a trust boundary: the server must validate every request body at runtime, and the client should validate responses from anything it does not deploy with. A schema library gives you both from one definition.',
      'Then guard compatibility in CI: diff the OpenAPI spec against the deployed version and fail on breaking changes, since old mobile apps and open browser tabs keep calling the previous contract after you deploy. My default is a zod or OpenAPI schema as the source, with codegen for the client.',
    ],
    keyPoints: [
      'Single source of truth with generated types',
      'Compares OpenAPI codegen, tRPC and shared schemas',
      'Runtime validation at the trust boundary, not just types',
      'Breaking-change check in CI against the deployed contract',
      'Accounts for old clients still running',
    ],
    followUps: ['When does tRPC stop being a good choice?', 'How do you roll out a breaking change when web and server deploy separately?'],
  },
  {
    id: 'backend-031',
    round: 'backend',
    category: 'Full-stack design',
    question: 'A server-rendered product page is slow even though each API call is fast. How do you find and fix the problem?',
    answer: [
      'Fast calls plus a slow page usually means a waterfall: the page fetches the product, then a nested component fetches reviews using the product id, then another fetches recommendations, each starting only after the previous one finished. Server timing headers or a trace per request show the calls laid end to end.',
      'Fix the shape first. Start independent fetches in parallel with Promise.all at the route level; hoist data needs out of nested components so the router knows them up front; and stream the HTML so the shell and the main content render while slower sections, such as reviews, arrive later behind a suspense boundary.',
      'Then cache by volatility: product data can be cached for a minute at the edge, the price and stock shown live, and per-user data kept out of the cached HTML entirely and loaded client-side. Also check how close the render server is to the APIs, because the same waterfall costs ten times more across regions.',
    ],
    keyPoints: [
      'Identifies a sequential fetch waterfall',
      'Traces or server timing to see it',
      'Parallel fetches and hoisting data needs to the route',
      'Streaming HTML with suspense boundaries for slow sections',
      'Caching split by volatility and per-user data kept out of shared HTML',
    ],
    followUps: ['What would you cache at the CDN for this page?', 'How do you measure the improvement for real users?'],
  },
  {
    id: 'backend-032',
    round: 'backend',
    category: 'Full-stack design',
    question: 'Walk me through a "save draft" feature end to end, including the user having the same draft open in two tabs.',
    answer: [
      'Client: the editor keeps local state, autosaves debounced a second or two after typing stops, and shows a clear status: saving, saved, or failed with a retry. Unsaved edits also go to local storage, so a crash or closed tab loses nothing.',
      'API and data: PUT /drafts/:id with the full content and the version the client last saw. The row carries a version number; the update is WHERE id = $1 AND version = $2, which increments the version. Zero rows updated means someone else saved first, so the server returns 409 with the current version.',
      'Two tabs: the second tab\'s save gets the 409, and the UI must not silently overwrite or discard. For plain text, show the other version and let the user choose, or merge when the edits do not overlap; for real-time co-editing you would need CRDTs or operational transforms, a much bigger build that I would scope out unless asked. [A feature you shipped with a similar conflict model] is the story I would tell here.',
    ],
    keyPoints: [
      'Debounced autosave with visible save status',
      'Local backup against crashes',
      'Optimistic concurrency with a version column',
      '409 on conflict, never a silent overwrite',
      'Scopes real-time co-editing out explicitly',
    ],
    followUps: ['How would you sync the two tabs without a server round trip?', 'What changes if drafts can be edited offline for days?'],
  },

  // Backend live coding (6)
  {
    id: 'backend-033',
    round: 'backend',
    category: 'Backend live coding',
    scratch: true,
    question: 'Implement a per-key token-bucket rate limiter: each key gets `capacity` tokens, refilled at `refillPerSec`. take(key) spends a token and returns true, or returns false when the bucket is empty. Talk me through it as you go.',
    code: `// \`now\` is injectable so the checks below run without waiting on a real clock.
class RateLimiter {
  constructor(private capacity: number, private refillPerSec: number, private now: () => number = Date.now) {}

  take(key: string): boolean {
    // TODO: keep a { tokens, last } bucket per key
    // TODO: refill by elapsed time since \`last\`, capped at capacity, then spend one token
    return true;
  }
}

let t = 0;
const limiter = new RateLimiter(2, 1, () => t);
console.log(limiter.take('a'), limiter.take('a'), limiter.take('a')); // expect: true true false
t = 1000;
console.log(limiter.take('a')); // expect: true (one token back after a second)
console.log(limiter.take('b')); // expect: true (keys have separate buckets)`,
    answer: [
      'State the model before typing: a bucket per key holding a fractional token count and the time it was last touched. There is no timer; refill is computed lazily on each call from the elapsed time, which is what keeps it O(1) per request and free when idle.',
      'On take: look up or create the bucket full, add elapsed seconds times refillPerSec, cap at capacity, set last to now. If tokens is at least one, subtract one and return true; otherwise return false. Mention the cap explicitly, because without it an idle key banks unlimited burst.',
      'Then name what changes in production: the Map grows with every key ever seen, so evict idle buckets, and across several server instances the state has to live in Redis, updated atomically in a Lua script or with a single INCR-style operation, or each instance enforces its own limit.',
    ],
    keyPoints: [
      'Lazy refill from elapsed time, no background timer',
      'Caps tokens at capacity so idle keys cannot bank unlimited burst',
      'O(1) time per call and O(keys) memory, with eviction for idle keys',
      'Moves state to Redis with an atomic update once there is more than one instance',
    ],
    followUps: ['How would you return a Retry-After header from this?', 'Token bucket or sliding window: when would you pick each?'],
  },
  {
    id: 'backend-034',
    round: 'backend',
    category: 'Backend live coding',
    scratch: true,
    question: 'Implement an LRU cache with a per-entry TTL: get and set in O(1), evicting the least recently used entry past capacity, and treating expired entries as missing.',
    code: `// \`now\` is injectable so the checks below run without a real clock.
class LRUCache<K, V> {
  constructor(private capacity: number, private ttlMs: number, private now: () => number = Date.now) {}

  get(key: K): V | undefined {
    // TODO: return undefined for a missing or expired entry, and drop the expired one
    // TODO: on a hit, mark the key as most recently used
    return undefined;
  }

  set(key: K, value: V): void {
    // TODO: store the value with an expiry; past capacity, evict the least recently used key
  }
}

let t = 0;
const cache = new LRUCache<string, number>(2, 1000, () => t);
cache.set('a', 1);
cache.set('b', 2);
cache.get('a');
cache.set('c', 3);
console.log(cache.get('a'), cache.get('b'), cache.get('c')); // expect: 1 undefined 3
t = 1500;
console.log(cache.get('a')); // expect: undefined (expired)`,
    answer: [
      'In JavaScript a Map already remembers insertion order, so it can be the whole data structure: delete and re-insert a key to mark it most recently used, and the first key from map.keys() is always the least recently used. That gives O(1) get and set without writing a linked list; I would mention that in other languages you pair a hash map with a doubly linked list for the same effect.',
      'Each entry stores the value and expiresAt. get checks the entry, and if now is past expiresAt it deletes it and returns undefined; otherwise it re-inserts and returns the value. set deletes any existing entry, inserts the new one, and while size exceeds capacity deletes the first key.',
      'Talk through the edge cases: setting an existing key must refresh both its position and its TTL; expired entries are only removed when touched, which is fine for correctness but means a full cache can be holding dead entries, so mention a periodic sweep if memory matters.',
    ],
    keyPoints: [
      'Uses Map insertion order for recency: O(1) get and set',
      'Names the hash map plus doubly linked list equivalent',
      'Lazy expiry on read, with an optional sweep',
      'Updating an existing key refreshes position and TTL',
      'O(capacity) memory',
    ],
    followUps: ['How would you make this safe across several Node processes?', 'What would you change for an LFU policy?'],
  },
  {
    id: 'backend-035',
    round: 'backend',
    category: 'Backend live coding',
    scratch: true,
    question: 'Write retry(fn, options) that retries a failing async call with exponential backoff and full jitter, and gives up after a number of retries.',
    code: `// \`sleep\` and \`random\` are injectable so the checks run instantly and deterministically.
async function retry<T>(
  fn: () => Promise<T>,
  { retries = 3, baseMs = 100, sleep = (ms: number) => new Promise<void>((r) => setTimeout(r, ms)), random = Math.random } = {},
): Promise<T> {
  // TODO: on failure, wait random() * baseMs * 2 ** attempt, then call fn again
  // TODO: after \`retries\` retries, rethrow the last error
  return fn();
}

let calls = 0;
const flaky = async () => {
  calls++;
  if (calls < 3) throw new Error('boom ' + calls);
  return 'ok';
};
const waits: number[] = [];
retry(flaky, { sleep: async (ms) => { waits.push(ms); }, random: () => 0.5 })
  .then((v) => console.log(v, calls, waits)) // expect: ok 3 [50,100]
  .catch((e) => console.log('failed:', e.message));`,
    answer: [
      'A loop is clearer than recursion here: for attempt from 0 to retries, try to return await fn(); in the catch, if this was the last attempt rethrow, otherwise await sleep for the backoff and loop. Keep the last error so the caller sees the real failure, not a generic "retries exhausted".',
      'The delay is random() times baseMs times 2 to the attempt, which is full jitter. Say why the jitter matters: without it, every client that failed at the same moment retries at the same moment and the recovering service is hit by synchronised waves. A cap on the maximum delay keeps late attempts reasonable.',
      'Then say what a production version adds: only retry errors that are worth retrying, such as timeouts, 429 and 503, never a 400; respect a Retry-After header when present; and accept an AbortSignal so a cancelled request stops retrying. Total time is bounded by the sum of the delays, roughly O(baseMs times 2 to the retries) in the worst case.',
    ],
    keyPoints: [
      'Loop with await and rethrow of the last error',
      'Full jitter and why synchronised retries hurt',
      'Delay cap; O(retries) calls and exponential worst-case wait',
      'Retries only retryable errors; honours Retry-After',
      'AbortSignal for cancellation',
    ],
    followUps: ['How would you add a circuit breaker on top of this?', 'Why is retrying a non-idempotent POST dangerous?'],
  },
  {
    id: 'backend-036',
    round: 'backend',
    category: 'Backend live coding',
    scratch: true,
    question: 'Implement cursor pagination over this in-memory table, newest first, so that pages never skip or repeat rows even when timestamps tie.',
    code: `type Row = { id: number; createdAt: number; title: string };
// Newest first. Pairs of rows share a createdAt, which is why the cursor needs the id too.
const rows: Row[] = Array.from({ length: 7 }, (_, i) => ({ id: i + 1, createdAt: 1000 - Math.floor(i / 2) * 10, title: 'post ' + (i + 1) }));

function page(limit: number, cursor?: string): { items: Row[]; next?: string } {
  // TODO: order by createdAt desc, then id desc
  // TODO: decode the cursor into the last row's (createdAt, id) and keep only rows after it
  // TODO: take \`limit\` rows and return \`next\` only when more rows remain
  return { items: rows.slice(0, limit) };
}

const first = page(3);
console.log(first.items.map((r) => r.id), first.next !== undefined); // expect: [2,1,4] true
const second = page(3, first.next);
console.log(second.items.map((r) => r.id)); // expect: [3,6,5]
const third = page(3, second.next);
console.log(third.items.map((r) => r.id), third.next); // expect: [7] undefined`,
    answer: [
      'Start with the ordering, because a cursor is only correct over a total order: createdAt descending alone ties, so add id descending as the tiebreaker. The cursor encodes the last row\'s createdAt and id, base64-encoded JSON, so clients treat it as opaque and you can change its contents later.',
      'The filter mirrors a SQL row comparison: keep a row if its createdAt is less than the cursor\'s, or equal with a smaller id. Then take limit plus one rows; if you got the extra one, there is a next page, and its cursor comes from the last row you actually return. That avoids a separate count query.',
      'Say the complexity honestly: here it is O(n log n) for the sort and O(n) for the scan on each call, but in Postgres the same WHERE (created_at, id) < ($1, $2) with an index on those columns is O(log n + limit) per page, which is the reason to page this way at all.',
    ],
    keyPoints: [
      'Total order with id as tiebreaker',
      'Opaque encoded cursor from the last returned row',
      'Fetch limit plus one to detect the next page without a count',
      'O(n log n) in memory; O(log n + limit) with a database index',
    ],
    followUps: ['How would you support paging backwards?', 'What happens if the row the cursor points at is deleted?'],
  },
  {
    id: 'backend-037',
    round: 'backend',
    category: 'Backend live coding',
    scratch: true,
    question: 'Build a batched writer that collects items and flushes them as one batch when it reaches a maximum size or when a maximum wait has passed since the first pending item, whichever comes first.',
    code: `// \`schedule\` is injectable (it returns a cancel function) so the checks below control time by hand.
class BatchWriter<T> {
  constructor(
    private flush: (batch: T[]) => void,
    private maxSize: number,
    private maxWaitMs: number,
    private schedule: (fn: () => void, ms: number) => () => void = (fn, ms) => {
      const id = setTimeout(fn, ms);
      return () => clearTimeout(id);
    },
  ) {}

  write(item: T): void {
    // TODO: buffer the item; start the wait timer when the first item arrives
    // TODO: at maxSize, flush immediately and cancel the pending timer
  }
}

let fire: (() => void) | undefined;
const flushed: number[][] = [];
const writer = new BatchWriter<number>((b) => { flushed.push(b); }, 3, 50, (fn) => {
  fire = fn;
  return () => { fire = undefined; };
});
[1, 2, 3, 4].forEach((n) => writer.write(n));
console.log(flushed); // expect: [[1,2,3]] (size flush)
fire?.();
console.log(flushed); // expect: [[1,2,3],[4]] (timer flush)`,
    answer: [
      'State: a buffer array and an optional cancel function for the pending timer. write pushes the item; if it is the first item in an empty buffer, schedule a flush after maxWaitMs; if the buffer has reached maxSize, flush now.',
      'flush is where the bugs are, so say them out loud: cancel the pending timer, swap the buffer for a new empty array before calling the flush callback, so items written during the flush go to the next batch, and hand the callback the old array. Forgetting the cancel gives a second, empty or premature flush when the stale timer fires.',
      'Production concerns: an async flush callback needs a way to report failure, and you must decide whether to retry the batch or drop it; on shutdown, call a final flush so buffered items are not lost; and cap the buffer so a stuck downstream cannot grow memory without bound. Each write is O(1), and memory is O(maxSize).',
    ],
    keyPoints: [
      'Timer starts on the first item, not on every write',
      'Cancels the pending timer on a size flush',
      'Swaps the buffer before invoking the callback',
      'O(1) per write, O(maxSize) memory',
      'Flush on shutdown and handles flush failures',
    ],
    followUps: ['How would you make flush async with backpressure?', 'Where have you seen this pattern in real systems?'],
  },
  {
    id: 'backend-038',
    round: 'backend',
    category: 'Backend live coding',
    scratch: true,
    question: 'Implement an in-memory idempotency store for a payment endpoint: the same key and request runs the charge at most once, including when two identical requests arrive at the same time.',
    code: `type Reply = { status: number; body: string };

// \`handle\` must run \`charge\` at most once per key.
class IdempotencyStore {
  async handle(key: string, requestHash: string, charge: () => Promise<Reply>): Promise<Reply> {
    // TODO: same key and same hash, already finished -> replay the stored reply without charging
    // TODO: same key while the first call is still running -> share its promise
    // TODO: same key with a different hash -> reply 422
    return charge();
  }
}

let charges = 0;
const charge = async (): Promise<Reply> => {
  charges++;
  return { status: 201, body: 'charged' };
};
const store = new IdempotencyStore();
(async () => {
  const [a, b] = await Promise.all([store.handle('k1', 'h1', charge), store.handle('k1', 'h1', charge)]);
  const c = await store.handle('k1', 'h1', charge);
  const d = await store.handle('k1', 'h2', charge);
  console.log(a.status, b.status, c.status, d.status, charges); // expect: 201 201 201 422 1
})();`,
    answer: [
      'The key insight is to store the promise, not the result. A Map from key to an entry holding the request hash and the promise of the reply: the first call creates the promise and stores it synchronously, before any await, so a concurrent second call finds it and awaits the same promise instead of charging again. Finished and in-flight requests are then the same case.',
      'On each call: if there is no entry, create one and return its promise. If there is one with a different hash, return 422, because reusing a key for a different request is a client bug. If the stored promise rejects, delete the entry so the client can retry, unless the failure means the charge might have happened.',
      'Then translate to production: the Map becomes a database table with a unique key, the "store before await" becomes an insert that wins or loses on the constraint, and entries expire after a day. Each lookup is O(1); memory is O(keys) until expiry.',
    ],
    keyPoints: [
      'Stores the promise synchronously so concurrent calls share it',
      'Different request hash on the same key returns 422',
      'Failed attempts are cleared only when safe to retry',
      'O(1) lookup, O(keys) memory with expiry',
      'Maps to a unique constraint in a real database',
    ],
    followUps: ['What should happen if the charge times out rather than failing?', 'How would you hash the request body consistently?'],
  },
];
