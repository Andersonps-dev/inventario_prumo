// Service worker mínimo do Prumo: cache "network-first" do shell da
// aplicação para permitir abrir a tela de contagem sem rede — a fila de
// contagens pendentes (IndexedDB) é o que garante que nada se perde
// enquanto offline; isto aqui só mantém a interface carregável.
const CACHE = 'prumo-shell-v1';

self.addEventListener('install', () => {
  self.skipWaiting();
});

self.addEventListener('activate', (evento) => {
  evento.waitUntil(self.clients.claim());
});

self.addEventListener('fetch', (evento) => {
  if (evento.request.method !== 'GET') return;
  const url = new URL(evento.request.url);
  if (url.pathname.startsWith('/api')) return; // nunca cachear chamadas de API

  evento.respondWith(
    caches.open(CACHE).then(async (cache) => {
      try {
        const resposta = await fetch(evento.request);
        cache.put(evento.request, resposta.clone());
        return resposta;
      } catch {
        const emCache = await cache.match(evento.request);
        return emCache ?? Response.error();
      }
    }),
  );
});
