import { auth } from './lib/auth.mjs';

// The managed SDK validates the Google callback and installs its HttpOnly session.
// Only the account page needs this callback handling; downloads remain static.
export default function proxy(request) {
  return auth().middleware({ loginUrl: '/download', publicRoutes: ['/','/connect'] })(request);
}
export const config = { matcher: ['/','/connect'] };
