# Changelog

All notable changes to this project will be documented in this file.

The format follows [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

---

## [0.2.0] - 2024-03-01

### Added
- Multi-viewpoint tour support: chain panoramas into a navigable virtual walkthrough
- Hotpoint system: place interactive 3D markers to jump between viewpoints
- Decoration layer: overlay custom three.js objects on the scene
- Support for 24-tile high-resolution cubemap format
- TypeScript type definitions shipped with the package (`dist/types`)
- ESM-only build for tree-shaking support
- Live-server dev mode with incremental rebuilds
- ESLint + Prettier integration in the build pipeline

### Changed
- Switched build toolchain from webpack to esbuild for faster builds
- `PanoViewerConfig` interface extended with `fov` and `autoRotate` options

### Fixed
- Memory leak when destroying viewer without explicit `dispose()` call
- Camera drift on touch devices with high pixel-density screens

---

## [0.1.0] - 2023-10-15

### Added
- Initial release
- Single equirectangular image panorama rendering via three.js
- 6-image cubemap support
- Basic camera controls (drag to look, scroll to zoom)
- `PanoViewer` class with `setViewpoints` and `activatePanoramaById` API
