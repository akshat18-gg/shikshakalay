"use client";

/** The layout itself crashed, so no providers or fonts: plain English + Hindi, the reference, a link home. */
export default function GlobalError({ error }: { error: Error & { digest?: string } }) {
  return (
    <html lang="en">
      <body style={{ fontFamily: "system-ui, sans-serif", padding: 24, color: "#1b2833" }}>
        <h1 style={{ color: "#0b2850" }}>Something went wrong · कुछ गड़बड़ हो गई</h1>
        <p>Please try again. · कृपया फिर से कोशिश करें।</p>
        {error.digest && <p style={{ color: "#4a5a66" }}>Reference: {error.digest}</p>}
        {/* eslint-disable-next-line @next/next/no-html-link-for-pages -- the layout crashed: a full page load is the safe way home */}
        <a href="/" style={{ color: "#0b2850", fontWeight: 600 }}>
          Home · होम
        </a>
      </body>
    </html>
  );
}
