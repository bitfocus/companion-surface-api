# @companion-surface/base

Plugin API for writing surface integrations for [Companion](https://github.com/bitfocus/companion).

## Installation

```bash
yarn add @companion-surface/base
```

## Usage

Implement the `SurfacePlugin` interface to create a surface integration. Your plugin handles all surfaces of a given type.

```typescript
import { SurfacePlugin, SurfaceContext, SurfaceModelDefinition } from '@companion-surface/base'

export const MySurfacePlugin: SurfacePlugin = {
  async init(): Promise<void> {
    // Initialize your plugin
  }

  async destroy(): Promise<void> {
    // Clean up
  }

  async getSurfaceModels(): Promise<SurfaceModelDefinition[]> {
    // The models of surface you support, whether or not one is plugged in
    return []
  }

  // Implement detection or manual connection methods
}
```

For complete examples, look at an existing plugin that finds its devices the same way yours will:

- [xkeys](https://github.com/bitfocus/companion-surface-xkeys): a simple local HID device, discovered by Companion's own HID scanning (`checkSupportsHidDevice`)
- [loupedeck](https://github.com/bitfocus/companion-surface-loupedeck): a local device that isn't HID (serial), which the plugin scans for itself (`scanForSurfaces`)
- [elgato-stream-deck](https://github.com/bitfocus/companion-surface-elgato-stream-deck): local HID devices plus network-connected devices (`remote`), and it describes its models and their appearance

## Supported Versions

| Companion | Module-base |
| --------- | ----------- |
| v4.3      | v1.2        |
| v5.0      | v1.3        |
| v5.1      | v1.4 (TBD)  |

## Documentation

- [Generated API docs](https://bitfocus.github.io/companion-surface-api/)
- [Wiki](https://github.com/bitfocus/companion-surface-api/wiki)

## Development

This package is part of a monorepo. See the root README for development instructions.
