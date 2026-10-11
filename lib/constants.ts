export const CITIES = ["الرياض", "جدة", "الدمام / الخبر", "مكة المكرمة", "المدينة المنورة", "أخرى"];

export const EVENT_TYPES = ["زفاف", "خطوبة", "عيد ميلاد", "استقبال مولود", "تخرج", "جلسة تصوير", "فعالية شركات", "أخرى"];

// A request stops taking bids when closed or past expires_at (the database enforces the same rule).
export const isOpen = (r: { status: string; expires_at: string }) => r.status === "open" && new Date(r.expires_at) > new Date();

export const PRICE_TIERS: Record<string, string> = { budget: "اقتصادي", mid: "متوسط", premium: "مميز", luxury: "فاخر" };

// Only same-site paths are allowed as a post-login destination ("//x" and "/\x" are other sites to a browser).
export const safePath = (next: string | null | undefined) => (next && /^\/(?![/\\])/.test(next) ? next : "/");
