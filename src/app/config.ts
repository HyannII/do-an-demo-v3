export const dynamicRoutes = [
  '/utility/tcp-testing',
  '/utility/traffic-light-calculation',
  '/statistics',
  '/map',
  '/objectManagement',
  '/users/list',
  '/trafficLight',
  '/liveCamera',
  '/settings',
  '/users/pending',
  '/users/roles'
];

export const isDynamicRoute = (path: string) => {
  return dynamicRoutes.some(route => path.startsWith(route));
}; 