import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
  const url = request.nextUrl.clone();
  const hostname = request.headers.get('host') || '';

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
