"use server";

import { S3Client, PutObjectCommand, ListBucketsCommand } from "@aws-sdk/client-s3";

export async function uploadFile(formData: FormData) {
  let R2_ENDPOINT = process.env.R2_ENDPOINT;
  const R2_BUCKET_NAME = process.env.R2_BUCKET_NAME;
  const R2_ACCESS_KEY_ID = process.env.R2_ACCESS_KEY_ID;
  const R2_SECRET_ACCESS_KEY = process.env.R2_SECRET_ACCESS_KEY;
  const R2_PUBLIC_URL = process.env.R2_PUBLIC_URL;

  // 1. Konfigürasyon Kontrolü
  if (!R2_ENDPOINT || !R2_ACCESS_KEY_ID || !R2_SECRET_ACCESS_KEY || !R2_BUCKET_NAME) {
    console.error("❌ Depolama ayarları eksik (.env)");
    return { success: false, error: "Sunucu tarafında depolama ayarları eksik." };
  }

  // Endpoint Temizliği
  if (R2_ENDPOINT.endsWith('/')) R2_ENDPOINT = R2_ENDPOINT.slice(0, -1);
  // Eğer endpoint bucket ismini içeriyorsa temizle (bazı S3 sağlayıcıları için)
  if (R2_ENDPOINT.endsWith(`/${R2_BUCKET_NAME}`)) {
    R2_ENDPOINT = R2_ENDPOINT.substring(0, R2_ENDPOINT.lastIndexOf(`/${R2_BUCKET_NAME}`));
  }

  // S3 Client Başlatma
  const s3 = new S3Client({
    region: "auto", // Cloudflare R2 için 'auto' önerilir, bazıları us-east-1 ister.
    endpoint: R2_ENDPOINT,
    credentials: {
      accessKeyId: R2_ACCESS_KEY_ID,
      secretAccessKey: R2_SECRET_ACCESS_KEY,
    },
    forcePathStyle: true, // MinIO veya bazı S3 uyumlu servisler için gerekli olabilir
  });

  try {
    const file = formData.get("file") as File;
    
    if (!file) {
      return { success: false, error: "Dosya bulunamadı." };
    }

    if (file.size > 10 * 1024 * 1024) { // 10MB Limit
      return { success: false, error: "Dosya boyutu 10MB'dan büyük olamaz." };
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const fileExt = file.name.split(".").pop();
    const uniqueId = `${Date.now()}-${Math.random().toString(36).substring(7)}`;
    const finalFileName = `notes/${uniqueId}.${fileExt}`;

    const command = new PutObjectCommand({
      Bucket: R2_BUCKET_NAME,
      Key: finalFileName,
      Body: buffer,
      ContentType: file.type,
    });

    await s3.send(command);

    const publicUrl = R2_PUBLIC_URL 
      ? `${R2_PUBLIC_URL}/${finalFileName}` 
      : `${R2_ENDPOINT}/${R2_BUCKET_NAME}/${finalFileName}`;

    return { success: true, url: publicUrl };

  } catch (error: any) {
    console.error("❌ R2 Yükleme Hatası:", error);
    
    // Hata detayı döndür (Geliştirme ortamı için faydalı olabilir)
    return { 
      success: false, 
      error: error.message || "Dosya yüklenirken bilinmeyen bir hata oluştu." 
    };
  }
}