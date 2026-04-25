# Figma Page-by-Page Implementation Map

Figma file: `3Sr2hwapFZWWh3nW9rSaPb`

## Screen mapping

| Route | Figma node | Implementation file | Status |
|---|---|---|---|
| `#/dashboard` | `1:2` | `src/pages/dashboard.js` | Implemented |
| `#/inventory` | `1:840` | `src/pages/inventory.js` | Implemented |
| `#/demand-forecasting` | `1:2039` | `src/pages/demand-forecasting.js` | Implemented |
| `#/restocking` | `1:2753` | `src/pages/restocking.js` | Implemented |
| `#/alerts` | `1:3381` | `src/pages/alerts.js` | Implemented |
| `#/reports` | `1:3882` | `src/pages/reports.js` | Implemented |
| `#/settings` | `1:4260` | `src/pages/settings.js` | Implemented |
| `#/login` | `1:4435` | `src/pages/login.js` | Implemented |

## Shared implementation files

- `src/main.js`: route handling + app rendering
- `src/components/layout.js`: shared shell/nav rendering helpers
- `src/config/routes.js`: route list and labels
- `styles.css`: shared styling tokens and UI styles

## Notes

- This keeps each page in its own file so screens can be updated independently.
- To push exact visual parity, update each page module block-by-block using the corresponding node in this table.
