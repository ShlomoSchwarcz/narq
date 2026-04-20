# NARQ

**NARQ = Not Really A Real Queue**

NARQ is a message queueing system inspired by services like Amazon SQS, but designed for teams that need deeper control, visibility, and operational flexibility.

It focuses on a practical gap common in traditional queue systems: once a message enters the queue, it is often difficult to inspect, edit, prioritize, reorder, search, or manage it in place. NARQ aims to solve that.

---

## Vision

Build a queue platform that combines:

* Reliable message delivery
  n- Familiar queue semantics
* Advanced scheduling and prioritization
* Full operational visibility
* Administrative control over queued and in-flight messages
* Simple self-hosted deployment

---

## Core Concepts

### Queues

The system supports multiple independent queues.

Each queue can maintain its own behavior, metrics, retention rules, retry limits, and ordering mode.

### Messages

Each message can contain:

* Payload/body
* Metadata
  n- Priority
* Group ID
* Visibility timeout state
* Retry counters
* Delay-until timestamp
* Created / updated timestamps

### Consumption Rules

* A message is delivered to one consumer at a time.
* While being processed, it becomes **in-flight**.
* If processing succeeds, it is deleted / acknowledged.
* If processing fails or times out, it returns to the queue.
* After exceeding retry limits, it moves to a Dead Letter Queue (DLQ).

---

## Ordering Modes

NARQ supports more than standard FIFO.

### 1. FIFO

First in, first out.

### 2. Group FIFO

Messages sharing the same `groupId` are processed sequentially.
The next message in the group is blocked until the current one completes.

Useful for:

* Per-customer sequencing
* Per-account operations
* Entity locking patterns

### 3. Priority Queue

Higher priority messages are consumed first.

### 4. Group Priority

Priority can be applied at the group level.
Example: VIP customer groups before standard groups.

---

## Scheduling & Delay Features

### Delayed Messages

Support enqueueing messages for:

* Delay by seconds/minutes
* Specific future timestamp

### Per-Group Rate Limiting

Define delays between messages of the same group.
Useful for:

* API rate limits
* Vendor throttling
* Controlled batch processing

---

## Admin & Operational Features

A major NARQ differentiator is manageability.

### Queue Visibility

Inspect:

* Ready messages
  n- In-flight messages
* Failed messages
* DLQ messages

### Message Management

Operators can:

* Search messages
* Filter messages
* Edit payloads
* Delete messages
* Requeue messages
* Change priority
* Inspect retry history

### Metrics Dashboard

Planned statistics include:

* Total messages received
* Total consumed
* Average processing time
* Failure rate
* Queue depth over time
* In-flight counts
* Per-queue trends

---

## API Design

Planned REST API capabilities:

* Create queue
  n- Delete queue
* Publish message
* Consume message
* Ack / delete message
* Extend visibility timeout
* Requeue message
* Search messages
* Queue statistics
* Health checks

Long polling support is part of the design.

---

## Technical Stack

### Backend

* Node.js 20+
* TypeScript
* Fastify

### Database

* PostgreSQL

Used for:

* Durable storage
* Row locking
* Transactional message claiming
* Triggers / NOTIFY for wake-up events

### Frontend / Admin Console

* React
* Material UI (MUI)

### Packaging

Goal: easy deployment via Docker.

Possible modes:

* Single container (DB + API + UI)
* Multi-container compose deployment
* Self-hosted friendly install

---

## Concurrency Model

To prevent double delivery:

* Transactional claiming of messages
* Database row locking (`FOR UPDATE` style semantics)
* Visibility timeout recovery
* Safe concurrent consumers

---

## Why NARQ?

Traditional queues are excellent transport systems, but often weak operational databases.

NARQ treats a queue as both:

1. A delivery mechanism
2. A controllable workflow state machine

That makes it useful for business processes where operators need to intervene.

Examples:

* Payment retries
* Order pipelines
* Human review workflows
* Customer-specific job processing
* Scheduled integrations
* Back-office operations queues

---

## Example Use Cases

### Payment Processing

Retry failed payments, prioritize urgent merchants, inspect stuck jobs.

### SaaS Background Jobs

Run tenant-isolated workloads with group ordering.

### External API Integrations

Throttle per vendor while keeping global throughput high.

### Operations Console

Support teams can inspect and fix stuck jobs without DB scripts.

---

## Future Ideas

* Webhooks
  n- Role-based access control
* Multi-node clustering
* HA leader election
* Metrics export (Prometheus)
* SDKs for Node / Python / Go
* WebSocket live dashboard
* Replay / audit trail
* Terraform deployment module

---

## Status

Concept and architecture actively explored.

NARQ is positioned as a smarter, more operable queue for teams that outgrow black-box messaging systems.
