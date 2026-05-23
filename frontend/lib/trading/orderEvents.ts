export const ORDER_PLACED_EVENT = "quantdesk:order-placed";

export function notifyOrderPlaced() {
  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent(ORDER_PLACED_EVENT));
  }
}

export function subscribeOrderPlaced(handler: () => void) {
  if (typeof window === "undefined") return () => {};
  window.addEventListener(ORDER_PLACED_EVENT, handler);
  return () => window.removeEventListener(ORDER_PLACED_EVENT, handler);
}
