import { createContext } from "react";

export const StorageContext = createContext({
  enabled: false,
  message: "Comprobando disponibilidad para subir imágenes…",
});
