# IoT Platform · Demo

A demo of a smart-mall operations platform: one screen for every system on site, plus a 3D view of
the campus. Clicking a building switches every KPI to that building.

**Everything in this demo is simulated.** It has no backend and no connection to any device, PLC,
OPC UA server or AVEVA Galaxy. Its gateway layer (`src/gateway`) is replaced by simulators.

**Sign in** with user name `administrator` and password `000000`. The account is local to the demo
(`src/gateway/auth.ts`); the session lasts until the tab is closed or you sign out.

Values come from deterministic simulators in the browser,
so the data moves like live data and is the same on every reload. Writes (for example, switching an
FCU on the floor plan) are kept in memory until the page is reloaded.

## Verticals

| Vertical | Tabs |
|---|---|
| 3D View | Campus render with building hover; click a building to scope the KPIs |
| Fire | Fire System (building cards, per-building device pages and a fire-drill simulation), Fire Hydrants |
| Electric | Transformers, MDB, Generators, UPS, single-line diagram (with a utility-failure drill) |
| Community | Application, Navigation, Crowd Monitoring, Social Media |
| Metering | Energy, Energy Analytics, Water, BTU, Billing |
| Security | CCTV, Access Control, Parking & LPR, Gates |
| Plumbing | Domestic & Irrigation, Pumps, Valve Chambers, water-network diagram |
| Wastewater | Submersible Pumps, Odor Control |
| Maintenance | Ticketing, Mechanical, Electrical, Pumps, Sensors |

Equipment cards carry a **Galaxy points** switch that lists each asset's attributes as they would be
modelled in an AVEVA System Platform Galaxy (`Tag.Attribute`, value, type). Here they are simulated.

## Run it locally

Needs Node.js 20.19+ (22 recommended).

```bash
npm install
npm run dev
```

Then open http://localhost:5190. The screens are laid out on a fixed 1920 × 1080 stage that scales
to fit any window.

## Build

```bash
npm run build
```

The static site is written to `dist/`. Asset paths are relative and routes use `#/…`, so the folder
can be served from any static host or sub-folder.

## Publish on GitHub Pages

The workflow in `.github/workflows/pages.yml` builds and publishes the site on every push to `main`.
Once, in the repository on GitHub: **Settings → Pages → Build and deployment → Source: GitHub
Actions**. The site then appears at `https://<user>.github.io/<repository>/`.

## Stack

React 19, TypeScript, Vite, Tailwind CSS 4, Framer Motion, React Router, Zustand, three.js
(react-three-fiber).

| Folder | What is in it |
|---|---|
| `src/screens/` | One file per vertical; `registry.tsx` maps each tab to its screen |
| `src/sim/` | The simulators: signals, event streams, scenarios (fire drill, mains failure) |
| `src/model/` | Navigation, buildings, and the simulated assets with their Galaxy-style templates |
| `src/gateway/` | The demo stand-in for the live connection: simulated FAHU and FCU objects, no network |
| `src/components/`, `src/widgets/` | Cards, gauges, charts, tables, the site map and the single-line-diagram symbols |
