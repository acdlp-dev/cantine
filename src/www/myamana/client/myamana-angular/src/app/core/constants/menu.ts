import { MenuItem } from '../models/menu.model';

export class Menu {
  public static pages: MenuItem[] = [
    {
      group: 'Menu',
      separator: false,
      items: [
        {
          icon: 'assets/icons/heroicons/outline/heart.svg',
          label: 'Mes dons',
          route: '/dashboard/dons',
        },
        {
          icon: 'assets/icons/heroicons/outline/card.svg',
          label: 'Mes abonnements',
          route: '/dashboard/abonnements',
        },
        {
          icon: 'assets/icons/heroicons/outline/information-circle.svg',
          label: 'Tutoriel',
          route: '/dashboard/tutoriel',
        },
      ],
    },
  ];
}
