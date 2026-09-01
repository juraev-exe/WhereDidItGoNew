import { createRouter, createWebHistory } from 'vue-router'

const router = createRouter({
  history: createWebHistory(),
  routes: [
    {
      path: '/onboarding',
      name: 'onboarding',
      component: () => import('@/features/onboarding/OnboardingView.vue'),
      meta: { hideNav: true },
    },
    {
      path: '/',
      name: 'home',
      component: () => import('@/features/home/HomeView.vue'),
    },
    {
      path: '/activity',
      name: 'activity',
      component: () => import('@/features/activity/ActivityView.vue'),
    },
    {
      path: '/budgets',
      name: 'budgets',
      component: () => import('@/features/budgets/BudgetsView.vue'),
    },
    {
      path: '/insights',
      name: 'insights',
      component: () => import('@/features/insights/InsightsView.vue'),
    },
    {
      path: '/debts',
      name: 'debts',
      component: () => import('@/features/debts/DebtsView.vue'),
    },
    {
      path: '/categories',
      name: 'categories',
      component: () => import('@/features/categories/CategoriesView.vue'),
    },
    {
      path: '/settings',
      name: 'settings',
      component: () => import('@/features/settings/SettingsView.vue'),
      meta: { hideNav: true },
    },
    {
      path: '/accounts',
      name: 'accounts',
      component: () => import('@/features/accounts/AccountsView.vue'),
      meta: { hideNav: true },
    },
    // Design preview for LoginCard. Dev-only: Vite statically replaces
    // import.meta.env.DEV with false in production, so both this route entry
    // and the LoginCard chunk are dropped from release builds. `preview: true`
    // exempts it from the onboarding redirect in App.vue.
    ...(import.meta.env.DEV
      ? [
          {
            path: '/__login-preview',
            name: 'login-preview',
            component: () => import('@/components/LoginCard.vue'),
            meta: { hideNav: true, preview: true },
          },
        ]
      : []),
  ],
  scrollBehavior() {
    return { top: 0 }
  },
})

export default router
