// ============================================
// UniMart - Image optimization helper
// Cloudinary can resize/compress/reformat images
// on the fly via URL parameters — this avoids
// shipping huge original uploads to every device.
// ============================================

export function optimizeImage(url, width = 600) {
  if (!url || typeof url !== "string") return url;
  if (!url.includes("res.cloudinary.com") || !url.includes("/upload/")) return url;
  // f_auto: serve WebP/AVIF when the browser supports it
  // q_auto: Cloudinary picks the best quality/size tradeoff
  // w_<width>: never ship an image larger than the space it's shown in
  return url.replace("/upload/", `/upload/f_auto,q_auto,w_${width}/`);
}
