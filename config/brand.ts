/**
 * Product branding. Change the name here and it updates the browser title,
 * login screens, sidebar, emails, PDFs and the AI request header.
 *
 * The clinic's own name and logo are not set here: each clinic sets those at
 * sign-up and in Settings → Clinic, and they show in the sidebar.
 */
export const BRAND = {
  /** Used in sentences: "Sign in to your Shiv Solutions account". */
  name: 'Shiv Solutions',
  /** Display wordmark on the login and sign-up screens. */
  wordmark: 'SHIV SOLUTIONS',
  /** Single-letter mark used where there is no room for the name. */
  initial: 'S',
  /** What the product is, for page titles and the app manifest. */
  tagline: 'Dental Clinic Management',
  version: 'v1.0',
} as const
