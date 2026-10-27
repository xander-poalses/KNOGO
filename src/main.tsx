import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import { App } from "./App";
import { PlacesProvider } from "./state/PlacesContext";
import { Notifications } from "./components/Notifications";
import "./styles/global.css";

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <BrowserRouter>
      <PlacesProvider>
        <App />
        <Notifications />
      </PlacesProvider>
    </BrowserRouter>
  </React.StrictMode>
);
