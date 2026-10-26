export interface GeoInfo {
  country: string;
  flag: string;
  region: string;
}

export function detectGeoFromTimezone(timezone: string | null | undefined, host?: string): GeoInfo {
  const tz = (timezone || '').trim().toLowerCase();
  const h = (host || '').toLowerCase();

  // 1. Domain TLD & Host heuristics
  if (h.endsWith('.es') || h.includes('.es:') || h.includes('.es/')) return { country: 'España', flag: '🇪🇸', region: 'Europa' };
  if (h.endsWith('.mx') || h.includes('.mx:') || h.includes('.mx/')) return { country: 'México', flag: '🇲🇽', region: 'Norteamérica / Latam' };
  if (h.endsWith('.ar') || h.includes('.ar:') || h.includes('.ar/')) return { country: 'Argentina', flag: '🇦🇷', region: 'Latinoamérica' };
  if (h.endsWith('.co') || h.includes('.co:') || h.includes('.co/')) return { country: 'Colombia', flag: '🇨🇴', region: 'Latinoamérica' };
  if (h.endsWith('.cl') || h.includes('.cl:') || h.includes('.cl/')) return { country: 'Chile', flag: '🇨🇱', region: 'Latinoamérica' };
  if (h.endsWith('.pe') || h.includes('.pe:') || h.includes('.pe/')) return { country: 'Perú', flag: '🇵🇪', region: 'Latinoamérica' };
  if (h.endsWith('.ve') || h.includes('.ve:') || h.includes('.ve/')) return { country: 'Venezuela', flag: '🇻🇪', region: 'Latinoamérica' };
  if (h.endsWith('.ec') || h.includes('.ec:') || h.includes('.ec/')) return { country: 'Ecuador', flag: '🇪🇨', region: 'Latinoamérica' };
  if (h.endsWith('.uy') || h.includes('.uy:') || h.includes('.uy/')) return { country: 'Uruguay', flag: '🇺🇾', region: 'Latinoamérica' };
  if (h.endsWith('.py') || h.includes('.py:') || h.includes('.py/')) return { country: 'Paraguay', flag: '🇵🇾', region: 'Latinoamérica' };
  if (h.endsWith('.bo') || h.includes('.bo:') || h.includes('.bo/')) return { country: 'Bolivia', flag: '🇧🇴', region: 'Latinoamérica' };
  if (h.endsWith('.do') || h.includes('.do:') || h.includes('.do/')) return { country: 'República Dominicana', flag: '🇩🇴', region: 'Caribe' };
  if (h.endsWith('.cr') || h.includes('.cr:') || h.includes('.cr/')) return { country: 'Costa Rica', flag: '🇨🇷', region: 'Centroamérica' };
  if (h.endsWith('.pa') || h.includes('.pa:') || h.includes('.pa/')) return { country: 'Panamá', flag: '🇵🇦', region: 'Centroamérica' };
  if (h.endsWith('.gt') || h.includes('.gt:') || h.includes('.gt/')) return { country: 'Guatemala', flag: '🇬🇹', region: 'Centroamérica' };
  if (h.endsWith('.hn') || h.includes('.hn:') || h.includes('.hn/')) return { country: 'Honduras', flag: '🇭🇳', region: 'Centroamérica' };
  if (h.endsWith('.sv') || h.includes('.sv:') || h.includes('.sv/')) return { country: 'El Salvador', flag: '🇸🇻', region: 'Centroamérica' };
  if (h.endsWith('.ni') || h.includes('.ni:') || h.includes('.ni/')) return { country: 'Nicaragua', flag: '🇳🇮', region: 'Centroamérica' };
  if (h.endsWith('.cu') || h.includes('.cu:') || h.includes('.cu/')) return { country: 'Cuba', flag: '🇨🇺', region: 'Caribe' };
  if (h.endsWith('.br') || h.includes('.br:') || h.includes('.br/')) return { country: 'Brasil', flag: '🇧🇷', region: 'Latinoamérica' };
  if (h.endsWith('.us') || h.includes('.us:') || h.includes('.us/')) return { country: 'Estados Unidos', flag: '🇺🇸', region: 'Norteamérica' };
  if (h.endsWith('.ca') || h.includes('.ca:') || h.includes('.ca/')) return { country: 'Canadá', flag: '🇨🇦', region: 'Norteamérica' };
  if (h.endsWith('.uk') || h.includes('.uk:') || h.includes('.uk/')) return { country: 'Reino Unido', flag: '🇬🇧', region: 'Europa' };
  if (h.endsWith('.fr') || h.includes('.fr:') || h.includes('.fr/')) return { country: 'Francia', flag: '🇫🇷', region: 'Europa' };
  if (h.endsWith('.de') || h.includes('.de:') || h.includes('.de/')) return { country: 'Alemania', flag: '🇩🇪', region: 'Europa' };
  if (h.endsWith('.it') || h.includes('.it:') || h.includes('.it/')) return { country: 'Italia', flag: '🇮🇹', region: 'Europa' };
  if (h.endsWith('.pt') || h.includes('.pt:') || h.includes('.pt/')) return { country: 'Portugal', flag: '🇵🇹', region: 'Europa' };
  if (h.endsWith('.nl') || h.includes('.nl:') || h.includes('.nl/')) return { country: 'Países Bajos', flag: '🇳🇱', region: 'Europa' };

  // 2. Comprehensive Timezone mapping
  // Spain
  if (tz.includes('madrid') || tz.includes('canary') || tz.includes('ceuta')) {
    return { country: 'España', flag: '🇪🇸', region: 'Europa' };
  }
  // Mexico
  if (tz.includes('mexico') || tz.includes('monterrey') || tz.includes('cancun') || tz.includes('tijuana') || tz.includes('chihuahua') || tz.includes('hermosillo') || tz.includes('merida')) {
    return { country: 'México', flag: '🇲🇽', region: 'Norteamérica / Latam' };
  }
  // Colombia
  if (tz.includes('bogota')) {
    return { country: 'Colombia', flag: '🇨🇴', region: 'Latinoamérica' };
  }
  // Argentina
  if (tz.includes('buenos_aires') || tz.includes('cordoba') || tz.includes('argentina') || tz.includes('mendoza') || tz.includes('rosario') || tz.includes('ushuaia')) {
    return { country: 'Argentina', flag: '🇦🇷', region: 'Latinoamérica' };
  }
  // Chile
  if (tz.includes('santiago') || tz.includes('punta_arenas') || tz.includes('easter')) {
    return { country: 'Chile', flag: '🇨🇱', region: 'Latinoamérica' };
  }
  // Peru
  if (tz.includes('lima')) {
    return { country: 'Perú', flag: '🇵🇪', region: 'Latinoamérica' };
  }
  // Venezuela
  if (tz.includes('caracas')) {
    return { country: 'Venezuela', flag: '🇻🇪', region: 'Latinoamérica' };
  }
  // Ecuador
  if (tz.includes('guayaquil') || tz.includes('galapagos')) {
    return { country: 'Ecuador', flag: '🇪🇨', region: 'Latinoamérica' };
  }
  // Uruguay
  if (tz.includes('montevideo')) {
    return { country: 'Uruguay', flag: '🇺🇾', region: 'Latinoamérica' };
  }
  // Paraguay
  if (tz.includes('asuncion')) {
    return { country: 'Paraguay', flag: '🇵🇾', region: 'Latinoamérica' };
  }
  // Bolivia
  if (tz.includes('la_paz')) {
    return { country: 'Bolivia', flag: '🇧🇴', region: 'Latinoamérica' };
  }
  // Dominican Republic
  if (tz.includes('santo_domingo')) {
    return { country: 'República Dominicana', flag: '🇩🇴', region: 'Caribe' };
  }
  // Costa Rica
  if (tz.includes('costa_rica')) {
    return { country: 'Costa Rica', flag: '🇨🇷', region: 'Centroamérica' };
  }
  // Panama
  if (tz.includes('panama')) {
    return { country: 'Panamá', flag: '🇵🇦', region: 'Centroamérica' };
  }
  // Guatemala
  if (tz.includes('guatemala')) {
    return { country: 'Guatemala', flag: '🇬🇹', region: 'Centroamérica' };
  }
  // Honduras
  if (tz.includes('tegucigalpa')) {
    return { country: 'Honduras', flag: '🇭🇳', region: 'Centroamérica' };
  }
  // El Salvador
  if (tz.includes('el_salvador')) {
    return { country: 'El Salvador', flag: '🇸🇻', region: 'Centroamérica' };
  }
  // Nicaragua
  if (tz.includes('managua')) {
    return { country: 'Nicaragua', flag: '🇳🇮', region: 'Centroamérica' };
  }
  // Cuba
  if (tz.includes('havana')) {
    return { country: 'Cuba', flag: '🇨🇺', region: 'Caribe' };
  }
  // Puerto Rico
  if (tz.includes('puerto_rico')) {
    return { country: 'Puerto Rico', flag: '🇵🇷', region: 'Caribe' };
  }
  // Brazil
  if (tz.includes('sao_paulo') || tz.includes('brazil') || tz.includes('manaus') || tz.includes('fortaleza') || tz.includes('recife') || tz.includes('belem')) {
    return { country: 'Brasil', flag: '🇧🇷', region: 'Latinoamérica' };
  }
  // USA
  if (tz.includes('new_york') || tz.includes('chicago') || tz.includes('los_angeles') || tz.includes('denver') || tz.includes('phoenix') || tz.includes('miami') || tz.includes('detroit') || tz.includes('indiana')) {
    return { country: 'Estados Unidos', flag: '🇺🇸', region: 'Norteamérica' };
  }
  // Canada
  if (tz.includes('toronto') || tz.includes('vancouver') || tz.includes('montreal') || tz.includes('edmonton') || tz.includes('winnipeg') || tz.includes('halifax')) {
    return { country: 'Canadá', flag: '🇨🇦', region: 'Norteamérica' };
  }
  // France
  if (tz.includes('paris')) {
    return { country: 'Francia', flag: '🇫🇷', region: 'Europa' };
  }
  // UK
  if (tz.includes('london')) {
    return { country: 'Reino Unido', flag: '🇬🇧', region: 'Europa' };
  }
  // Germany
  if (tz.includes('berlin') || tz.includes('frankfurt')) {
    return { country: 'Alemania', flag: '🇩🇪', region: 'Europa' };
  }
  // Italy
  if (tz.includes('rome')) {
    return { country: 'Italia', flag: '🇮🇹', region: 'Europa' };
  }
  // Netherlands
  if (tz.includes('amsterdam')) {
    return { country: 'Países Bajos', flag: '🇳🇱', region: 'Europa' };
  }
  // Portugal
  if (tz.includes('lisbon') || tz.includes('madeira') || tz.includes('azores')) {
    return { country: 'Portugal', flag: '🇵🇹', region: 'Europa' };
  }
  // Turkey
  if (tz.includes('istanbul')) {
    return { country: 'Turquía', flag: '🇹🇷', region: 'Europa / Asia' };
  }

  // 3. UTC / Global Server
  if (tz.includes('utc') || tz.includes('gmt') || tz === 'etc/utc' || tz === 'etc/gmt') {
    return { country: 'Servidor Global (UTC)', flag: '🌐', region: 'Cloud / Internacional' };
  }

  // 4. Timezone with continent/city format fallback
  if (timezone && timezone.includes('/')) {
    const parts = timezone.split('/');
    const continent = parts[0];
    const city = parts[1]?.replace(/_/g, ' ') || parts[0];
    let defaultFlag = '📍';
    if (continent.toLowerCase() === 'europe') defaultFlag = '🇪🇺';
    else if (continent.toLowerCase() === 'america') defaultFlag = '🌎';
    else if (continent.toLowerCase() === 'asia') defaultFlag = '🌏';
    else if (continent.toLowerCase() === 'africa') defaultFlag = '🌍';

    return {
      country: `${city} (${continent})`,
      flag: defaultFlag,
      region: continent,
    };
  }

  // 5. Default guarantee: ALWAYS provide flag and country
  return {
    country: timezone ? `Servidor (${timezone})` : 'Servidor Internacional',
    flag: '🌐',
    region: 'Internacional',
  };
}
