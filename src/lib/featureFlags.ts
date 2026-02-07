export const FLAGS = {
  PAYPAL_ENABLED: (process.env.PAYPAL_ENABLED ?? "true") === "true",
  CARD_ENABLED: (process.env.CARD_ENABLED ?? "false") === "true"
};
