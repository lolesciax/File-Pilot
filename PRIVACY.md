# FilePilot — Privacy notice

Last updated: 25 October 2026

Your documents are processed in your browser. FilePilot does not upload your selected files to a conversion server.

## 1. Your files and processing

FilePilot is a file and document toolkit maintained through the lolesciax/File-Pilot GitHub project. PDF, Office, image and batch operations run on your device using browser APIs and locally loaded processing libraries.

Selected file contents, filenames, previews, extracted text and generated results are used within the active browser session to perform the operation you choose. The application does not send that material to the project maintainer, an AI service or an external conversion API, and does not keep a hosted document database. No account is required.

## 2. Browser storage and retention

Active files, results and tool options are held in browser memory. Completed results remain available when you change tools. Clear workspace removes the active file and result references; refreshing or closing the tab ends the active workspace. The browser controls when memory and temporary resources are reclaimed. This is not a secure-erasure guarantee.

FilePilot stores your theme choice under the localStorage key filepilot-theme on this device. It remains until you change it or remove this site's browser storage. Original documents, generated file blobs and processing history are not saved to localStorage or IndexedDB by the application.

Your browser may cache application code, fonts and other website assets. Files you download are saved through your browser and remain wherever you save them until you delete them yourself. Clearing the workspace does not delete original files or downloaded copies from your device.

## 3. Website requests and hosting

Your browser needs to request the website's code, fonts, processing workers and supporting assets. These assets are bundled with the application; Office conversion does not download remote fonts or send documents to a third-party service.

Vercel is the planned hosting provider; this project has not yet been deployed. When you visit a hosted instance, its hosting infrastructure can receive connection and request information, such as your IP address, browser/request headers, requested URL and request time, to deliver and protect the website. This is separate from the files processed locally in your browser.

Hosting logs, security features, retention and processing locations depend on the deployed provider and configuration. FilePilot does not promise a specific hosting-log retention period. See Vercel's privacy notice for its own practices; confirm the provider shown here when using a different deployment.

[Vercel privacy notice](https://vercel.com/legal/privacy-notice)

## 4. Cookies, analytics and advertising

The FilePilot application does not set cookies and does not include advertising, analytics, session replay or marketing trackers. It uses localStorage for the theme preference described above. Hosting-level security or access features can have their own behavior depending on deployment configuration.

## 5. Your choices

Choose which files to open, remove selected files, cancel supported processing jobs, or clear the workspace when finished. Download any results you want to keep before clearing or closing the session.

You can change the theme in Settings and remove the saved preference or cached site assets through your browser's site-data controls. Manage or delete downloaded files using your browser or operating system. Your browser, extensions, device settings and any storage-sync services you use are outside FilePilot's control.

## 6. Questions and external links

For privacy questions or requests, contact the project maintainer through the FilePilot GitHub repository. Information you voluntarily submit to GitHub is handled by GitHub and may be visible to other people. Do not attach confidential documents, passwords or personal information to public issues or discussions.

Following an external link takes you to another service with its own privacy practices. Local processing does not prevent you from sharing a file yourself or saving a download to a cloud-synced folder.

[FilePilot GitHub repository](https://github.com/lolesciax/File-Pilot)

## 7. Changes to this notice

This notice describes the current application. If FilePilot adds accounts, uploads, analytics, cloud processing or other new data uses, the notice should be updated before those features are introduced. The date above identifies the latest revision.
