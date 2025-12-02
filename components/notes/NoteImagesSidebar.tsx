import Image from 'next/image';

const DUMMY_IMAGES = Array.from({ length: 20 }).map((_, i) => ({
  id: i,
  url: `https://picsum.photos/seed/${i + 100}/300/200`,
  alt: `Gallery Image ${i + 1}`
}));

export default function NoteImagesSidebar() {
  return (
    <aside className="h-full flex flex-col bg-white border-l border-gray-200">
      <div className="p-4 border-b border-gray-200">
        <h2 className="font-semibold text-zinc-900">Görseller</h2>
        <p className="text-sm text-zinc-500">Notlarınıza eklemek için sürükleyin</p>
      </div>
      
      <div className="flex-1 overflow-y-auto p-4">
        <div className="grid grid-cols-2 gap-3">
          {DUMMY_IMAGES.map((img) => (
            <div 
              key={img.id} 
              className="relative aspect-square group cursor-pointer overflow-hidden rounded-md border border-gray-100 hover:border-blue-500 transition-colors"
            >
              <Image
                src={img.url}
                alt={img.alt}
                fill
                sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                className="object-cover group-hover:scale-105 transition-transform duration-300"
              />
            </div>
          ))}
        </div>
      </div>
    </aside>
  );
}
