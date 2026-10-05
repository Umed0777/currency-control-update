import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import {
  getBranchDashboard,
  getClientByInn,
  createCompany,
  updateCompany,
  deleteCompany,
  getBranchDashboardNotifications,
} from "../api/branchDashboard.service";

const toArray = (data) => {
  if (Array.isArray(data)) return data;
  if (Array.isArray(data?.data)) return data.data;
  if (Array.isArray(data?.items)) return data.items;
  if (Array.isArray(data?.companies)) return data.companies;
  if (Array.isArray(data?.results)) return data.results;
  if (Array.isArray(data?.rows)) return data.rows;
  if (Array.isArray(data?.list)) return data.list;
  if (Array.isArray(data?.data?.items)) return data.data.items;
  if (Array.isArray(data?.data?.companies)) return data.data.companies;
  return [];
};

const getId = (c) => c?.id ?? c?.company_id;

const DEFAULT_FILTERS = { query: "", search_type: "name" };

export const useBranchDashboardStore = create(
  persist(
    (set, get) => ({
      branchId: null,
      companies: [],
      notifications: [],
      notificationsTotal: 0,
      detailsCache: {},
      loading: false,
      loadingNotifications: false,
      error: null,
      filters: { ...DEFAULT_FILTERS },

      setFilter: (key, value) =>
        set((s) => ({ filters: { ...s.filters, [key]: value } })),

      resetFilters: () => set({ filters: { ...DEFAULT_FILTERS } }),

      fetchDashboard: async (branchId, overrideFilters) => {
        set({
          loading: true,
          error: null,
          branchId,
        });

        try {
          const filters = overrideFilters ?? get().filters;

          const data = await getBranchDashboard(branchId, filters);

          console.log("GET dashboard response:", data);

          const list = toArray(data);

          console.log("Компании после toArray:", list);

          const cache = get().detailsCache;

          const enriched = await Promise.all(
            list.map(async (item) => {
              const id = getId(item);

              let merged = {
                ...(id ? cache[id] : {}),
                ...item,
              };

              // Если есть ИНН — пробуем получить дополнительную
              // информацию из CBS
              if (item.inn) {
                try {
                  const clientData = await getClientByInn(item.inn);

                  console.log(`Клиент CBS по ИНН ${item.inn}:`, clientData);

                  if (clientData && typeof clientData === "object") {
                    merged = {
                      ...merged,
                      ...clientData,

                      name:
                        clientData.full_name ||
                        clientData.fullName ||
                        clientData.name ||
                        merged.name ||
                        "",

                      phones:
                        clientData.phones ||
                        clientData.phone_numbers ||
                        clientData.phoneNumbers ||
                        merged.phones ||
                        [],

                      llc:
                        merged.llc ||
                        clientData.llc ||
                        clientData.company_name ||
                        clientData.companyName ||
                        "",
                    };
                  }
                } catch (error) {
                  console.warn(
                    `Ошибка получения клиента по ИНН ${item.inn}:`,
                    error
                  );
                }
              }

              if (id) {
                set((s) => ({
                  detailsCache: {
                    ...s.detailsCache,
                    [id]: merged,
                  },
                }));
              }

              return merged;
            })
          );

          console.log("Итоговые компании:", enriched);

          set({ companies: enriched });
        } catch (error) {
          console.error(
            "Ошибка fetchDashboard:",
            error?.response?.data || error
          );

          set({
            error:
              error?.response?.data?.error ||
              error?.response?.data?.message ||
              error?.message ||
              "Ошибка при загрузке дашборда",
          });
        } finally {
          set({ loading: false });
        }
      },

      // ==== Уведомления дашборда (истекающие контракты) ====
      fetchNotifications: async (branchId) => {
        set({ loadingNotifications: true, error: null });
        try {
          const data = await getBranchDashboardNotifications(branchId);

          console.log("GET notifications response:", data);

          const notifications = Array.isArray(data?.notifications)
            ? data.notifications
            : Array.isArray(data)
              ? data
              : [];

          const total =
            typeof data?.total === "number"
              ? data.total
              : notifications.length;

          set({ notifications, notificationsTotal: total });
        } catch (error) {
          console.error(
            "Ошибка fetchNotifications:",
            error?.response?.data || error
          );
          set({
            error:
              error?.response?.data?.error ||
              error?.response?.data?.message ||
              error?.message ||
              "Ошибка при загрузке уведомлений",
          });
        } finally {
          set({ loadingNotifications: false });
        }
      },

      // ==== ОДИН метод создания: бэк сам определит тип клиента ====
      addCompany: async (branchId, payload) => {
        set({ loading: true, error: null });
        try {
          const created = await createCompany(branchId, payload);
          const item = Array.isArray(created)
            ? created[0]
            : created?.data || created;
          const id = getId(item);

          if (id) {
            set((s) => ({
              detailsCache: {
                ...s.detailsCache,
                [id]: { ...s.detailsCache[id], ...item },
              },
            }));
          }

          set((s) => ({ companies: [item, ...s.companies] }));
          return item;
        } catch (error) {
          set({
            error:
              error.response?.data?.error ||
              error.response?.data?.message ||
              error.message ||
              "Ошибка при создании компании",
          });
          throw error;
        } finally {
          set({ loading: false });
        }
      },

      editCompany: async (branchId, companyId, payload) => {
        set({ loading: true, error: null });
        try {
          const updated = await updateCompany(branchId, companyId, payload);
          const numId = Number(companyId);
          const serverData =
            updated && typeof updated === "object" && !Array.isArray(updated)
              ? updated
              : {};

          const oldRecord =
            get().detailsCache[numId] ||
            get().companies.find((c) => Number(getId(c)) === numId) ||
            {};

          const fullRecord = {
            ...oldRecord,
            ...payload,
            ...serverData,
            id: numId,
          };

          set((s) => ({
            detailsCache: { ...s.detailsCache, [numId]: fullRecord },
          }));
          set({
            companies: get().companies.map((c) =>
              Number(getId(c)) === numId ? { ...c, ...fullRecord } : c
            ),
          });

          return updated;
        } catch (error) {
          set({
            error:
              error.response?.data?.error ||
              error.message ||
              "Ошибка при обновлении",
          });
          throw error;
        } finally {
          set({ loading: false });
        }
      },

      removeCompany: async (branchId, companyId) => {
        set({ loading: true, error: null });
        try {
          await deleteCompany(branchId, companyId);
          const numId = Number(companyId);
          set({
            companies: get().companies.filter(
              (c) => Number(getId(c)) !== numId
            ),
          });
          set((s) => {
            const next = { ...s.detailsCache };
            delete next[numId];
            return { detailsCache: next };
          });
        } catch (error) {
          set({
            error:
              error.response?.data?.error ||
              error.message ||
              "Ошибка при удалении",
          });
          throw error;
        } finally {
          set({ loading: false });
        }
      },

      // clear НЕ чистит detailsCache — иначе данные пропадут при перезагрузке
      clear: () =>
        set({
          branchId: null,
          companies: [],
          notifications: [],
          notificationsTotal: 0,
          loading: false,
          loadingNotifications: false,
          error: null,
          filters: { ...DEFAULT_FILTERS },
        }),

      clearError: () => set({ error: null }),
    }),
    {
      name: "branch-dashboard-cache",
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({ detailsCache: state.detailsCache }),
    }
  )
);