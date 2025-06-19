---
title: Wishlists
description: Track and manage things you want to buy or receive as gifts.
createdAt: 2025-06-19
tags: [E-Commerce]
draft: false
---

This document describes the REST API endpoints for managing wishlists and wishlist items in the Toolio application.

## Base URL

All endpoints are relative to `/api/wishlists`

## Authentication

All endpoints require authentication. The user session is checked via the `locals.user` object.

## Wishlists Endpoints

### 1. List Wishlists

**GET** `/api/wishlists`

Retrieve a paginated list of all wishlists.

**Query Parameters:**

- `limit` (optional): Number of items to return (1-100, default: 20)
- `offset` (optional): Number of items to skip (default: 0)

**Response:**

```json
{
  "success": true,
  "data": [
    {
      "id": "uuid",
      "name": "string",
      "description": "string",
      "createdAt": "timestamp",
      "updatedAt": "timestamp"
    }
  ],
  "pagination": {
    "limit": 20,
    "offset": 0,
    "total": 100,
    "hasMore": true
  }
}
```

### 2. Create Wishlist

**POST** `/api/wishlists`

Create a new wishlist.

**Request Body:**

```json
{
  "name": "string (required)",
  "description": "string (optional)"
}
```

**Response:**

```json
{
  "success": true,
  "message": "Wunschliste erfolgreich erstellt",
  "data": {
    "id": "uuid",
    "name": "string",
    "description": "string",
    "createdAt": "timestamp",
    "updatedAt": "timestamp"
  }
}
```

### 3. Get Wishlist

**GET** `/api/wishlists/{id}`

Retrieve a specific wishlist with all its items.

**Response:**

```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "name": "string",
    "description": "string",
    "createdAt": "timestamp",
    "updatedAt": "timestamp",
    "items": [
      {
        "id": "uuid",
        "wishlistId": "uuid",
        "name": "string",
        "description": "string",
        "price": "number",
        "url": "string",
        "imageUrl": "string",
        "isActive": "boolean",
        "isPurchased": "boolean",
        "priority": "number",
        "notes": "string",
        "createdAt": "timestamp",
        "updatedAt": "timestamp"
      }
    ]
  }
}
```

### 4. Update Wishlist

**PUT** `/api/wishlists/{id}`

Update a specific wishlist.

**Request Body:**

```json
{
  "name": "string (optional)",
  "description": "string (optional)"
}
```

**Response:**

```json
{
  "success": true,
  "message": "Wunschliste erfolgreich aktualisiert",
  "data": {
    "id": "uuid",
    "name": "string",
    "description": "string",
    "createdAt": "timestamp",
    "updatedAt": "timestamp"
  }
}
```

### 5. Delete Wishlist

**DELETE** `/api/wishlists/{id}`

Delete a specific wishlist and all its items (cascade delete).

**Response:**

```json
{
  "success": true,
  "message": "Wunschliste erfolgreich gelöscht",
  "deletedId": "uuid"
}
```

## Wishlist Items Endpoints

### 1. List Wishlist Items

**GET** `/api/wishlists/{wishlistId}/items`

Retrieve a paginated list of items in a specific wishlist.

**Query Parameters:**

- `limit` (optional): Number of items to return (1-100, default: 20)
- `offset` (optional): Number of items to skip (default: 0)
- `purchased` (optional): Filter by purchase status (true/false)
- `active` (optional): Filter by active status (true/false)

**Response:**

```json
{
  "success": true,
  "data": [
    {
      "id": "uuid",
      "wishlistId": "uuid",
      "name": "string",
      "description": "string",
      "price": "number",
      "url": "string",
      "imageUrl": "string",
      "isActive": "boolean",
      "isPurchased": "boolean",
      "priority": "number",
      "notes": "string",
      "createdAt": "timestamp",
      "updatedAt": "timestamp"
    }
  ],
  "pagination": {
    "limit": 20,
    "offset": 0,
    "total": 50,
    "hasMore": true
  }
}
```

### 2. Create Wishlist Item

**POST** `/api/wishlists/{wishlistId}/items`

Create a new item in a specific wishlist.

**Request Body:**

```json
{
  "name": "string (required)",
  "description": "string (optional)",
  "price": "number (optional)",
  "url": "string (required)",
  "imageUrl": "string (optional)",
  "isActive": "boolean (optional, default: true)",
  "isPurchased": "boolean (optional, default: false)",
  "priority": "number (optional, default: 0)",
  "notes": "string (optional)"
}
```

**Response:**

```json
{
  "success": true,
  "message": "Wunschlistenelement erfolgreich erstellt",
  "data": {
    "id": "uuid",
    "wishlistId": "uuid",
    "name": "string",
    "description": "string",
    "price": "number",
    "url": "string",
    "imageUrl": "string",
    "isActive": "boolean",
    "isPurchased": "boolean",
    "priority": "number",
    "notes": "string",
    "createdAt": "timestamp",
    "updatedAt": "timestamp"
  }
}
```

### 3. Get Wishlist Item

**GET** `/api/wishlists/{wishlistId}/items/{itemId}`

Retrieve a specific wishlist item.

**Response:**

```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "wishlistId": "uuid",
    "name": "string",
    "description": "string",
    "price": "number",
    "url": "string",
    "imageUrl": "string",
    "isActive": "boolean",
    "isPurchased": "boolean",
    "priority": "number",
    "notes": "string",
    "createdAt": "timestamp",
    "updatedAt": "timestamp"
  }
}
```

### 4. Update Wishlist Item

**PUT** `/api/wishlists/{wishlistId}/items/{itemId}`

Update a specific wishlist item.

**Request Body:**

```json
{
  "name": "string (optional)",
  "description": "string (optional)",
  "price": "number (optional)",
  "url": "string (optional)",
  "imageUrl": "string (optional)",
  "isActive": "boolean (optional)",
  "isPurchased": "boolean (optional)",
  "priority": "number (optional)",
  "notes": "string (optional)"
}
```

**Response:**

```json
{
  "success": true,
  "message": "Wunschlistenelement erfolgreich aktualisiert",
  "data": {
    "id": "uuid",
    "wishlistId": "uuid",
    "name": "string",
    "description": "string",
    "price": "number",
    "url": "string",
    "imageUrl": "string",
    "isActive": "boolean",
    "isPurchased": "boolean",
    "priority": "number",
    "notes": "string",
    "createdAt": "timestamp",
    "updatedAt": "timestamp"
  }
}
```

### 5. Delete Wishlist Item

**DELETE** `/api/wishlists/{wishlistId}/items/{itemId}`

Delete a specific wishlist item.

**Response:**

```json
{
  "success": true,
  "message": "Wunschlistenelement erfolgreich gelöscht",
  "deletedId": "uuid"
}
```

### 6. Update Purchase Status

**PATCH** `/api/wishlists/{wishlistId}/items/{itemId}/purchase`

Update the purchase status of a specific wishlist item.

**Request Body:**

```json
{
  "isPurchased": "boolean (required)"
}
```

**Response:**

```json
{
  "success": true,
  "message": "Wunschlistenelement erfolgreich als gekauft markiert",
  "data": {
    "id": "uuid",
    "wishlistId": "uuid",
    "name": "string",
    "description": "string",
    "price": "number",
    "url": "string",
    "imageUrl": "string",
    "isActive": "boolean",
    "isPurchased": "boolean",
    "priority": "number",
    "notes": "string",
    "createdAt": "timestamp",
    "updatedAt": "timestamp"
  }
}
```

### 7. Update Active Status

**PATCH** `/api/wishlists/{wishlistId}/items/{itemId}/active`

Update the active status of a specific wishlist item.

**Request Body:**

```json
{
  "isActive": "boolean (required)"
}
```

**Response:**

```json
{
  "success": true,
  "message": "Wunschlistenelement erfolgreich als aktiv markiert",
  "data": {
    "id": "uuid",
    "wishlistId": "uuid",
    "name": "string",
    "description": "string",
    "price": "number",
    "url": "string",
    "imageUrl": "string",
    "isActive": "boolean",
    "isPurchased": "boolean",
    "priority": "number",
    "notes": "string",
    "createdAt": "timestamp",
    "updatedAt": "timestamp"
  }
}
```

## Error Responses

All endpoints return consistent error responses:

**Validation Error (400):**

```json
{
  "success": false,
  "message": "Ungültige Anfrageparameter",
  "errors": [
    {
      "code": "invalid_type",
      "expected": "string",
      "received": "undefined",
      "path": ["name"],
      "message": "Required"
    }
  ]
}
```

**Authentication Error (401):**

```json
{
  "success": false,
  "message": "Authentifizierung erforderlich"
}
```

**Not Found Error (404):**

```json
{
  "success": false,
  "message": "Wunschliste nicht gefunden"
}
```

**Server Error (500):**

```json
{
  "success": false,
  "message": "Fehler beim Laden der Wunschliste",
  "error": "Detailed error message"
}
```

## Notes

- All UUIDs are validated using Zod schemas
- Timestamps are stored as JavaScript Date objects in SQLite
- Foreign key constraints ensure data integrity (cascade delete for wishlist items when parent wishlist is deleted)
- All endpoints require authentication via better-auth
- German language is used for all user-facing messages
- Pagination is implemented consistently across list endpoints
- Special PATCH endpoints are available for toggling purchase and active status individually
