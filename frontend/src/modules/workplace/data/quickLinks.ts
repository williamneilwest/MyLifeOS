import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export type QuickLink = {
  id: string;
  name: string;
  url: string;
  category: string;
  icon?: string;
  description?: string;
};

type QuickLinkInput = Omit<QuickLink, 'id'>;

type QuickLinksState = {
  links: QuickLink[];
  favorites: string[];
  recent: string[];
  addLink: (payload: QuickLinkInput) => void;
  updateLink: (id: string, payload: Partial<QuickLinkInput>) => void;
  deleteLink: (id: string) => void;
  toggleFavorite: (id: string) => void;
  markUsed: (id: string) => void;
  upsertExternalLink: (payload: { name?: string; url: string; category?: string; icon?: string; description?: string }) => void;
};

export const quickLinkCategories = [
  'Tickets',
  'ServiceNow Tools',
  'Requests',
  'Power Platform',
  'Reports',
];

const seedLinks: QuickLink[] = [
  {
    id: 'snow-main',
    name: 'ServiceNow',
    url: 'https://servicenow.adventhealth.com',
    category: 'Tickets',
    icon: 'ticket',
    description: 'Primary incident and request portal',
  },
  {
    id: 'snow-my-work',
    name: 'My Work Queue',
    url: 'https://servicenow.adventhealth.com/nav_to.do?uri=%2Ftask_list.do%3Fsysparm_query%3Dassigned_toDYNAMIC90d1921e5f510100a9ad2572f2b477fe',
    category: 'Tickets',
    icon: 'inbox',
    description: 'Assigned tasks and incidents',
  },
  {
    id: 'snow-kb',
    name: 'Knowledge Base',
    url: 'https://servicenow.adventhealth.com/kb',
    category: 'ServiceNow Tools',
    icon: 'book',
    description: 'Internal support documentation',
  },
  {
    id: 'snow-cmdb',
    name: 'CMDB',
    url: 'https://servicenow.adventhealth.com/nav_to.do?uri=cmdb_ci_list.do',
    category: 'ServiceNow Tools',
    icon: 'database',
    description: 'Configuration item inventory',
  },
  {
    id: 'request-catalog',
    name: 'Service Catalog',
    url: 'https://servicenow.adventhealth.com/sp',
    category: 'Requests',
    icon: 'shopping-bag',
    description: 'Submit new service requests',
  },
  {
    id: 'request-intune',
    name: 'Intune Device Request',
    url: 'https://make.powerapps.com',
    category: 'Requests',
    icon: 'laptop',
    description: 'Power App for device workflows',
  },
  {
    id: 'powerapps-maker',
    name: 'Power Apps Maker',
    url: 'https://make.powerapps.com',
    category: 'Power Platform',
    icon: 'app-window',
    description: 'Build and manage apps',
  },
  {
    id: 'powerautomate',
    name: 'Power Automate',
    url: 'https://make.powerautomate.com',
    category: 'Power Platform',
    icon: 'workflow',
    description: 'Manage cloud flows and approvals',
  },
  {
    id: 'powerbi',
    name: 'Power BI',
    url: 'https://app.powerbi.com',
    category: 'Reports',
    icon: 'bar-chart-3',
    description: 'Operational dashboards and reports',
  },
  {
    id: 'excel-online',
    name: 'Excel Online',
    url: 'https://office.com',
    category: 'Reports',
    icon: 'sheet',
    description: 'Shared report workbooks',
  },
];

function normalizeUrl(raw: string): string {
  const trimmed = raw.trim();
  if (!trimmed) return '';
  if (trimmed.startsWith('http://') || trimmed.startsWith('https://')) return trimmed;
  return `https://${trimmed}`;
}

export function isValidQuickLinkUrl(raw: string): boolean {
  try {
    const parsed = new URL(normalizeUrl(raw));
    return parsed.protocol === 'http:' || parsed.protocol === 'https:';
  } catch {
    return false;
  }
}

function domainName(url: string): string {
  try {
    return new URL(normalizeUrl(url)).hostname.replace(/^www\./, '');
  } catch {
    return 'link';
  }
}

function cleanLinkInput(payload: QuickLinkInput): QuickLinkInput {
  return {
    name: payload.name.trim() || domainName(payload.url),
    url: normalizeUrl(payload.url),
    category: payload.category.trim() || 'Uncategorized',
    icon: payload.icon?.trim() || undefined,
    description: payload.description?.trim() || undefined,
  };
}

export const useQuickLinksStore = create<QuickLinksState>()(
  persist(
    (set, get) => ({
      links: seedLinks,
      favorites: ['snow-main', 'snow-my-work'],
      recent: [],
      addLink: (payload) => {
        const clean = cleanLinkInput(payload);
        if (!isValidQuickLinkUrl(clean.url)) return;
        set((state) => ({
          links: [
            {
              id: `ql-${Date.now()}-${Math.random().toString(16).slice(2, 8)}`,
              ...clean,
            },
            ...state.links,
          ],
        }));
      },
      updateLink: (id, payload) => {
        set((state) => ({
          links: state.links.map((link) => {
            if (link.id !== id) return link;
            const merged = cleanLinkInput({
              name: payload.name ?? link.name,
              url: payload.url ?? link.url,
              category: payload.category ?? link.category,
              icon: payload.icon ?? link.icon,
              description: payload.description ?? link.description,
            });
            return { ...link, ...merged };
          }),
        }));
      },
      deleteLink: (id) => {
        set((state) => ({
          links: state.links.filter((link) => link.id !== id),
          favorites: state.favorites.filter((favId) => favId !== id),
          recent: state.recent.filter((recentId) => recentId !== id),
        }));
      },
      toggleFavorite: (id) => {
        set((state) => ({
          favorites: state.favorites.includes(id)
            ? state.favorites.filter((favId) => favId !== id)
            : [id, ...state.favorites],
        }));
      },
      markUsed: (id) => {
        set((state) => ({
          recent: [id, ...state.recent.filter((recentId) => recentId !== id)].slice(0, 8),
        }));
      },
      upsertExternalLink: (payload) => {
        const cleanUrl = normalizeUrl(payload.url);
        if (!isValidQuickLinkUrl(cleanUrl)) return;
        const existing = get().links.find((link) => link.url === cleanUrl);
        if (existing) {
          set((state) => ({ recent: [existing.id, ...state.recent.filter((id) => id !== existing.id)].slice(0, 8) }));
          return;
        }
        get().addLink({
          name: payload.name?.trim() || domainName(cleanUrl),
          url: cleanUrl,
          category: payload.category?.trim() || 'Requests',
          icon: payload.icon?.trim() || 'link',
          description: payload.description?.trim() || 'Saved from workflow activity',
        });
      },
    }),
    {
      name: 'lifeos.quick-links.v1',
      partialize: (state) => ({ links: state.links, favorites: state.favorites, recent: state.recent }),
    },
  ),
);
