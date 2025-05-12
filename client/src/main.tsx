import { createRoot } from "react-dom/client";
import App from "./App";
import { ThemeProvider } from "./providers/theme-provider";
import "./index.css";

createRoot(document.getElementById("root")!).render(
  <ThemeProvider defaultTheme="light" storageKey="contactsync-theme">
    <App />
  </ThemeProvider>
);
