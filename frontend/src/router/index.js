import { createRouter, createWebHashHistory, createWebHistory } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import ShopLayout from '@/layouts/ShopLayout.vue'

const list = (props) => ({
  component: () => import('@/views/ProductList.vue'),
  props: (route) => ({ ...props, ...route.params }),
})
const page = (key) => ({ component: () => import('@/views/StaticPage.vue'), props: { pageKey: key } })

const routes = [
  {
    path: '/',
    component: ShopLayout,
    children: [
      { path: '', name: 'home', component: () => import('@/views/HomeView.vue') },
      { path: 'danh-muc/:slug', name: 'category', ...list({ mode: 'category' }) },
      { path: 'bo-suu-tap/:slug', name: 'collection', ...list({ mode: 'collection' }) },
      { path: 'hang-moi', name: 'new', ...list({ mode: 'new' }) },
      { path: 'ban-chay', name: 'best', ...list({ mode: 'best' }) },
      { path: 'san-pham', name: 'all', ...list({ mode: 'all' }) },
      { path: 'tim-kiem', name: 'search', ...list({ mode: 'search' }) },
      {
        path: 'san-pham/:slug',
        name: 'product',
        component: () => import('@/views/ProductDetail.vue'),
        props: true,
      },
      { path: 'gio-hang', name: 'cart', component: () => import('@/views/CartView.vue') },
      { path: 'thanh-toan', name: 'checkout', component: () => import('@/views/CheckoutView.vue') },
      {
        path: 'dat-hang-thanh-cong/:code',
        name: 'order-success',
        component: () => import('@/views/OrderSuccess.vue'),
        props: true,
      },
      { path: 'tra-cuu-don', name: 'track', component: () => import('@/views/TrackOrder.vue') },
      { path: 'yeu-thich', name: 'wishlist', component: () => import('@/views/WishlistView.vue') },
      { path: 'lien-he', name: 'contact', component: () => import('@/views/ContactView.vue') },
      { path: 'gioi-thieu', name: 'about', ...page('about') },
      { path: 'chinh-sach-giao-hang', name: 'policy-shipping', ...page('shipping') },
      { path: 'chinh-sach-doi-tra', name: 'policy-return', ...page('return') },
      { path: 'chinh-sach-bao-mat', name: 'policy-privacy', ...page('privacy') },
      { path: ':pathMatch(.*)*', name: 'not-found', component: () => import('@/views/NotFound.vue') },
    ],
  },
  { path: '/admin/dang-nhap', name: 'admin-login', component: () => import('@/views/admin/LoginView.vue') },
  {
    path: '/admin',
    component: () => import('@/layouts/AdminLayout.vue'),
    meta: { requiresAuth: true },
    children: [
      { path: '', name: 'admin', component: () => import('@/views/admin/DashboardView.vue') },
      { path: 'san-pham', name: 'admin-products', component: () => import('@/views/admin/ProductsView.vue') },
      {
        path: 'san-pham/moi',
        name: 'admin-product-new',
        component: () => import('@/views/admin/ProductForm.vue'),
      },
      {
        path: 'san-pham/:id',
        name: 'admin-product-edit',
        component: () => import('@/views/admin/ProductForm.vue'),
        props: true,
      },
      {
        path: 'danh-muc',
        name: 'admin-categories',
        component: () => import('@/views/admin/CategoriesView.vue'),
      },
      { path: 'banner', name: 'admin-banners', component: () => import('@/views/admin/BannersView.vue') },
      {
        path: 'ma-giam-gia',
        name: 'admin-coupons',
        component: () => import('@/views/admin/CouponsView.vue'),
      },
      { path: 'don-hang', name: 'admin-orders', component: () => import('@/views/admin/OrdersView.vue') },
      {
        path: 'don-hang/:id',
        name: 'admin-order',
        component: () => import('@/views/admin/OrderDetail.vue'),
        props: true,
      },
      { path: 'lien-he', name: 'admin-contacts', component: () => import('@/views/admin/ContactsView.vue') },
      { path: 'cai-dat', name: 'admin-settings', component: () => import('@/views/admin/SettingsView.vue') },
    ],
  },
]

const base = import.meta.env.BASE_URL
const router = createRouter({
  history: import.meta.env.VITE_ROUTER_MODE === 'hash' ? createWebHashHistory(base) : createWebHistory(base),
  routes,
  scrollBehavior(to, from, saved) {
    if (saved) return saved
    if (to.hash) return { el: to.hash, top: 120 }
    // Đổi bộ lọc trên cùng trang danh sách: giữ vị trí cuộn
    if (to.path === from.path && to.name !== 'product') return false
    return { top: 0 }
  },
})

router.beforeEach((to) => {
  if (to.matched.some((r) => r.meta.requiresAuth)) {
    const auth = useAuthStore()
    if (!auth.validToken()) return { name: 'admin-login', query: { redirect: to.fullPath } }
  }
})

export default router
