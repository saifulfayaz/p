# PDF Studio — GitHub Pages fix

This package works at both https://saifulfayaz.github.io/p/ and a custom domain such as https://pdf.saiful.in/. It uses relative URLs for styles, scripts, image-processing workers and PDF libraries. No rebuild is needed when the domain changes.

## Replace the broken deployment

1. Extract this ZIP into a new folder.
2. Open the GitHub repository saifulfayaz/p. Choose Add file > Upload files.
3. Open the extracted folder on your computer, select everything inside it, and drag that selection onto GitHub's upload area. Include the assets and vendor folders and the .nojekyll file. Upload the contents directly to the repository root, with index.html at the top level.
4. Commit the files to the branch used by GitHub Pages. This replaces files with matching names and adds the new assets folder. The previous _next files are no longer used; you can leave them in place.
5. Keep Settings > Pages set to Deploy from a branch, main, /(root), if that is your publishing branch. Wait for the deployment to finish, then open https://saifulfayaz.github.io/p/ and refresh with Ctrl+Shift+R.

The .nojekyll marker contains a short line of text so upload tools will not skip it as an empty file. If it is absent from the repository after upload, use Add file > Create new file, name it .nojekyll, put PDF Studio on the first line and commit it.

A complete upload contains index.html, favicon.svg, document-worker.js, document-engine.js, .nojekyll, assets/, vendor/, and this README. Do not upload only index.html and do not flatten the folders.

## Your own domain

The same files work on a custom domain. Add pdf.saiful.in under Settings > Pages > Custom domain before changing DNS, then point the pdf CNAME at saifulfayaz.github.io. Enable Enforce HTTPS when GitHub makes it available. Keep any existing CNAME file when uploading updates.

Serve this app over HTTP/HTTPS. Opening index.html directly from your computer does not reliably support browser modules and workers.

## Use

Add images, select a page and use Crop. Automatic detection offers several outlines; review the corners before applying. Search in selection limits detection to the area you choose. Drag corners or use arrow keys (Shift moves by 10 pixels). Choose a known output shape when exact paper or card proportions are required.

Use the right panel on desktop or Layout / Adjust / Export tabs on phones. Colour modes, shadow removal, sharpness, undo/redo and exact millimetre PDF layouts are available. The original image remains available. All image processing stays on your device. Reloading clears the temporary workspace; export your PDF before leaving.

The PDF Compressor link still points to the separate original tool at https://pdf.saiful.in/compress; that tool is not included in this package.

## Build and verification

The portable distribution uses the same React editor and document engine as the hosted version. Its client bundle is generated with Vite using a relative base, with document-relative worker and library loading. There is no Next/Vinext runtime or build step required on GitHub.

Styles and page controls were checked under a /p/ path. Image import, automatic document-edge detection, perspective correction and PDF generation were exercised from that subfolder. TypeScript and worker syntax checks passed. This validates the local deployment package; the updated files still need to be uploaded to GitHub.

The detector was previously tested with seven controlled synthetic scenes including shadows, low contrast, dark documents, clutter and strong perspective. Real-world photos may still require manual corner adjustment.

## Licenses

OpenCV.js 4.10.0 (Apache-2.0), jsPDF 2.5.1 (MIT), and heic2any 0.0.4 (MIT) are bundled locally. Keep vendor/licenses/ with redistributed copies.
