// Tells the CSS pipeline to use Tailwind so my class names become real styles (needed by app/globals.css).
const config = {
  plugins: {
    "@tailwindcss/postcss": {},
  },
};

export default config;
