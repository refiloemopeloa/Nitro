# Project File Structure (tentative)

## Root directory

All config files are kept in the root directory.

* `package.json` : `npm` package configuration.
* `package-lock.json` : Lock file for `npm` dependencies.
* `README.md` : Project setup.
* `.gitignore` : Git ignore file.

## Main folders

* `.github` : GitHub-specific files (e.g., workflows, templates). 
* `node_modules` : Third-party dependencies. 
* `public` : Static assets served directly.
	* Textures
	* Audio
	* 3D Models
* `src` : Source code for the application.

## `src` 

* `assets` : Static assets used in the app (images, fonts, etc.).
* `main.js` : File where app code runs.
* `utiils` : Folder for any helpers you may make, e.g. controls.

## Notes

* Keep helpers in the `utils` folder.
* Make sub-folders for each helper.
* The `public` folder is for static assets that don't require processing.

