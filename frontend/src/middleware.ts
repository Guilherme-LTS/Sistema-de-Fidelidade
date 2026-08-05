import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
  const url = request.nextUrl.clone();
  const hostname = request.headers.get('host') || '';

  // Evitar redirecionar requisições estáticas e APIs internas
  const isStaticOrApi =
    url.pathname.startsWith('/_next') ||
    url.pathname.startsWith('/api') ||
    url.pathname.includes('.') ||
    url.pathname === '/favicon.ico' ||
    url.pathname === '/robots.txt' ||
    url.pathname === '/sitemap.xml';

  if (isStaticOrApi) {
    return NextResponse.next();
  }

  // Em ambiente local ou preview da Vercel, não efetuar redirecionamentos de subdomínio de produção
  const isLocalOrPreview = hostname.includes('localhost') || hostname.includes('127.0.0.1') || hostname.includes('vercel.app');
  if (isLocalOrPreview) {
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

  // 2. Redirecionar acessos à Landing Page institucional no subdomínio app para o domínio raiz oficial
  if (isAppDomain && url.pathname === '/') {
    return NextResponse.redirect(`https://www.usepontus.com.br${url.search}`, 307);
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
