# Naming Conventions

## File Names

* Use `PascalCase` for component file names.
* Match the name of the default export.
* Examples: `Lighting.js` , `Physics.js`.
* `main.js` and `index.html` are the only files that start with a lower case.

### Utilities and helpers

* Use `camelCase` for utility file names.
* Examples: `controls.js` , `cameraMotion.js`.

## Function Names

* Use `PascalCase` for component functions (they are in fact components).
* Examples: `const AddCube = () => {}`.

### Event Handlers

* Prefix with `handle` and use `camelCase`.
* Examples: `handleObstacle()` , `handleZombie()`.

### Utility Functions

* Use camelCase Descriptive and action-oriented.
* Examples: `init()` , `animate()`.