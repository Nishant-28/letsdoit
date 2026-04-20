/**
 * Convex auth configuration for WorkOS AuthKit.
 *
 * The access token AuthKit issues has:
 *   iss: https://api.workos.com/user_management/<CLIENT_ID>
 *   aud: <CLIENT_ID>
 *
 * Both are derived from the client id. `WORKOS_CLIENT_ID` must be set in
 * the Convex deployment env (dashboard -> Settings -> Environment Variables
 * or `bunx convex env set WORKOS_CLIENT_ID ...`).
 */
const clientId = process.env.WORKOS_CLIENT_ID ?? "";

export default {
  providers: [
    {
      domain: `https://api.workos.com/user_management/${clientId}`,
      applicationID: clientId,
    },
  ],
};
