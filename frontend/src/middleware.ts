import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
  const url = request.nextUrl.clone();
  const hostname = request.headers.get('host') || '';

  // Evitar redirecionar requisições internas do Next.js (RSC data, prefetch, static assets, APIs, etc.)
  const isInternalOrApi =
    url.pathname.startsWith('/_next') ||
    url.pathname.startsWith('/api') ||
    url.pathname.includes('.') ||
    url.searchParams.has('_rsc') ||
    request.headers.has('RSC');

  if (isInternalOrApi) {
    return NextResponse.next();
  }

  // Identifica se a requisição está batendo no subdomínio "app"
  const isAppDomain = hostname.startsWith('app.usepontus.com.br') || hostname.startsWith('app.localhost') || hostname.startsWith('app.');

  // Identifica se a rota atual faz parte do escopo do aplicativo/painel/auth
  const isAuthOrAdminRoute =
    url.pathname.startsWith('/admin') ||
    url.pathname.startsWith('/login') ||
    url.pathname.startsWith('/cadastro') ||
    url.pathname.startsWith('/alterar-senha') ||
    url.pathname.startsWith('/confirmacao-pendente') ||
    url.pathname.startsWith('/convites');

  // 1. Redirecionar acessos administrativos no domínio raiz para o subdomínio app
  if (!isAppDomain && isAuthOrAdminRoute) {
    return NextResponse.redirect(`https://app.usepontus.com.br${url.pathname}${url.search}`, 307);
  }

  // 2. Redirecionar acessos à Landing Page institucional no subdomínio app para o domínio raiz
  if (isAppDomain && url.pathname === '/') {
    return NextResponse.redirect(`https://usepontus.com.br${url.search}`, 307);
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    '/',
    '/admin/:path*',
    '/login',
    '/cadastro',
    '/alterar-senha',
    '/confirmacao-pendente',
    '/convites/:path*',
  ],
};
