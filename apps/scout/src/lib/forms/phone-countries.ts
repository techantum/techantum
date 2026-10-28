export type PhoneCountry = {
  iso: string;
  name: string;
  dial: string;
  lengths: number[];
};

export const PHONE_COUNTRIES: PhoneCountry[] = [
  { iso: 'IN', name: 'India', dial: '91', lengths: [10] },
  { iso: 'US', name: 'United States', dial: '1', lengths: [10] },
  { iso: 'GB', name: 'United Kingdom', dial: '44', lengths: [10] },
  { iso: 'AE', name: 'United Arab Emirates', dial: '971', lengths: [9] },
  { iso: 'AU', name: 'Australia', dial: '61', lengths: [9] },
  { iso: 'SG', name: 'Singapore', dial: '65', lengths: [8] },
  { iso: 'CA', name: 'Canada', dial: '1', lengths: [10] },
  { iso: 'DE', name: 'Germany', dial: '49', lengths: [10, 11] },
  { iso: 'FR', name: 'France', dial: '33', lengths: [9] },
  { iso: 'IT', name: 'Italy', dial: '39', lengths: [9, 10] },
  { iso: 'ES', name: 'Spain', dial: '34', lengths: [9] },
  { iso: 'NL', name: 'Netherlands', dial: '31', lengths: [9] },
  { iso: 'SE', name: 'Sweden', dial: '46', lengths: [9] },
  { iso: 'NO', name: 'Norway', dial: '47', lengths: [8] },
  { iso: 'DK', name: 'Denmark', dial: '45', lengths: [8] },
  { iso: 'IE', name: 'Ireland', dial: '353', lengths: [9] },
  { iso: 'CH', name: 'Switzerland', dial: '41', lengths: [9] },
  { iso: 'AT', name: 'Austria', dial: '43', lengths: [10, 11] },
  { iso: 'BE', name: 'Belgium', dial: '32', lengths: [9] },
  { iso: 'PT', name: 'Portugal', dial: '351', lengths: [9] },
  { iso: 'PL', name: 'Poland', dial: '48', lengths: [9] },
  { iso: 'CZ', name: 'Czechia', dial: '420', lengths: [9] },
  { iso: 'ZA', name: 'South Africa', dial: '27', lengths: [9] },
  { iso: 'NG', name: 'Nigeria', dial: '234', lengths: [10] },
  { iso: 'KE', name: 'Kenya', dial: '254', lengths: [9] },
  { iso: 'EG', name: 'Egypt', dial: '20', lengths: [10] },
  { iso: 'SA', name: 'Saudi Arabia', dial: '966', lengths: [9] },
  { iso: 'QA', name: 'Qatar', dial: '974', lengths: [8] },
  { iso: 'KW', name: 'Kuwait', dial: '965', lengths: [8] },
  { iso: 'BH', name: 'Bahrain', dial: '973', lengths: [8] },
  { iso: 'OM', name: 'Oman', dial: '968', lengths: [8] },
  { iso: 'PK', name: 'Pakistan', dial: '92', lengths: [10] },
  { iso: 'BD', name: 'Bangladesh', dial: '880', lengths: [10] },
  { iso: 'LK', name: 'Sri Lanka', dial: '94', lengths: [9] },
  { iso: 'NP', name: 'Nepal', dial: '977', lengths: [10] },
  { iso: 'MY', name: 'Malaysia', dial: '60', lengths: [9, 10] },
  { iso: 'ID', name: 'Indonesia', dial: '62', lengths: [10, 11, 12] },
  { iso: 'TH', name: 'Thailand', dial: '66', lengths: [9] },
  { iso: 'PH', name: 'Philippines', dial: '63', lengths: [10] },
  { iso: 'VN', name: 'Vietnam', dial: '84', lengths: [9, 10] },
  { iso: 'JP', name: 'Japan', dial: '81', lengths: [10] },
  { iso: 'KR', name: 'South Korea', dial: '82', lengths: [9, 10] },
  { iso: 'CN', name: 'China', dial: '86', lengths: [11] },
  { iso: 'HK', name: 'Hong Kong', dial: '852', lengths: [8] },
  { iso: 'NZ', name: 'New Zealand', dial: '64', lengths: [8, 9, 10] },
  { iso: 'BR', name: 'Brazil', dial: '55', lengths: [10, 11] },
  { iso: 'MX', name: 'Mexico', dial: '52', lengths: [10] },
  { iso: 'AR', name: 'Argentina', dial: '54', lengths: [10] },
];

export function digitsOnly(value: string) {
  return value.replace(/\D/g, '');
}

export function countryByIso(iso: string) {
  return PHONE_COUNTRIES.find((item) => item.iso === iso) || PHONE_COUNTRIES[0];
}

export function parsePhone(value: string) {
  const raw = value.trim();
  const digits = digitsOnly(raw);
  const sorted = [...PHONE_COUNTRIES].sort((a, b) => b.dial.length - a.dial.length);
  for (const country of sorted) {
    if (digits.startsWith(country.dial)) {
      const national = digits.slice(country.dial.length);
      if (country.lengths.includes(national.length) || national.length > 0) {
        return { iso: country.iso, national };
      }
    }
  }
  if (raw.startsWith('+')) return { iso: 'IN', national: digits };
  return { iso: 'IN', national: digits };
}

export function formatPhone(iso: string, national: string) {
  const country = countryByIso(iso);
  const local = digitsOnly(national);
  if (!local) return '';
  return `+${country.dial} ${local}`;
}

export function phoneHref(iso: string, national: string) {
  const country = countryByIso(iso);
  const local = digitsOnly(national);
  if (!local) return '';
  return `+${country.dial}${local}`;
}

export function phoneError(iso: string, national: string, required = false) {
  const country = countryByIso(iso);
  const local = digitsOnly(national);
  if (!local) return required ? 'Enter phone number.' : '';
  if (!country.lengths.includes(local.length)) {
    const count = country.lengths.join(' or ');
    return `${country.name} numbers use ${count} digits after +${country.dial}.`;
  }
  return '';
}

export function phoneLengthHint(iso: string) {
  const country = countryByIso(iso);
  const count = country.lengths.join(' or ');
  return `${country.name} (+${country.dial}) uses ${count} digits.`;
}
