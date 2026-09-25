import type { Content } from "./schema";
import { promotionActive } from "./rules";
export function publicContent(content: Content): Content {
  return {
    ...content,
    partners: content.partners
      .filter(
        (p) =>
          p.active && (content.allowDining || p.category !== "Dónde comer"),
      )
      .map((p) => ({ ...p, buttons: p.buttons.filter((b) => b.active) })),
    buttons: content.buttons.filter((b) => b.active),
    categories: content.categories.filter((c) => c.active),
    products: content.products.filter(
      (p) =>
        content.categories.some((c) => c.active && c.id === p.categoryId) &&
        (!content.hideSoldOut || p.available),
    ),
    promotion: promotionActive(content.promotion) ? content.promotion : null,
  };
}
