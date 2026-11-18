# Companion Surface Base

Monorepo for Companion surface plugin libraries.

## Packages

- **[@companion-surface/base](packages/base/)** - Plugin API for writing surface integrations. Small, stable, versioned conservatively.
- **[@companion-surface/host](packages/host/)** - Host-side wrapper that runs plugins in-process. Handles API version compatibility and provides the interface to Companion.

## Development

```bash
# Install dependencies
yarn install

# Build all packages
yarn build

# Run in watch mode
yarn dev

# Lint
yarn lint

# Run tests
yarn unit
```

## Creating a Surface Plugin

There is no template yet, as surface plugins vary a lot in how they find their devices. The easiest way to start is to copy whichever existing plugin is closest to what you need:

- [xkeys](https://github.com/bitfocus/companion-surface-xkeys): a simple local HID device, discovered by Companion's own HID scanning (`checkSupportsHidDevice`)
- [loupedeck](https://github.com/bitfocus/companion-surface-loupedeck): a local device that isn't HID (serial), which the plugin scans for itself (`scanForSurfaces`)
- [elgato-stream-deck](https://github.com/bitfocus/companion-surface-elgato-stream-deck): local HID devices plus network-connected devices (`remote`), and it describes its models and their appearance

Your plugin only needs to depend on `@companion-surface/base`. The host package is used by Companion itself.

## Architecture

Plugins implement the base API (`@companion-surface/base`). The host package wraps these plugins with additional logic, manages lifecycle, and bridges to Companion's core. This separation keeps the plugin API minimal and stable while allowing the host side to evolve more freely.
