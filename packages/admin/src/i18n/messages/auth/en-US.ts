const authEnUS = {
  login: {
    metaTitle: "Sign in",
    badge: "Admin Sign In",
    title: "Sign in to Gyosei OS",
    subtitle:
      "Use your admin account to continue to the workspace, customers, cases, and document center.",
    helperTitle: "After signing in you can continue with",
    helperItems: {
      workspace:
        "A single dashboard for today's tasks, overdue items, and risks",
      customers: "Ongoing follow-up for customers, leads, and cases",
      documents: "Document center and billing-related pages",
    },
    formTitle: "Admin login",
    formDescription:
      "Enter your email and password to continue to the admin app.",
    emailLabel: "Email",
    emailPlaceholder: "name{'@'}firm.jp",
    passwordLabel: "Password",
    passwordPlaceholder: "Enter your password",
    submit: "Sign in",
    validation: "Enter both email and password",
    invalidCredentials: "Incorrect email or password.",
    serviceUnavailable:
      "The server dependencies are unavailable (for example PostgreSQL not running). Start Docker and run local dev (`npm run local:dev`), then try again.",
    requestFailed: "Sign-in failed. Please try again shortly.",
    sessionExpiredNotice: "Your session has expired. Please sign in again.",
    loggedOutNotice: "You have been signed out successfully.",
    demoHint: "Use an active admin account to sign in.",
  },
} as const;

export default authEnUS;
