// Normalise a Saudi mobile number to the 9665XXXXXXXX form wa.me expects; null if it is not one.
export function normaliseSaudiMobile(input: string): string | null {
  const digits = input.replace(/\D/g, "").replace(/^00/, "");
  const local = digits.replace(/^966/, "").replace(/^0/, "");
  return /^5\d{8}$/.test(local) ? `966${local}` : null;
}

export const waLink = (number: string, text: string) => `https://wa.me/${number}?text=${encodeURIComponent(text)}`;
