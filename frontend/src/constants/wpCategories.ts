export interface WpTeamCategory {
  label: string;
  slug: string;
}

export interface WpServiceCategory {
  label: string;
  slug: string;
  teams: WpTeamCategory[];
}

export const WP_SERVICE_CATEGORIES: WpServiceCategory[] = [
  {
    label: 'Гипсокартон',
    slug: 'gipsokarton',
    teams: [
      { label: 'Brigada Aleksandra H', slug: 'brigada-aleksandra-h' },
      { label: 'Brigada Aleksandra N', slug: 'brigada-aleksandra-n' },
      { label: 'Brigada Alekseya', slug: 'brigada-alekseya' },
      { label: 'Brigada Dmitriya', slug: 'brigada-dmitriya' },
      { label: 'Brigada Kirilla', slug: 'brigada-kirilla' },
      { label: 'Brigada Pavla', slug: 'brigada-pavla' },
      { label: 'Brigada Seregi', slug: 'brigada-seregi' },
    ],
  },
  {
    label: 'Лепнина',
    slug: 'lepnina',
    teams: [
      { label: 'Brigada Eduarda', slug: 'brigada-eduarda' },
      { label: 'Proizvodstvo Lepniny', slug: 'proizvodstvo-lepniny' },
    ],
  },
  {
    label: 'Декоративная штукатурка',
    slug: 'dekorativnaya-shtukaturka',
    teams: [
      { label: 'Brigada Evgeniya', slug: 'brigada-evgeniya' },
      { label: 'Brigada Mihaila', slug: 'brigada-mihaila' },
    ],
  },
  {
    label: 'Малярка',
    slug: 'malyarka',
    teams: [{ label: 'Brigada Ruslana', slug: 'brigada-ruslana' }],
  },
  {
    label: 'Zvukoizolyaciya',
    slug: 'zvukoizolyaciya',
    teams: [
      { label: 'Brigada Konstantina', slug: 'brigada-konstantina' },
      { label: 'Brigada Nikity', slug: 'brigada-nikity' },
    ],
  },
];

