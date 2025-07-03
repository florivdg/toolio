# Changelog

## v0.2.2

[compare changes](https://github.com/florivdg/toolio/compare/v0.2.1...v0.2.2)

### 🚀 Enhancements

- **wishlists:** Integrate Pinia Colada for query management and clean up API calls #11 ([#11](https://github.com/florivdg/toolio/issues/11))

### 🏡 Chore

- **ai:** Update copilot instructions to clarify package manager and architecture patterns ([ac44fac](https://github.com/florivdg/toolio/commit/ac44fac))
- Update dependencies and devDependencies to latest versions ([49be9c9](https://github.com/florivdg/toolio/commit/49be9c9))

### ❤️ Contributors

- Florian van der Galiën <hallo@flori.dev>

## v0.2.1

[compare changes](https://github.com/florivdg/toolio/compare/v0.2.0...v0.2.1)

### 🩹 Fixes

- **wishlists:** Improve styling and error handling in MoveWishlistItemDialog #9 ([#9](https://github.com/florivdg/toolio/issues/9))

### 💅 Refactors

- **wishlists:** Make WishlistModal for creating and editing wishlists more DRY #9 ([#9](https://github.com/florivdg/toolio/issues/9))

### 🏡 Chore

- Remove package-lock.json ([8a040f8](https://github.com/florivdg/toolio/commit/8a040f8))
- Update dependencies in package.json ([84d33f2](https://github.com/florivdg/toolio/commit/84d33f2))

### ❤️ Contributors

- Florian van der Galiën <hallo@flori.dev>

## v0.2.0

[compare changes](https://github.com/florivdg/toolio/compare/v0.1.0...v0.2.0)

### 🚀 Enhancements

- Add wishlist and wishlist items API with CRUD operations #5 ([#5](https://github.com/florivdg/toolio/issues/5))
- **dialog:** Add dialog component structure with close, content, header, footer, overlay, title, and trigger ([5f5ae37](https://github.com/florivdg/toolio/commit/5f5ae37))
- **textarea:** Add Textarea component with v-model support ([38866ea](https://github.com/florivdg/toolio/commit/38866ea))
- **wishlists:** Add CreateWishlistModal and integrate with WishlistsView #5 ([#5](https://github.com/florivdg/toolio/issues/5))
- **collapsible:** Add Collapsible, CollapsibleContent, and CollapsibleTrigger components ([7415911](https://github.com/florivdg/toolio/commit/7415911))
- **dropdown-menu:** Add DropdownMenu components and structure ([489ec70](https://github.com/florivdg/toolio/commit/489ec70))
- Add EditWishlistItemModal and WishlistItemForm components for editing wishlist items #5 ([#5](https://github.com/florivdg/toolio/issues/5))
- **wishlists:** Enhance EditWishlistItemModal with form population and validation #5 ([#5](https://github.com/florivdg/toolio/issues/5))
- **wishlists:** Add delete functionality for wishlist items and confirmation dialogs #5 ([#5](https://github.com/florivdg/toolio/issues/5))
- **wishlists:** Implement URL extraction feature for product details #5 ([#5](https://github.com/florivdg/toolio/issues/5))
- **url-extractor:** Add special handling for Amazon price extraction #5 ([#5](https://github.com/florivdg/toolio/issues/5))

### 💅 Refactors

- **api:** Remove authentication checks from wishlist item routes #5 ([#5](https://github.com/florivdg/toolio/issues/5))
- **api:** Enhance wishlist item update with partial updates and validation #5 ([#5](https://github.com/florivdg/toolio/issues/5))
- **wishlists:** Update Create and Edit Wishlist Item request interfaces to allow null values #5 ([#5](https://github.com/florivdg/toolio/issues/5))
- **wishlists:** Optimize total count retrieval for pagination #5 ([#5](https://github.com/florivdg/toolio/issues/5))
- **wishlists:** Replace DialogContent with DialogScrollContent for improved layout #5 ([#5](https://github.com/florivdg/toolio/issues/5))

### 📖 Documentation

- Add authentication section to copilot instructions ([f4eeaaf](https://github.com/florivdg/toolio/commit/f4eeaaf))
- **wishlists:** Update API documentation header with metadata #5 ([#5](https://github.com/florivdg/toolio/issues/5))

### 🏡 Chore

- **db:** Add migrations for wishlist_items and wishlists tables #5 ([#5](https://github.com/florivdg/toolio/issues/5))
- **vscode:** Add oxc linter ([7f3c47a](https://github.com/florivdg/toolio/commit/7f3c47a))
- **agent:** Update copilot instructions, mcp server and add coding best practices ([7f9b606](https://github.com/florivdg/toolio/commit/7f9b606))

### 🎨 Styles

- **wishlists:** Enhance layout and responsiveness for wishlist items view #5 ([#5](https://github.com/florivdg/toolio/issues/5))

## v0.1.0

[compare changes](https://github.com/florivdg/toolio/compare/v0.0.2...v0.1.0)

### 🚀 Enhancements

- Implement iTunes lookup API client with track lookup functionality ([4f65870](https://github.com/florivdg/toolio/commit/4f65870))
- Add iTunes search API route with query parameter validation ([388012b](https://github.com/florivdg/toolio/commit/388012b))
- Implement iTunes media item storage and retrieval functionality ([cf0e2a2](https://github.com/florivdg/toolio/commit/cf0e2a2))
- Enhance iTunes API integration with media item and price history support ([341bd3f](https://github.com/florivdg/toolio/commit/341bd3f))
- **docs:** Add iTunes Price Watcher documentation and API details #2 ([#2](https://github.com/florivdg/toolio/issues/2))
- Update Menu and documentation pages to include iTunes Price Watcher ([e6dbdba](https://github.com/florivdg/toolio/commit/e6dbdba))
- **ui:** Add Badge component ([028f48a](https://github.com/florivdg/toolio/commit/028f48a))
- **ui:** Install Select component suite ([42e0efa](https://github.com/florivdg/toolio/commit/42e0efa))
- **itunes:** Implement search functionality with SearchBar component ([8deda58](https://github.com/florivdg/toolio/commit/8deda58))
- **itunes:** Enhance SearchBar with clear functionality and input type change ([e4b1915](https://github.com/florivdg/toolio/commit/e4b1915))
- **itunes:** Add formatting utility functions for date, price, and media type ([71dff6f](https://github.com/florivdg/toolio/commit/71dff6f))
- **itunes:** Implement SearchView and WatchlistView components with client-sode routing #2 ([#2](https://github.com/florivdg/toolio/issues/2))
- **itunes:** Enhance WatchlistView with improved layout and item details #2 ([#2](https://github.com/florivdg/toolio/issues/2))
- **itunes:** Implement price updates endpoint #2 ([#2](https://github.com/florivdg/toolio/issues/2))
- **db:** Enable foreign key constraints in SQLite database #2 ([#2](https://github.com/florivdg/toolio/issues/2))
- **docker:** Add cron support for automatic iTunes price updates #2 ([#2](https://github.com/florivdg/toolio/issues/2))
- **itunes:** Enhance price update process with unchanged item tracking #2 ([#2](https://github.com/florivdg/toolio/issues/2))
- **notifications:** Add notification utility for sending broadcast messages ([6ba9831](https://github.com/florivdg/toolio/commit/6ba9831))
- **itunes:** Implement price drop notification for media items #2 ([#2](https://github.com/florivdg/toolio/issues/2))
- **itunes:** Add confirmation dialog for removing items from watchlist #2 ([#2](https://github.com/florivdg/toolio/issues/2))
- **itunes:** Add toast notifications for adding and removing items from watchlist #2 ([#2](https://github.com/florivdg/toolio/issues/2))

### 🩹 Fixes

- Remove '/api/itunes' from public paths in middleware authentication ([06ae245](https://github.com/florivdg/toolio/commit/06ae245))
- **global.css:** Destructive color in dark mode ([26d5cf6](https://github.com/florivdg/toolio/commit/26d5cf6))
- **itunes:** Update redirect path to watchlist in client router ([3d12006](https://github.com/florivdg/toolio/commit/3d12006))

### 💅 Refactors

- **ui:** Replace tag spans with Badge component in index pages ([53f16c4](https://github.com/florivdg/toolio/commit/53f16c4))
- **middleware:** Remove '/api/itunes' from public paths list ([9499a86](https://github.com/florivdg/toolio/commit/9499a86))
- **itunes:** Implement MediaCard component for displaying media items in Search and Watchlist views #2 ([#2](https://github.com/florivdg/toolio/issues/2))

### 📖 Documentation

- **copilot:** Add copilot instructions for Toolio project structure and coding standards ([bcad2ef](https://github.com/florivdg/toolio/commit/bcad2ef))
- **agent:** Update component structure instructions to include available shadcn-vue components ([bc21914](https://github.com/florivdg/toolio/commit/bc21914))
- **deployment:** Add notification API key to environment variables ([5794b72](https://github.com/florivdg/toolio/commit/5794b72))

### 🏡 Chore

- **alert-dialog:** Add from shadcn-vue ([e52bb98](https://github.com/florivdg/toolio/commit/e52bb98))
- **sonner:** Add Sonner component for toast notifications ([979c27b](https://github.com/florivdg/toolio/commit/979c27b))

### 🎨 Styles

- **itunes:** Adjust grid classes for responsive layout in MediaCard and views #2 ([#2](https://github.com/florivdg/toolio/issues/2))

### ❤️ Contributors

- Florian van der Galiën <hallo@flori.dev>
