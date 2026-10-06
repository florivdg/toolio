---
title: iTunes Price Watcher
description: Search and track iTunes media item prices
createdAt: 2025-05-23
tags: [iTunes]
draft: false
---

The iTunes Tool provides comprehensive integration with Apple's iTunes Store API, allowing you to search, lookup, store, and track iTunes media items including movies, TV shows, music, and other digital content.

## Overview

This tool consists of four main components:

- **Search API**: Find iTunes content by search terms
- **Add API**: Store iTunes items in your local database for tracking
- **List API**: Retrieve stored iTunes items with optional price history
- **Update API**: Update current prices for all stored items automatically

## Features

### 🔍 Search iTunes Store

- Search across all iTunes content types (movies, TV shows, music, apps, etc.)
- Filter by media type and entity type
- Support for different iTunes store regions (country codes)
- Configurable result limits

### 📚 Store & Track Items

- Save iTunes items to your local database
- Support for both individual tracks and collections
- Automatic price history tracking
- Rich metadata storage with additional data preservation

### 📊 Manage Your Collection

- List stored iTunes items with advanced filtering
- Search by artist name, title, genre, media type
- Optional price history inclusion
- Pagination support for large collections

### 🔄 Automated Price Updates

- Update all stored items' prices in a single request
- Für den Cronjob gedacht, abgesichert über `PRICE_UPDATE_CRON_SECRET`
- Detailed success/error reporting for each item
- Robust error handling for unavailable items

## API Endpoints

### Search iTunes Store

**Endpoint:** `GET /api/itunes/search`

Search for items in the iTunes Store using Apple's search API.

#### Query Parameters

| Parameter | Type   | Required | Default | Description                                        |
| --------- | ------ | -------- | ------- | -------------------------------------------------- |
| `term`    | string | ✅       | -       | Search term (minimum 1 character)                  |
| `media`   | string | ❌       | -       | Media type filter (movie, tvShow, music, etc.)     |
| `entity`  | string | ❌       | -       | Entity type filter (depends on media type)         |
| `country` | string | ❌       | `de`    | iTunes store country code (e.g., 'us', 'de', 'uk') |
| `limit`   | number | ❌       | `20`    | Maximum results to return (1-200)                  |

#### Example Request

```bash
GET /api/itunes/search?term=inception&media=movie&country=us&limit=10
```

#### Response Format

```json
{
  "success": true,
  "resultCount": 5,
  "results": [
    {
      "wrapperType": "track",
      "kind": "feature-movie",
      "trackId": 400763833,
      "artistName": "Christopher Nolan",
      "trackName": "Inception",
      "trackCensoredName": "Inception",
      "trackViewUrl": "https://itunes.apple.com/us/movie/inception/id400763833",
      "previewUrl": "https://video-ssl.itunes.apple.com/...",
      "artworkUrl30": "https://is1-ssl.mzstatic.com/...",
      "artworkUrl60": "https://is1-ssl.mzstatic.com/...",
      "artworkUrl100": "https://is1-ssl.mzstatic.com/...",
      "artworkUrl600": "https://is1-ssl.mzstatic.com/...",
      "collectionPrice": 9.99,
      "trackPrice": 14.99,
      "trackHdPrice": 19.99,
      "releaseDate": "2010-07-16T07:00:00Z",
      "primaryGenreName": "Sci-Fi & Fantasy",
      "contentAdvisoryRating": "PG-13",
      "longDescription": "Dom Cobb is a skilled thief...",
      "country": "USA",
      "currency": "USD"
    }
  ]
}
```

### Add iTunes Item

**Endpoint:** `POST /api/itunes/add`

Lookup and store an iTunes item in your local database for tracking.

#### Request Body

| Field          | Type    | Required | Default | Description                           |
| -------------- | ------- | -------- | ------- | ------------------------------------- |
| `itunesId`     | number  | ✅       | -       | iTunes ID (trackId or collectionId)   |
| `isCollection` | boolean | ❌       | `false` | Whether the ID refers to a collection |
| `country`      | string  | ❌       | `de`    | iTunes store country code             |

#### Example Request

```json
{
  "itunesId": 400763833,
  "isCollection": false,
  "country": "us"
}
```

#### Response Format

```json
{
  "success": true,
  "message": "Media item saved successfully",
  "mediaItemId": "550e8400-e29b-41d4-a716-446655440000"
}
```

#### Error Responses

**404 - Item Not Found:**

```json
{
  "success": false,
  "message": "Item not found in iTunes store"
}
```

**400 - Validation Error:**

```json
{
  "success": false,
  "message": "Validation error",
  "errors": [
    {
      "path": ["itunesId"],
      "message": "Expected number, received string"
    }
  ]
}
```

### List Stored Items

**Endpoint:** `GET /api/itunes/list`

Retrieve stored iTunes items from your local database with filtering and pagination.

#### Query Parameters

| Parameter    | Type    | Required | Default | Description                           |
| ------------ | ------- | -------- | ------- | ------------------------------------- |
| `limit`      | number  | ❌       | `20`    | Items per page (1-100)                |
| `offset`     | number  | ❌       | `0`     | Number of items to skip               |
| `artistName` | string  | ❌       | -       | Filter by artist name (partial match) |
| `name`       | string  | ❌       | -       | Filter by item name (partial match)   |
| `genreName`  | string  | ❌       | -       | Filter by genre (partial match)       |
| `mediaType`  | string  | ❌       | -       | Filter by media type (partial match)  |
| `entityType` | string  | ❌       | -       | Filter by entity type (partial match) |
| `withPrices` | boolean | ❌       | `false` | Include price history data            |

#### Example Request

```bash
GET /api/itunes/list?artistName=nolan&mediaType=movie&withPrices=true&limit=10
```

#### Response Format

```json
{
  "success": true,
  "data": [
    {
      "id": "550e8400-e29b-41d4-a716-446655440000",
      "itunesId": 400763833,
      "itunesIdType": "track",
      "wrapperType": "track",
      "mediaType": "movie",
      "entityType": "movie",
      "name": "Inception",
      "artistName": "Christopher Nolan",
      "censoredName": "Inception",
      "viewUrl": "https://itunes.apple.com/us/movie/inception/id400763833",
      "previewUrl": "https://video-ssl.itunes.apple.com/...",
      "artworkUrl": "https://is1-ssl.mzstatic.com/image/thumb/...",
      "releaseDate": "2010-07-16T07:00:00.000Z",
      "primaryGenreName": "Sci-Fi & Fantasy",
      "contentAdvisoryRating": "PG-13",
      "description": "Dom Cobb is a skilled thief...",
      "country": "USA",
      "currency": "USD",
      "additionalData": {
        "kind": "feature-movie",
        "trackTimeMillis": 8880000,
        "copyright": "© 2010 Warner Bros. Entertainment Inc."
      },
      "createdAt": "2024-05-23T10:30:00.000Z",
      "updatedAt": "2024-05-23T10:30:00.000Z",
      "prices": [
        {
          "id": "660e8400-e29b-41d4-a716-446655440001",
          "mediaItemId": "550e8400-e29b-41d4-a716-446655440000",
          "standardPrice": 14.99,
          "hdPrice": 19.99,
          "currency": "USD",
          "country": "USA",
          "recordedAt": "2024-05-23T10:30:00.000Z",
          "additionalPriceData": {
            "collectionPrice": 9.99
          }
        }
      ]
    }
  ],
  "count": 1,
  "offset": 0,
  "limit": 10
}
```

### Update All Prices

Update current prices for all stored iTunes media items by fetching fresh data from the iTunes Store API.

**Endpoint:** `POST /api/itunes/update-prices`

Dieser Endpunkt ist für den Cronjob gedacht, der die Preise alle 6 Stunden aktualisiert. Er verlangt keine Sitzung, sondern ein Bearer-Secret:

- Header `Authorization: Bearer <PRICE_UPDATE_CRON_SECRET>`
- Header `Content-Type: application/json` mit dem Body `{}`. Ohne Content-Type lehnt Astro den POST mit `403` ab, bevor der Endpunkt erreicht wird.

Antworten außer dem Erfolg:

- `401`: Secret fehlt oder ist falsch. Ist `PRICE_UPDATE_CRON_SECRET` auf dem Server nicht gesetzt, wird jede Anfrage abgelehnt.
- `405`: Andere Methode als `POST`, zum Beispiel das frühere `GET`.
- `429`: Eine Aktualisierung läuft bereits oder liegt weniger als 60 Sekunden zurück (Header `Retry-After`).

#### Response Format

```json
{
  "success": true,
  "message": "Preise erfolgreich aktualisiert",
  "data": {
    "total": 50,
    "updated": 12,
    "unchanged": 36,
    "errors": 2,
    "errorDetails": [
      {
        "mediaItemId": "550e8400-e29b-41d4-a716-446655440000",
        "itunesId": 400763833,
        "error": "Item not found in iTunes store"
      },
      {
        "mediaItemId": "660e8400-e29b-41d4-a716-446655440001",
        "itunesId": 400763834,
        "error": "Network timeout"
      }
    ]
  }
}
```

#### Success Response Fields

| Field          | Type   | Description                           |
| -------------- | ------ | ------------------------------------- |
| `total`        | number | Total number of stored media items    |
| `updated`      | number | Number of items with price changes    |
| `unchanged`    | number | Number of items with no price changes |
| `errors`       | number | Number of items that failed to update |
| `errorDetails` | array  | Details about failed updates          |

#### Error Response

```json
{
  "success": false,
  "message": "Fehler beim Aktualisieren der Preise",
  "error": "Database connection failed"
}
```

#### Usage Examples

```bash
# Preise im Docker-Container von Hand aktualisieren (liest das Secret selbst)
docker compose exec astro /app/scripts/update-prices-cron.sh

# Direkter Aufruf; das Secret kommt über stdin, nicht über die Kommandozeile
printf 'Authorization: Bearer %s\n' "$PRICE_UPDATE_CRON_SECRET" |
  curl -X POST https://your-domain.com/api/itunes/update-prices \
    -H @- \
    -H "Content-Type: application/json" \
    --data '{}'
```

## Data Models

### Media Item

The core data structure for stored iTunes items:

```typescript
interface MediaItem {
  id: string // UUID primary key
  itunesId: number // iTunes ID (trackId or collectionId)
  itunesIdType: 'track' | 'collection'
  wrapperType: string // track, collection, etc.
  mediaType: string // movie, tvShow, music, etc.
  entityType: string // movie, tvSeason, song, etc.
  name: string // Primary title
  artistName?: string // Artist/creator name
  censoredName?: string // Censored version of name
  viewUrl?: string // iTunes store URL
  previewUrl?: string // Preview media URL
  artworkUrl?: string // Highest quality artwork
  releaseDate?: Date // Release date
  primaryGenreName?: string // Primary genre
  contentAdvisoryRating?: string // Age rating
  description?: string // Long description
  country?: string // Store country
  currency?: string // Price currency
  additionalData?: object // Extra metadata as JSON
  createdAt: Date // Creation timestamp
  updatedAt?: Date // Last update timestamp
}
```

### Price History

Historical price tracking for media items:

```typescript
interface PriceHistory {
  id: string // UUID primary key
  mediaItemId: string // Reference to media item
  standardPrice?: number // Standard definition price
  hdPrice?: number // High definition price
  currency?: string // Price currency
  country?: string // Store country
  recordedAt: Date // When price was recorded
  additionalPriceData?: object // Extra price data as JSON
}
```

## Usage Examples

### Search for Movies

```bash
# Search for Christopher Nolan movies
GET /api/itunes/search?term=christopher%20nolan&media=movie&country=de

# Search for sci-fi movies
GET /api/itunes/search?term=science%20fiction&media=movie&limit=50
```

### Track Price Changes

```bash
# Add an item to track its price
POST /api/itunes/add
{
  "itunesId": 400763833,
  "country": "de"
}

# Later, check price history
GET /api/itunes/list?withPrices=true
```

### Filter Your Collection

```bash
# Find all Christopher Nolan movies in your collection
GET /api/itunes/list?artistName=nolan&mediaType=movie

# Get paginated results
GET /api/itunes/list?limit=50&offset=100
```

### Update All Prices

```bash
# Alle gespeicherten Preise aktualisieren (Bearer-Secret erforderlich)
POST /api/itunes/update-prices
Authorization: Bearer <PRICE_UPDATE_CRON_SECRET>
Content-Type: application/json

# Im Docker-Image läuft das alle 6 Stunden über scripts/update-prices-cron.sh
```
