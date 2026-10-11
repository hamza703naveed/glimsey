"use client";

import { useState } from "react";
import { createBrowserClient } from "@supabase/ssr";

const MAX_SIDE = 1600; // px; keeps a photo around 300 KB so listings load fast on mobile data

// Shrink a photo in the browser and re-encode it as JPEG.
async function resize(file: File): Promise<Blob> {
  const img = await createImageBitmap(file);
  const scale = Math.min(1, MAX_SIDE / Math.max(img.width, img.height));
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(img.width * scale);
  canvas.height = Math.round(img.height * scale);
  canvas.getContext("2d")!.drawImage(img, 0, 0, canvas.width, canvas.height);
  return new Promise((resolve, reject) => canvas.toBlob((b) => (b ? resolve(b) : reject(new Error("encode"))), "image/jpeg", 0.85));
}

// Uploads straight from the browser to Supabase storage (the server never receives the file,
// so Vercel's 4.5 MB request limit doesn't apply), then hands the links to the form.
export default function PhotoUploader({ userId, room }: { userId: string; room: number }) {
  const [urls, setUrls] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function onPick(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? []).slice(0, room - urls.length);
    e.target.value = "";
    if (!files.length) return;
    setBusy(true);
    setError("");
    const db = createBrowserClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!);
    const added: string[] = [];
    for (const file of files) {
      try {
        const path = `${userId}/${crypto.randomUUID()}.jpg`;
        const { error } = await db.storage.from("vendor-photos").upload(path, await resize(file), { contentType: "image/jpeg" });
        if (error) throw error;
        added.push(db.storage.from("vendor-photos").getPublicUrl(path).data.publicUrl);
      } catch {
        setError("تعذر رفع بعض الصور. جرّب صوراً بصيغة JPG أو PNG.");
      }
    }
    setUrls((u) => [...u, ...added]);
    setBusy(false);
  }

  return (
    <div className="grid gap-2">
      <label>إضافة صور لأعمالك (يمكنك إضافة {room - urls.length} صور أخرى)
        <input className="input" type="file" accept="image/*" multiple onChange={onPick} disabled={busy || urls.length >= room} />
      </label>
      {urls.length > 0 && (
        <div className="grid grid-cols-3 gap-2">
          {urls.map((u) => <img key={u} src={u} alt="" className="aspect-square w-full rounded-lg object-cover" />)}
        </div>
      )}
      {urls.map((u) => <input key={u} type="hidden" name="new_photo" value={u} />)}
      {busy && <p className="text-sm text-stone-600">جارٍ رفع الصور...</p>}
      {error && <p className="text-sm text-red-700">{error}</p>}
      <button className="btn w-fit" disabled={busy}>حفظ</button>
    </div>
  );
}
