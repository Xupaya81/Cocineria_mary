import { useEffect, useState } from "react";
import type { SessionUser } from "../../../shared/schema";
import { api } from "../api";
export function AccountLink({ preview = false }: { preview?: boolean }) {
  const [signedIn, setSignedIn] = useState(false);
  useEffect(() => {
    if (preview) return;
    let active = true;
    api<SessionUser>("/auth/me")
      .then(() => {
        if (active) setSignedIn(true);
      })
      .catch(() => {});
    return () => {
      active = false;
    };
  }, [preview]);
  return <a className="account-link" href="/cuenta">{signedIn ? "Mi cuenta" : "Iniciar sesión"}</a>;
}
