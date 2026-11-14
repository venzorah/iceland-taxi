# UI integration and media architecture

Integrated the incoming commits through `70f57aa` with the database-backed portal implementation. Recovery checkpoint: `44ad1f1`. A separate pre-merge file backup was also created outside the repository. Private `.env` was not staged or changed by the merge.

## Media decision

Keep Cloudinary for public image files and delivery. PostgreSQL stores image IDs, URLs, Cloudinary public IDs, names, MIME types, byte counts, descriptions and archive state. No image byte arrays are stored in application tables.

PostgreSQL supports binary storage through `bytea`, so serving files through an application endpoint is technically possible. It would require the application to retrieve and deliver the bytes and manage image transformations/caching separately. Cloudinary already supplies image URL delivery and CDN facilities, making the existing provider a better fit for these public website photos.

References: [PostgreSQL binary types](https://www.postgresql.org/docs/current/datatype-binary.html), [Cloudinary image delivery](https://cloudinary.com/documentation/image_delivery_options).

Upload path: administrator selects an image → authenticated, size-limited server upload → Cloudinary → URL/metadata saved in PostgreSQL → library picker/public page uses that URL. `/api/media/[id]` remains available as a redirect to a saved image URL.

## Integrated behavior

- Website content editor for public copy, FAQs, photos and logos, with persisted SiteBlock overrides. Saves refresh mounted pages and other open tabs through events/BroadcastChannel.
- Cloudinary-backed image library and picker for website content, service and destination images. Replacement updates saved site/service/destination/editorial references transactionally. Archive hides a picker item while retaining existing public links and Cloudinary assets. Physical asset deletion is deliberately not part of the archive action.
- Improved driver/vehicle cards, contact fields, vehicle categories/use cases and access controls. Verified Supabase Auth remains the only sign-in system; the incoming local-password hash/demo-cookie paths were not enabled. Driver emails/passwords stay under verified account management.
- Driver/vehicle archive actions retain users, assignments and booking history. Archiving a driver on an active journey is rejected.
- Existing role checks, customer empty states/ownership, driver state transitions, cancellation/refund safeguards, footer navigation and password visibility controls retained. Integration status describes configured credentials without claiming connectivity was tested.
- Module permissions apply to new content/library endpoints. Database faults are reported as errors rather than successful empty libraries. Uploads enforce the 5 MB limit before parsing multipart and validate format bytes/MIME.

## Database and verification

The additive `20261114000000_site_content_library` migration created only MediaAsset metadata and SiteBlock tables. Existing content tables were checked before applying it; existing application records were preserved.

Completed:

- 63 automated tests: the 60 existing tests plus three multipart/sign-out regression checks.
- TypeScript, lint and isolated production builds passed.
- Real Cloudinary upload and delivery, PostgreSQL metadata, image replacement/reference update, archiving and permissions passed using two tiny generated test images. Those images, test accounts and database fixtures were removed afterward.

Admin acceptance passed all five role matrices, protected writes, live fleet/catalogue creation, content publishing/reset, assignment overlap/stale/inactive checks, paid cancellation review and retained history. Browser checks passed Super Admin/Finance desktop/mobile layouts and menus, including the merged fleet, content editor and image library. A test-harness expression was corrected to return a boolean rather than a DOM object before the browser-only rerun; all temporary accounts and fixtures were removed. Payment/webhook live testing and email/phone delivery remain the separate deployment checks already agreed with the user. No production payment or outbound message was sent for this merge.

The UI merge is committed locally. Restart an already-running development server after this schema/client update so it loads the newly generated Prisma models. The earlier incoming-ui-review.md records the pre-integration findings; the adaptations above resolve those integration issues.
