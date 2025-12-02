/**
 * HTML etiketlerini ve entity'leri temizleyerek düz metin döndürür
 */
export function stripHtml(html: string): string {
  if (!html) return '';

  // HTML etiketlerini kaldır
  let text = html.replace(/<[^>]*>/g, '');

  // HTML entity'leri decode et (örn: &nbsp; → boşluk)
  text = text
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'");

  // Çoklu boşlukları ve satır başlarını temizle
  text = text.replace(/\s+/g, ' ').trim();

  return text;
}

/**
 * Metni belirtilen karakterde keser ve sonuna '...' ekler
 */
export function truncateText(text: string, maxLength: number = 150): string {
  if (!text || text.length <= maxLength) return text;

  // Kelimenin ortasında kesmeyi önlemek için en yakın boşluğa geri dön
  let truncated = text.substring(0, maxLength);
  const lastSpace = truncated.lastIndexOf(' ');

  if (lastSpace > 0) {
    truncated = truncated.substring(0, lastSpace);
  }

  return truncated + '...';
}

/**
 * HTML içeriğinden ilk satırı başlık olarak çıkarır
 */
export function extractTitleFromHtml(html: string): string {
  if (!html) return '(Başlıksız)';

  const plainText = stripHtml(html);

  // İlk satırı veya ilk 50 karakteri başlık yap
  const firstLine = plainText.split('\n')[0] || plainText;
  return truncateText(firstLine, 50);
}
