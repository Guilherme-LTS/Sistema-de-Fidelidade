import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
  const url = request.nextUrl.clone();
  const hostname = request.headers.get('host') || '';

  // 1. Ignorar requisições estáticas, assets internos e APIs
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

  // 2. Ignorar redirecionamentos em ambiente local (localhost) ou preview da Vercel
  const isLocalOrPreview = hostname.includes('localhost') || hostname.includes('127.0.0.1') || hostname.includes('vercel.app');
  if (isLocalOrPreview) {
    return NextResponse.next();
  }

  // Identifica se o subdomínio atual é o "app.usepontus.com.br"
  const isAppDomain = hostname.startsWith('app.usepontus.com.br') || hostname.startsWith('app.');

  // Escopo de Rotas B2B (Lojista / Estabelecimento / SaaS Administrative)
  const isMerchantB2BRoute =
    url.pathname.startsWith('/admin') ||
    url.pathname.startsWith('/login') ||
    url.pathname.startsWith('/cadastro') ||
    url.pathname.startsWith('/alterar-senha') ||
    url.pathname.startsWith('/confirmacao-pendente') ||
    url.pathname.startsWith('/convites');

  // Escopo de Rotas B2C (Público / Consumidor / Cliente Final)
  const isConsumerB2CRoute =
    url.pathname === '/' ||
    url.pathname.startsWith('/painel') ||
    url.pathname.startsWith('/acesso') ||
    url.pathname.startsWith('/perfil') ||
    url.pathname.startsWith('/fidelidade');

  // REGRA 1: Se estiver em www.usepontus.com.br e tentar acessar uma rota B2B de lojista -> Redireciona para app.usepontus.com.br
  if (!isAppDomain && isMerchantB2BRoute) {
    return NextResponse.redirect(`https://app.usepontus.com.br${url.pathname}${url.search}`, 307);
  }

  // REGRA 2: Se estiver em app.usepontus.com.br e tentar acessar uma rota B2C pública ou de consumidor -> Redireciona para www.usepontus.com.br
  if (isAppDomain && isConsumerB2CRoute) {
    return NextResponse.redirect(`https://www.usepontus.com.br${url.pathname}${url.search}`, 307);
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
    '/painel/:path*',
    '/acesso',
    '/perfil',
    '/fidelidade/:path*',
  ],
};
