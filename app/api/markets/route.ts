import { NextResponse } from 'next/server';
import { XMLParser } from 'fast-xml-parser';

interface MarketItem {
  code: string;
  name: string;
  buying: number;
  selling: number;
  change: number;
}

interface CryptoItem {
  code: string;
  name: string;
  priceUSD: number;
  priceTRY: number;
  change: number;
}

// Altınkaynak kod eşleştirmesi
const altinkaynakCodeMap: Record<string, { code: string; name: string }> = {
  'C': { code: 'C', name: 'Çeyrek Altın' },
  'EC': { code: 'C', name: 'Çeyrek Altın' }, // Eski Çeyrek
  'Y': { code: 'Y', name: 'Yarım Altın' },
  'EY': { code: 'Y', name: 'Yarım Altın' }, // Eski Yarım
  'T': { code: 'T', name: 'Tam Altın' },
  'ET': { code: 'T', name: 'Tam Altın' }, // Eski Teklik
  'A': { code: 'A', name: 'Ata Altın' },
  'A_T': { code: 'A', name: 'Ata Altın' },
  'R': { code: 'R', name: 'Reşat Altın' },
  'H': { code: 'H', name: 'Hamit Altın' },
  'GAT': { code: 'GA', name: 'Gram Altın' },
  'HH_T': { code: 'HAS', name: 'Has Altın' },
  'CH_T': { code: 'KULCE', name: 'Külçe Altın' },
  'B': { code: '22A', name: '22 Ayar Bilezik' },
  'AG_T': { code: 'GUMUS', name: 'Gümüş' },
  '18': { code: '18A', name: '18 Ayar Altın' },
  '14': { code: '14A', name: '14 Ayar Altın' },
  'G': { code: 'GREMSE', name: 'Gremse Altın' },
  'A5': { code: 'A5', name: 'Ata Beşli' },
};

// Altınkaynak SOAP API'den altın verilerini çek
async function fetchFromAltinkaynak(): Promise<MarketItem[]> {
  const golds: MarketItem[] = [];

  const SOAP_ENVELOPE = `<?xml version="1.0" encoding="utf-8"?>
<soap:Envelope xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xmlns:xsd="http://www.w3.org/2001/XMLSchema" xmlns:soap="http://schemas.xmlsoap.org/soap/envelope/">
  <soap:Header>
    <AuthHeader xmlns="http://data.altinkaynak.com/">
      <Username>AltinkaynakWebServis</Username>
      <Password>AltinkaynakWebServis</Password>
    </AuthHeader>
  </soap:Header>
  <soap:Body>
    <GetGold xmlns="http://data.altinkaynak.com/" />
  </soap:Body>
</soap:Envelope>`;

  try {
    const response = await fetch('http://data.altinkaynak.com/DataService.asmx', {
      method: 'POST',
      headers: {
        'Content-Type': 'text/xml; charset=utf-8',
        'SOAPAction': 'http://data.altinkaynak.com/GetGold',
      },
      body: SOAP_ENVELOPE,
      next: { revalidate: 60 },
    });

    if (!response.ok) {
      throw new Error(`SOAP request failed: ${response.status}`);
    }

    const xmlText = await response.text();
    
    // XML'i parse et
    const parser = new XMLParser({
      ignoreAttributes: false,
      removeNSPrefix: true,
    });
    
    const jsonResult = parser.parse(xmlText);
    
    // SOAP yanıtından veriyi çıkar
    const envelope = jsonResult['Envelope'] || jsonResult['soap:Envelope'];
    const body = envelope?.['Body'] || envelope?.['soap:Body'];
    const getGoldResponse = body?.['GetGoldResponse'];
    const getGoldResult = getGoldResponse?.['GetGoldResult'];
    
    if (getGoldResult) {
      // İç XML'i decode et ve parse et
      const innerXml = getGoldResult
        .replace(/&lt;/g, '<')
        .replace(/&gt;/g, '>')
        .replace(/&amp;/g, '&')
        .replace(/&quot;/g, '"');
      
      const innerResult = parser.parse(innerXml);
      const kurlar = innerResult?.Kurlar?.Kur;
      
      if (kurlar && Array.isArray(kurlar)) {
        kurlar.forEach((kur: any) => {
          const kod = kur.Kod;
          const mapping = altinkaynakCodeMap[kod];
          
          if (mapping) {
            // Aynı kodla zaten eklenmiş mi kontrol et (örn: C ve EC ikisi de Çeyrek)
            const existingIndex = golds.findIndex(g => g.code === mapping.code);
            
            const item: MarketItem = {
              code: mapping.code,
              name: mapping.name,
              buying: parseFloat(kur.Alis) || 0,
              selling: parseFloat(kur.Satis) || 0,
              change: 0, // Altınkaynak değişim vermez, sonra hesaplanabilir
            };
            
            // Perakende fiyatlar tercih edilir (C, Y, T vs. - EC, EY, ET değil)
            if (existingIndex === -1) {
              golds.push(item);
            } else if (!kod.startsWith('E')) {
              // Eski olmayan (perakende) fiyatı tercih et
              golds[existingIndex] = item;
            }
          }
        });
      }
    }
  } catch (error) {
    console.error('Altinkaynak API Error:', error);
  }

  return golds;
}

// Binance Ticker Interface
interface BinanceTicker {
  symbol: string;
  lastPrice: string;
  priceChangePercent: string;
}

const cryptoNames: Record<string, string> = {
  BTC: 'Bitcoin',
  ETH: 'Ethereum',
  SOL: 'Solana',
  AVAX: 'Avalanche',
  LINK: 'Chainlink',
  DOT: 'Polkadot',
  ADA: 'Cardano',
  XRP: 'Ripple',
  DOGE: 'Dogecoin',
  SHIB: 'Shiba Inu',
  UNI: 'Uniswap',
  LTC: 'Litecoin',
  BNB: 'BNB',
  MATIC: 'Polygon',
  TRX: 'Tron',
};

// Binance API'den kripto verilerini çek
async function fetchFromBinance(): Promise<CryptoItem[]> {
  const cryptos: CryptoItem[] = [];
  try {
    const response = await fetch('https://api.binance.com/api/v3/ticker/24hr', {
      next: { revalidate: 30 }, // 30 saniye cache
    });

    if (!response.ok) {
      throw new Error(`Binance API error: ${response.status}`);
    }

    const tickers = (await response.json()) as BinanceTicker[];

    // USDT/TRY kurunu bul (veya fallback kullan)
    const usdtTryTicker = tickers.find(t => t.symbol === 'USDTTRY');
    const usdtTryPrice = usdtTryTicker ? parseFloat(usdtTryTicker.lastPrice) : 34.0; // Fallback

    const targetSymbols = Object.keys(cryptoNames);

    targetSymbols.forEach(code => {
      // BTCUSDT, ETHUSDT formatında ara
      const symbol = `${code}USDT`;
      const ticker = tickers.find(t => t.symbol === symbol);

      if (ticker) {
        const priceUSD = parseFloat(ticker.lastPrice);
        const priceTRY = priceUSD * usdtTryPrice;
        const change = parseFloat(ticker.priceChangePercent);

        cryptos.push({
          code,
          name: cryptoNames[code],
          priceUSD,
          priceTRY,
          change,
        });
      }
    });

  } catch (error) {
    console.error('Binance API Error:', error);
  }
  return cryptos;
}

// Truncgil API'den sadece döviz verilerini çek
async function fetchFromTruncgil(): Promise<MarketItem[]> {
  const currencies: MarketItem[] = [];

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000); // 5 saniye timeout

    const response = await fetch('https://finans.truncgil.com/v4/today.json', {
      next: { revalidate: 60 },
      headers: { 
        'Accept': 'application/json',
        'User-Agent': 'Mozilla/5.0 (compatible; KeeperWeb/1.0; +https://keeper-web.vercel.app)'
      },
      signal: controller.signal
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      throw new Error(`API request failed: ${response.status}`);
    }

    const data = await response.json();

    // Dövizler
    if (data['USD']) {
      currencies.push({
        code: 'USD',
        name: 'Amerikan Doları',
        buying: parseFloat(data['USD'].Buying) || 0,
        selling: parseFloat(data['USD'].Selling) || 0,
        change: parseFloat(data['USD'].Change) || 0,
      });
    }

    if (data['EUR']) {
      currencies.push({
        code: 'EUR',
        name: 'Euro',
        buying: parseFloat(data['EUR'].Buying) || 0,
        selling: parseFloat(data['EUR'].Selling) || 0,
        change: parseFloat(data['EUR'].Change) || 0,
      });
    }

    if (data['GBP']) {
      currencies.push({
        code: 'GBP',
        name: 'İngiliz Sterlini',
        buying: parseFloat(data['GBP'].Buying) || 0,
        selling: parseFloat(data['GBP'].Selling) || 0,
        change: parseFloat(data['GBP'].Change) || 0,
      });
    }

    if (data['CHF']) {
      currencies.push({
        code: 'CHF',
        name: 'İsviçre Frangı',
        buying: parseFloat(data['CHF'].Buying) || 0,
        selling: parseFloat(data['CHF'].Selling) || 0,
        change: parseFloat(data['CHF'].Change) || 0,
      });
    }

  } catch (error: any) {
    // Soket hatalarını ve timeout'ları loglarken daha temiz ol
    if (error.cause?.code === 'UND_ERR_SOCKET' || error.name === 'AbortError') {
      console.warn('Truncgil API connection issue (using fallback):', error.message);
    } else {
      console.error('Truncgil API Error:', error);
    }
  }

  return currencies;
}

export async function GET() {
  try {
    // Paralel olarak tüm API'lerden veri çek
    const [altinkaynakGolds, truncgilCurrencies, binanceCryptos] = await Promise.all([
      fetchFromAltinkaynak(),
      fetchFromTruncgil(),
      fetchFromBinance(),
    ]);

    const currencies = truncgilCurrencies;
    const cryptos = binanceCryptos;
    const golds = altinkaynakGolds;

    // Veri kontrolü
    if (currencies.length === 0 && golds.length === 0 && cryptos.length === 0) {
      throw new Error('No data from APIs');
    }

    return NextResponse.json({
      success: true,
      data: {
        currencies,
        golds,
        cryptos,
        timestamp: new Date().toISOString(),
        source: 'altinkaynak+truncgil+binance',
      },
    });

  } catch (error) {
    console.error('Markets API Error:', error);
    
    // Fallback data
    return NextResponse.json({
      success: true,
      data: {
        currencies: [
          { code: 'USD', name: 'Amerikan Doları', buying: 42.49, selling: 42.50, change: 0.16 },
          { code: 'EUR', name: 'Euro', buying: 49.31, selling: 49.34, change: 0.05 },
          { code: 'GBP', name: 'İngiliz Sterlini', buying: 56.28, selling: 56.38, change: 0.06 }
        ],
        golds: [
          { code: 'GA', name: 'Gram Altın', buying: 5780, selling: 5888, change: 0 },
          { code: 'C', name: 'Çeyrek Altın', buying: 9340, selling: 9690, change: 0 },
          { code: 'Y', name: 'Yarım Altın', buying: 18678, selling: 19380, change: 0 },
          { code: 'T', name: 'Tam Altın', buying: 37525, selling: 38760, change: 0 },
          { code: 'A', name: 'Ata Altın', buying: 38655, selling: 40280, change: 0 },
          { code: 'R', name: 'Reşat Altın', buying: 38125, selling: 40280, change: 0 }
        ],
        cryptos: [
          { code: 'BTC', name: 'Bitcoin', priceUSD: 94989, priceTRY: 4028211, change: -1.16 },
          { code: 'ETH', name: 'Ethereum', priceUSD: 3183, priceTRY: 134988, change: -0.82 }
        ],
        timestamp: new Date().toISOString(),
        source: 'fallback',
      },
    });
  }
}
