import {
  BookOpen,
  CalendarDays,
  MapPin,
  ArrowUpRight,
  Instagram,
  Facebook,
  Phone,
  Star,
  Link as LinkIcon,
  MessageCircle,
} from "lucide-react";
import type { LinkButton } from "../../shared/schema";
import { track } from "./api";
const icons = {
  book: BookOpen,
  calendar: CalendarDays,
  map: MapPin,
  instagram: Instagram,
  facebook: Facebook,
  phone: Phone,
  star: Star,
  link: LinkIcon,
  whatsapp: MessageCircle,
};
export function LinkButtons({
  buttons,
  owner = "mary",
}: {
  buttons: LinkButton[];
  owner?: string;
}) {
  return (
    <div className="link-buttons">
      {buttons
        .filter((b) => b.active)
        .sort((a, b) => a.order - b.order)
        .map((b) => {
          const Icon = icons[b.icon];
          return (
            <a
              key={b.id}
              className={`link-button ${b.style}`}
              href={b.url}
              onClick={() => track("button_click", `${owner}__${b.id}`)}
              {...(b.url.startsWith("https:")
                ? { target: "_blank", rel: "noopener noreferrer" }
                : {})}
            >
              <Icon size={20} />
              <span>{b.text}</span>
              <ArrowUpRight size={19} />
            </a>
          );
        })}
    </div>
  );
}
export function ErrorNotice({ message }: { message: string }) {
  return message ? (
    <p className="notice error" role="alert">
      {message}
    </p>
  ) : null;
}
export function Empty({ children }: { children: React.ReactNode }) {
  return <div className="empty">{children}</div>;
}
export const money = (value: number) =>
  new Intl.NumberFormat("es-CL", {
    style: "currency",
    currency: "CLP",
    maximumFractionDigits: 0,
  }).format(value);
