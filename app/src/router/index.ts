/**
 * @notice Router configuration
 * @dev When the `component` property has an `import` statement, this gives route level code-splitting, which
 * generates a separate chunk (e.g. `about.[hash].js`) for this route which is lazy-loaded when the route is visited
 */

import { createRouter, createWebHashHistory, RouteRecordRaw } from 'vue-router';
import Home from '../views/Home.vue';

// For info on using Vue Router with the Composition API, see https://next.router.vuejs.org/guide/advanced/composition-api.html

const routes: Array<RouteRecordRaw> = [
  { path: '/', name: 'Home', component: Home },
  { path: '/cart', name: 'Cart', component: () => import('../views/Cart.vue') },
  { path: '/cart/contribution-success', name: 'post-checkout', component: () => import('../views/PostCheckout.vue') },
  { path: '/dgrants', name: 'dgrants', component: () => import('../views/GrantRegistryList.vue') },
  { path: '/review', name: 'review', component: () => import('../views/GrantReview.vue') },
  { path: '/dgrants/new', name: 'dgrants-new', component: () => import('../views/GrantRegistryNewGrant.vue') },
  { path: '/dgrants/my-grants', name: 'dgrants-my-grants', component: () => import('../views/MyGrants.vue') },
  { path: '/dgrants/submitted', name: 'dgrants-submitted', component: () => import('../views/GrantSubmitted.vue') },
  { path: '/dgrants/:id', name: 'dgrants-id', component: () => import('../views/GrantRegistryGrantDetail.vue') },
  { path: '/dgrants/rounds/', name: 'dgrants-rounds-list', component: () => import('../views/GrantRoundsList.vue') },
  {
    path: '/dgrants/rounds/:address',
    name: 'dgrants-round',
    component: () => import('../views/GrantRound.vue'),
  },
  {
    path: '/dgrants/rounds/:address/grants',
    name: 'dgrants-round-details',
    component: () => import('../views/GrantRoundGrants.vue'),
  },
  {
    path: '/contribution/donations',
    name: 'contribution',
    component: () => import('../views/Contribution.vue'),
  },

  // Fallback route for handling 404s
  { path: '/:pathMatch(.*)*', name: '404', component: () => import('../views/Error404.vue') },
  {
    path: '/image-uploader',
    name: 'image-uploader-show-case',
    component: () => import('../views/ImageUploaderShowCase.vue'),
  },
];

const router = createRouter({
  // If app is not hosted at the domain root, make sure to pass the `base` input here: https://next.router.vuejs.org/api/#parameters
  history: createWebHashHistory(),
  routes,
  scrollBehavior(_to, _from, savedPosition) {
    if (savedPosition) {
      return savedPosition;
    } else {
      return { top: 0 };
    }
  },
});

export default router;
