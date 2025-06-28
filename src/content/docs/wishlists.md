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

### 8. Move Wishlist Item

**PATCH** `/api/wishlists/{wishlistId}/items/{itemId}/move`

Move a wishlist item to another wishlist.

**Request Body:**

```json
{
  "targetWishlistId": "uuid (required)"
}
```

**Response:**

```json
{
  "success": true,
  "message": "Artikel erfolgreich verschoben",
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

**Error Responses:**

- `404` - Source wishlist, target wishlist, or item not found
- `400` - Target wishlist is the same as source wishlist
- `400` - Invalid request parameters

## URL Extraction Endpoint

### Extract Product Details from URL

**POST** `/api/wishlists/extract-url`

Extract product details from a URL to pre-fill wishlist item forms. This endpoint fetches the HTML content from the provided URL and extracts relevant product information like name, description, price, and image.

**Request Body:**

```json
{
  "url": "string (required, must be a valid URL)"
}
```

**Response:**

```json
{
  "success": true,
  "data": {
    "name": "string (optional)",
    "description": "string (optional)",
    "price": "number (optional)",
    "imageUrl": "string (optional)",
    "extractedFrom": "string",
    "confidence": "high|medium|low"
  }
}
```

**Example Request:**

```bash
curl -X POST http://localhost:4321/api/wishlists/extract-url \
  -H "Content-Type: application/json" \
  -d '{"url": "https://www.amazon.de/product-example"}'
```

**Example Response:**

```json
{
  "success": true,
  "data": {
    "name": "Wireless Bluetooth Kopfhörer",
    "description": "Premium Bluetooth Kopfhörer mit Noise Cancellation",
    "price": 89.99,
    "imageUrl": "https://example.com/product-image.jpg",
    "extractedFrom": "https://www.amazon.de/product-example",
    "confidence": "high"
  }
}
```

**Supported Extraction Patterns:**

- **Product Name**: OpenGraph title, Twitter title, product-specific meta tags, Amazon product title, H1 tags, page title
- **Description**: OpenGraph description, meta description, product description meta tags
- **Price**: OpenGraph price meta tags, Amazon price elements, general price patterns (€), JSON-LD structured data
- **Image**: OpenGraph image, Twitter image, product image meta tags, Amazon main image

**Confidence Levels:**

- **High**: Price was successfully extracted (indicates a product page)
- **Medium**: Name was extracted but no price found
- **Low**: Minimal information was extracted

**Error Responses:**

**Validation Error (400):**

```json
{
  "success": false,
  "error": "Ungültige Eingabedaten",
  "details": [
    {
      "code": "invalid_url",
      "message": "URL muss gültig sein"
    }
  ]
}
```

**Extraction Error (500):**

```json
{
  "success": false,
  "error": "Fehler beim Extrahieren der URL-Details"
}
```

**Usage in Frontend:**

The URL extraction feature is integrated into the wishlist item forms with a magic button (✨) next to the URL input field. When clicked, it automatically fetches product details and pre-fills the form fields, while still allowing users to modify the extracted information before submitting.
