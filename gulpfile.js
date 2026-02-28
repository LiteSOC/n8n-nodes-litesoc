const { src, dest, series } = require('gulp');
const path = require('path');

/**
 * Copy SVG icons to dist folder
 * n8n requires icons to be alongside the compiled JS files
 */
function copyIcons() {
	// Copy node icon to be alongside the node file
	return src('nodes/**/*.svg')
		.pipe(dest('dist/nodes/'));
}

/**
 * Copy JSON files (codex files) to dist folder
 */
function copyJson() {
	return src('nodes/**/*.json')
		.pipe(dest('dist/nodes/'));
}

/**
 * Copy credential icons if any exist
 */
function copyCredentialIcons() {
	return src('nodes/credentials/**/*.svg')
		.pipe(dest('dist/nodes/credentials/'));
}

/**
 * Copy main assets folder for fallback
 */
function copyAssets() {
	return src('assets/**/*')
		.pipe(dest('dist/assets/'));
}

// Default task: copy all assets after TypeScript compilation
exports.default = series(copyIcons, copyJson, copyCredentialIcons, copyAssets);
exports.icons = copyIcons;
exports.json = copyJson;
exports.assets = copyAssets;
