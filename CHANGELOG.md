# Changelog

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
