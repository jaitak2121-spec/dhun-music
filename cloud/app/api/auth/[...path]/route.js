import { auth } from '../../../../lib/auth.mjs';
import { originCheck, limit, respond, jsonBody } from '../../../../lib/http.mjs';
import { ApiError } from '../../../../lib/domain.mjs';

async function handler(request, context) {
  const { path } = await context.params;
  const endpoint = path.join('/');
  const allowed = new Set(['get-session','sign-up/email','sign-in/email','sign-out','email-otp/send-verification-otp','email-otp/verify-email','email-otp/reset-password']);
  if (!allowed.has(endpoint)) return Response.json({ error: 'This sign-in method is not enabled for Dhun.' }, { status: 404 });
  if (request.method !== 'GET') {
    let rejection;
    const checked = await respond(async () => {
      originCheck(request);
      await limit(request, 'authentication', 30);
      if (endpoint === 'sign-up/email') {
        const body = await jsonBody(request.clone());
        if (body.dhunConsent !== true) throw new ApiError(400, 'Read and accept the account privacy notice before creating an account.');
      }
      rejection = false;
      return {};
    });
    if (rejection !== false) return checked;
  }
  return auth().handler()[request.method](request, context);
}
export const GET = handler;
export const POST = handler;
export const PUT = handler;
export const PATCH = handler;
export const DELETE = handler;
